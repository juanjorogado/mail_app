/**
 * Gmail Service
 * Servicio para interactuar con la API de Gmail
 * Implementa patrones de diseño y mejores prácticas
 */

const { google } = require("googleapis");
const OAuthHelper = require("../common/oauthHelper");
const { loggers } = require("../common/logger");
const { GMAIL, VALIDATION, ERROR_TYPES } = require("../config/constants");

class GmailService {
  constructor() {
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 segundo
  }

  /**
   * Obtiene lista de emails con paginación
   * @param {string} accountId - ID de la cuenta
   * @param {string} folder - Carpeta (INBOX, SENT, etc.)
   * @param {number} maxResults - Máximo de resultados
   * @param {string} pageToken - Token de paginación
   * @returns {Promise<Object>} Resultado con emails
   */
  async fetchEmails(accountId, folder = GMAIL.DEFAULT_FOLDER, maxResults = GMAIL.MAX_RESULTS, pageToken = null) {
    const startTime = Date.now();
    
    try {
      loggers.performance.start('gmail.fetchEmails', { accountId, folder, maxResults });
      
      if (!accountId) {
        throw new Error("Account ID is required");
      }

      const oauth2Client = await OAuthHelper.getOAuth2Client(accountId);
      const gmail = google.gmail({ version: GMAIL.API_VERSION, auth: oauth2Client });
      
      // Construir query según la carpeta
      const query = GMAIL.FOLDERS[folder.toUpperCase()] || GMAIL.FOLDERS.INBOX;
      
      const params = {
        userId: "me", 
        maxResults,
        q: query
      };
      
      if (pageToken) {
        params.pageToken = pageToken;
      }
      
      const res = await this.retryOperation(async () => {
        return await gmail.users.messages.list(params);
      });
      
      const msgs = res.data.messages || [];
      const detailed = await this.fetchEmailDetailsBatch(accountId, msgs);
      
      const emails = detailed.map((d) => this.parseEmailMessage(d));
      
      const duration = Date.now() - startTime;
      loggers.performance.end('gmail.fetchEmails', duration, { 
        accountId, 
        folder, 
        count: emails.length,
        hasMore: !!res.data.nextPageToken 
      });
      
      return { 
        success: true, 
        data: emails, 
        folder,
        nextPageToken: res.data.nextPageToken,
        total: res.data.resultSizeEstimate
      };
    } catch (e) {
      const duration = Date.now() - startTime;
      loggers.performance.end('gmail.fetchEmails', duration, { 
        accountId, 
        folder, 
        error: e.message 
      });
      
      loggers.api.error('GET', `/gmail/messages?folder=${folder}`, e, { accountId });
      return this.handleError(e);
    }
  }

  /**
   * Obtiene detalles completos de un email
   * @param {string} accountId - ID de la cuenta
   * @param {string} emailId - ID del email
   * @returns {Promise<Object>} Detalles del email
   */
  async fetchEmailDetails(accountId, emailId) {
    const startTime = Date.now();
    
    try {
      loggers.performance.start('gmail.fetchEmailDetails', { accountId, emailId });
      
      if (!accountId || !emailId) {
        throw new Error("Account ID and Email ID are required");
      }

      const oauth2Client = await OAuthHelper.getOAuth2Client(accountId);
      const gmail = google.gmail({ version: GMAIL.API_VERSION, auth: oauth2Client });
      
      const res = await this.retryOperation(async () => {
        return await gmail.users.messages.get({ 
          userId: "me", 
          id: emailId, 
          format: "full" 
        });
      });
      
      const emailData = this.parseEmailDetails(res.data);
      
      const duration = Date.now() - startTime;
      loggers.performance.end('gmail.fetchEmailDetails', duration, { 
        accountId, 
        emailId,
        hasAttachments: emailData.attachments.length > 0
      });
      
      return { success: true, data: emailData };
    } catch (e) {
      const duration = Date.now() - startTime;
      loggers.performance.end('gmail.fetchEmailDetails', duration, { 
        accountId, 
        emailId, 
        error: e.message 
      });
      
      loggers.api.error('GET', `/gmail/messages/${emailId}`, e, { accountId, emailId });
      return this.handleError(e, null);
    }
  }

  /**
   * Envía un email con validación y encriptación
   * @param {string} accountId - ID de la cuenta
   * @param {Object} emailData - Datos del email { to, subject, body }
   * @returns {Promise<Object>} Resultado del envío
   */
  async sendEmail(accountId, emailData) {
    const startTime = Date.now();
    
    try {
      loggers.performance.start('gmail.sendEmail', { accountId });
      
      // Validar datos
      this.validateEmailData(emailData);

      const Accounts = require("../common/accounts");
      const accountsList = Accounts.getAccounts();
      const account = accountsList.find((a) => a.email === accountId || a.id === accountId);
      
      if (!account || !account.tokens) {
        throw new Error("Account not found or token missing");
      }
      
      const oauth2Client = await OAuthHelper.getOAuth2Client(accountId);
      const gmail = google.gmail({ version: GMAIL.API_VERSION, auth: oauth2Client });
      
      const rawMessage = this.buildRawMessage(account.email, emailData);
      const encoded = this.encodeMessage(rawMessage);
      
      const res = await this.retryOperation(async () => {
        return await gmail.users.messages.send({ 
          userId: "me", 
          requestBody: { raw: encoded } 
        });
      });
      
      const duration = Date.now() - startTime;
      loggers.performance.end('gmail.sendEmail', duration, { 
        accountId, 
        to: emailData.to.substring(0, 50),
        subject: emailData.subject.substring(0, 50),
        success: true 
      });
      
      loggers.api.response('POST', '/gmail/send', 200, { 
        accountId, 
        to: emailData.to.substring(0, 50) 
      });
      
      return { 
        success: true, 
        id: res.data.id, 
        threadId: res.data.threadId 
      };
    } catch (e) {
      const duration = Date.now() - startTime;
      loggers.performance.end('gmail.sendEmail', duration, { 
        accountId, 
        error: e.message 
      });
      
      loggers.api.error('POST', '/gmail/send', e, { accountId });
      throw e;
    }
  }

  /**
   * Busca emails con query avanzada
   * @param {string} accountId - ID de la cuenta
   * @param {string} query - Query de búsqueda
   * @param {number} maxResults - Máximo de resultados
   * @returns {Promise<Object>} Resultado de búsqueda
   */
  async searchEmails(accountId, query, maxResults = GMAIL.MAX_RESULTS) {
    const startTime = Date.now();
    
    try {
      loggers.performance.start('gmail.searchEmails', { accountId, queryLength: query.length });
      
      if (!accountId || !query) {
        throw new Error("Account ID and query are required");
      }

      const oauth2Client = await OAuthHelper.getOAuth2Client(accountId);
      const gmail = google.gmail({ version: GMAIL.API_VERSION, auth: oauth2Client });
      
      const res = await this.retryOperation(async () => {
        return await gmail.users.messages.list({
          userId: "me",
          q: query,
          maxResults
        });
      });
      
      const msgs = res.data.messages || [];
      const detailed = await this.fetchEmailDetailsBatch(accountId, msgs);
      const emails = detailed.map((d) => this.parseEmailMessage(d));
      
      const duration = Date.now() - startTime;
      loggers.performance.end('gmail.searchEmails', duration, { 
        accountId, 
        queryLength: query.length,
        count: emails.length 
      });
      
      return { 
        success: true, 
        data: emails,
        query,
        total: res.data.resultSizeEstimate
      };
    } catch (e) {
      const duration = Date.now() - startTime;
      loggers.performance.end('gmail.searchEmails', duration, { 
        accountId, 
        queryLength: query?.length || 0, 
        error: e.message 
      });
      
      loggers.api.error('GET', '/gmail/search', e, { accountId, query });
      return this.handleError(e);
    }
  }

  /**
   * Marca un email como leído o no leído
   * @param {string} accountId - ID de la cuenta
   * @param {string} emailId - ID del email
   * @param {boolean} read - Estado de lectura
   * @returns {Promise<Object>} Resultado de la operación
   */
  async markAsRead(accountId, emailId, read = true) {
    const startTime = Date.now();
    
    try {
      loggers.performance.start('gmail.markAsRead', { accountId, emailId, read });
      
      const oauth2Client = await OAuthHelper.getOAuth2Client(accountId);
      const gmail = google.gmail({ version: GMAIL.API_VERSION, auth: oauth2Client });
      
      const removeLabel = read ? ['UNREAD'] : [];
      const addLabel = read ? [] : ['UNREAD'];
      
      const res = await this.retryOperation(async () => {
        return await gmail.users.messages.modify({
          userId: "me",
          id: emailId,
          requestBody: {
            removeLabelIds: removeLabel,
            addLabelIds: addLabel
          }
        });
      });
      
      const duration = Date.now() - startTime;
      loggers.performance.end('gmail.markAsRead', duration, { 
        accountId, 
        emailId, 
        read,
        success: true 
      });
      
      return { success: true, data: res.data };
    } catch (e) {
      const duration = Date.now() - startTime;
      loggers.performance.end('gmail.markAsRead', duration, { 
        accountId, 
        emailId, 
        read, 
        error: e.message 
      });
      
      loggers.api.error('POST', `/gmail/messages/${emailId}/modify`, e, { accountId, emailId });
      return this.handleError(e);
    }
  }

  /**
   * Elimina un email
   * @param {string} accountId - ID de la cuenta
   * @param {string} emailId - ID del email
   * @returns {Promise<Object>} Resultado de la operación
   */
  async deleteEmail(accountId, emailId) {
    const startTime = Date.now();
    
    try {
      loggers.performance.start('gmail.deleteEmail', { accountId, emailId });
      
      const oauth2Client = await OAuthHelper.getOAuth2Client(accountId);
      const gmail = google.gmail({ version: GMAIL.API_VERSION, auth: oauth2Client });
      
      const res = await this.retryOperation(async () => {
        return await gmail.users.messages.delete({
          userId: "me",
          id: emailId
        });
      });
      
      const duration = Date.now() - startTime;
      loggers.performance.end('gmail.deleteEmail', duration, { 
        accountId, 
        emailId,
        success: true 
      });
      
      return { success: true, data: res.data };
    } catch (e) {
      const duration = Date.now() - startTime;
      loggers.performance.end('gmail.deleteEmail', duration, { 
        accountId, 
        emailId, 
        error: e.message 
      });
      
      loggers.api.error('DELETE', `/gmail/messages/${emailId}`, e, { accountId, emailId });
      return this.handleError(e);
    }
  }

  /**
   * Obtiene estadísticas de la cuenta
   * @param {string} accountId - ID de la cuenta
   * @returns {Promise<Object>} Estadísticas de la cuenta
   */
  async getAccountStats(accountId) {
    const startTime = Date.now();
    
    try {
      loggers.performance.start('gmail.getAccountStats', { accountId });
      
      const oauth2Client = await OAuthHelper.getOAuth2Client(accountId);
      const gmail = google.gmail({ version: GMAIL.API_VERSION, auth: oauth2Client });
      
      // Obtener perfil
      const profileRes = await this.retryOperation(async () => {
        return await gmail.users.getProfile({ userId: "me" });
      });
      
      // Obtener etiquetas
      const labelsRes = await this.retryOperation(async () => {
        return await gmail.users.labels.list({ userId: "me" });
      });
      
      // Obtener estadísticas de uso
      const usageRes = await this.retryOperation(async () => {
        return await gmail.users.messages.list({
          userId: "me",
          maxResults: 1,
          q: "is:unread"
        });
      });
      
      const stats = {
        emailAddress: profileRes.data.emailAddress,
        messagesTotal: profileRes.data.messagesTotal,
        threadsTotal: profileRes.data.threadsTotal,
        labelsCount: labelsRes.data.labels?.length || 0,
        unreadCount: usageRes.data.resultSizeEstimate || 0,
        lastSyncTime: new Date().toISOString()
      };
      
      const duration = Date.now() - startTime;
      loggers.performance.end('gmail.getAccountStats', duration, { 
        accountId, 
        stats 
      });
      
      return { success: true, data: stats };
    } catch (e) {
      const duration = Date.now() - startTime;
      loggers.performance.end('gmail.getAccountStats', duration, { 
        accountId, 
        error: e.message 
      });
      
      loggers.api.error('GET', '/gmail/stats', e, { accountId });
      return this.handleError(e);
    }
  }

  /**
   * Operación con reintentos
   * @private
   */
  async retryOperation(operation, retries = this.maxRetries) {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0 && this.isRetryableError(error)) {
        loggers.app.warn('Retrying Gmail operation', { 
          error: error.message, 
          retriesLeft: retries 
        });
        
        await this.delay(this.retryDelay);
        return this.retryOperation(operation, retries - 1);
      }
      throw error;
    }
  }

  /**
   * Verifica si el error es reintentable
   * @private
   */
  isRetryableError(error) {
    const retryableCodes = [429, 500, 502, 503, 504];
    const retryableMessages = [
      'ECONNRESET',
      'ENOTFOUND',
      'ETIMEDOUT',
      'socket hang up'
    ];
    
    return retryableCodes.includes(error.code) || 
           retryableMessages.some(msg => error.message.includes(msg));
  }

  /**
   * Delay utility
   * @private
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Obtiene detalles de emails en lote
   * @private
   */
  async fetchEmailDetailsBatch(accountId, messages) {
    if (messages.length === 0) return [];
    
    const oauth2Client = await OAuthHelper.getOAuth2Client(accountId);
    const gmail = google.gmail({ version: GMAIL.API_VERSION, auth: oauth2Client });
    
    // Procesar en lotes para evitar sobrecarga
    const batchSize = 10;
    const batches = [];
    
    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      batches.push(batch);
    }
    
    const results = [];
    for (const batch of batches) {
      const batchPromises = batch.map((m) => 
        this.retryOperation(async () => {
          return await gmail.users.messages.get({ 
            userId: "me", 
            id: m.id, 
            format: "full" 
          });
        })
      );
      
      const batchResults = await Promise.all(batchPromises);
      // Extraer .data de cada resultado de la API
      results.push(...batchResults.map(result => result.data));
    }
    
    return results;
  }

  /**
   * Parsea un mensaje de email básico
   * @private
   */
  parseEmailMessage(message) {
    const payload = message.payload || {};
    const headers = payload.headers || [];
    
    const getHeader = (name) => {
      const header = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
      return header ? header.value : "";
    };
    
    return {
      id: message.id,
      threadId: message.threadId,
      subject: getHeader("subject") || "No Subject",
      from: getHeader("from") || "Unknown",
      to: getHeader("to") || "",
      date: getHeader("date") || "",
      snippet: message.snippet || "",
      size: message.sizeEstimate || 0,
      labels: message.labelIds || []
    };
  }

  /**
   * Parsea detalles completos de un email
   * @private
   */
  parseEmailDetails(message) {
    const payload = message.payload || {};
    const headers = payload.headers || [];
    
    const getHeader = (name) => {
      const header = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
      return header ? header.value : "";
    };
    
    const emailData = {
      id: message.id,
      threadId: message.threadId,
      subject: getHeader("subject") || "No Subject",
      from: getHeader("from") || "Unknown",
      to: getHeader("to") || "",
      date: getHeader("date") || "",
      cc: getHeader("cc") || "",
      bcc: getHeader("bcc") || "",
      snippet: message.snippet || "",
      body: "",
      htmlBody: "",
      attachments: [],
      size: message.sizeEstimate || 0,
      labels: message.labelIds || [],
      historyId: message.historyId || ""
    };
    
    // Extraer contenido
    this.extractBody(payload, emailData);
    
    // Si no hay body pero hay htmlBody, usar htmlBody
    if (!emailData.body && emailData.htmlBody) {
      emailData.body = emailData.htmlBody;
    }
    
    // Extraer adjuntos
    this.extractAttachments(payload, emailData);
    
    return emailData;
  }

  /**
   * Extrae el cuerpo del email recursivamente
   * @private
   */
  extractBody(part, emailData) {
    if (part.body && part.body.data) {
      const data = Buffer.from(part.body.data, 'base64').toString('utf-8');
      if (part.mimeType === 'text/plain') {
        emailData.body = data;
      } else if (part.mimeType === 'text/html') {
        emailData.htmlBody = data;
      }
    }
    
    if (part.parts) {
      part.parts.forEach(p => this.extractBody(p, emailData));
    }
  }

  /**
   * Extrae adjuntos del email
   * @private
   */
  extractAttachments(part, emailData) {
    if (part.filename && part.body && part.body.attachmentId) {
      emailData.attachments.push({
        filename: part.filename,
        mimeType: part.mimeType,
        size: part.body.size || 0,
        attachmentId: part.body.attachmentId
      });
    }
    
    if (part.parts) {
      part.parts.forEach(p => this.extractAttachments(p, emailData));
    }
  }

  /**
   * Construye el mensaje raw para Gmail API
   * @private
   */
  buildRawMessage(from, emailData) {
    const { to, subject, body } = emailData;
    return `From: ${from}\r\nTo: ${to}\r\nSubject: ${subject}\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=\"UTF-8\"\r\nContent-Transfer-Encoding: 7bit\r\n\r\n${body}`;
  }

  /**
   * Codifica el mensaje en base64url
   * @private
   */
  encodeMessage(rawMessage) {
    return Buffer.from(rawMessage)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  /**
   * Valida los datos del email
   * @private
   */
  validateEmailData(emailData) {
    const { to, subject, body } = emailData;

    if (!to || typeof to !== 'string' || to.trim().length === 0) {
      throw new Error("Recipient email is required");
    }

    if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
      throw new Error("Subject is required");
    }

    if (!body || typeof body !== 'string' || body.trim().length === 0) {
      throw new Error("Body is required");
    }

    // Validar formato de email
    const emailList = to.split(',').map(e => e.trim());
    for (const email of emailList) {
      if (!VALIDATION.EMAIL_REGEX.test(email)) {
        throw new Error(`Invalid email address: ${email}`);
      }
    }

    // Validar longitud
    if (subject.length > VALIDATION.SUBJECT_MAX_LENGTH) {
      throw new Error(`Subject must be ${VALIDATION.SUBJECT_MAX_LENGTH} characters or less`);
    }

    if (body.length > VALIDATION.BODY_MAX_LENGTH) {
      throw new Error(`Body must be ${VALIDATION.BODY_MAX_LENGTH} characters or less`);
    }
  }

  /**
   * Maneja errores y retorna formato estándar
   * @private
   */
  handleError(e, defaultData = []) {
    const errorMessage = e.message || "Unknown error";
    let errorType = ERROR_TYPES.UNKNOWN;
    
    if (errorMessage.includes("token") || errorMessage.includes("auth") || errorMessage.includes("credentials")) {
      errorType = ERROR_TYPES.AUTHENTICATION;
    } else if (errorMessage.includes("network") || errorMessage.includes("timeout") || errorMessage.includes("ECONNREFUSED")) {
      errorType = ERROR_TYPES.NETWORK;
    } else if (errorMessage.includes("Account not found")) {
      errorType = ERROR_TYPES.ACCOUNT_NOT_FOUND;
    }
    
    return { 
      success: false, 
      error: errorMessage,
      errorType,
      data: defaultData 
    };
  }
}

// Exportar instancia única (Singleton)
module.exports = new GmailService();