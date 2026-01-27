/**
 * Gmail Service
 * Servicio para interactuar con la API de Gmail
 */

const { google } = require("googleapis");
const OAuthHelper = require("../common/oauthHelper");
const { GMAIL, VALIDATION, ERROR_TYPES } = require("../config/constants");

class GmailService {
  /**
   * Obtiene lista de emails
   * @param {string} accountId - ID de la cuenta
   * @param {string} folder - Carpeta (INBOX, SENT, etc.)
   * @param {number} maxResults - Máximo de resultados
   * @returns {Promise<Object>} Resultado con emails
   */
  static async fetchEmails(accountId, folder = GMAIL.DEFAULT_FOLDER, maxResults = GMAIL.MAX_RESULTS) {
    try {
      if (!accountId) {
        throw new Error("Account ID is required");
      }

      const oauth2Client = await OAuthHelper.getOAuth2Client(accountId);
      const gmail = google.gmail({ version: GMAIL.API_VERSION, auth: oauth2Client });
      
      // Construir query según la carpeta
      const query = GMAIL.FOLDERS[folder.toUpperCase()] || GMAIL.FOLDERS.INBOX;
      
      const res = await gmail.users.messages.list({ 
        userId: "me", 
        maxResults,
        q: query
      });
      
      const msgs = res.data.messages || [];
      const detailed = await Promise.all(
        msgs.map((m) => gmail.users.messages.get({ userId: "me", id: m.id, format: "full" }))
      );
      
      const emails = detailed.map((d) => this._parseEmailMessage(d));
      
      return { success: true, data: emails, folder };
    } catch (e) {
      console.error("Fetch emails error:", e);
      return this._handleError(e);
    }
  }

  /**
   * Obtiene detalles completos de un email
   * @param {string} accountId - ID de la cuenta
   * @param {string} emailId - ID del email
   * @returns {Promise<Object>} Detalles del email
   */
  static async fetchEmailDetails(accountId, emailId) {
    try {
      if (!accountId || !emailId) {
        throw new Error("Account ID and Email ID are required");
      }

      const oauth2Client = await OAuthHelper.getOAuth2Client(accountId);
      const gmail = google.gmail({ version: GMAIL.API_VERSION, auth: oauth2Client });
      
      const res = await gmail.users.messages.get({ 
        userId: "me", 
        id: emailId, 
        format: "full" 
      });
      
      const emailData = this._parseEmailDetails(res.data);
      
      return { success: true, data: emailData };
    } catch (e) {
      console.error("Fetch email details error:", e);
      return this._handleError(e, null);
    }
  }

  /**
   * Envía un email
   * @param {string} accountId - ID de la cuenta
   * @param {Object} emailData - Datos del email { to, subject, body }
   * @returns {Promise<Object>} Resultado del envío
   */
  static async sendEmail(accountId, emailData) {
    try {
      // Validar datos
      this._validateEmailData(emailData);

      const Accounts = require("../common/accounts");
      const accountsList = Accounts.getAccounts();
      const account = accountsList.find((a) => a.email === accountId || a.id === accountId);
      
      if (!account || !account.tokens) {
        throw new Error("Account not found or token missing");
      }
      
      const oauth2Client = await OAuthHelper.getOAuth2Client(accountId);
      const gmail = google.gmail({ version: GMAIL.API_VERSION, auth: oauth2Client });
      
      const rawMessage = this._buildRawMessage(account.email, emailData);
      const encoded = this._encodeMessage(rawMessage);
      
      const res = await gmail.users.messages.send({ 
        userId: "me", 
        requestBody: { raw: encoded } 
      });
      
      return { 
        success: true, 
        id: res.data.id, 
        threadId: res.data.threadId 
      };
    } catch (e) {
      console.error("Send email error:", e);
      throw e;
    }
  }

  /**
   * Parsea un mensaje de email básico
   * @private
   */
  static _parseEmailMessage(message) {
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
      date: getHeader("date") || "",
      snippet: message.snippet || ""
    };
  }

  /**
   * Parsea detalles completos de un email
   * @private
   */
  static _parseEmailDetails(message) {
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
      to: getHeader("to") || "Unknown",
      date: getHeader("date") || "",
      cc: getHeader("cc") || "",
      bcc: getHeader("bcc") || "",
      snippet: message.snippet || "",
      body: "",
      htmlBody: ""
    };
    
    // Extraer contenido
    this._extractBody(payload, emailData);
    
    // Si no hay body pero hay htmlBody, usar htmlBody
    if (!emailData.body && emailData.htmlBody) {
      emailData.body = emailData.htmlBody;
    }
    
    return emailData;
  }

  /**
   * Extrae el cuerpo del email recursivamente
   * @private
   */
  static _extractBody(part, emailData) {
    if (part.body && part.body.data) {
      const data = Buffer.from(part.body.data, 'base64').toString('utf-8');
      if (part.mimeType === 'text/plain') {
        emailData.body = data;
      } else if (part.mimeType === 'text/html') {
        emailData.htmlBody = data;
      }
    }
    
    if (part.parts) {
      part.parts.forEach(p => this._extractBody(p, emailData));
    }
  }

  /**
   * Construye el mensaje raw para Gmail API
   * @private
   */
  static _buildRawMessage(from, emailData) {
    const { to, subject, body } = emailData;
    return `From: ${from}\r\nTo: ${to}\r\nSubject: ${subject}\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=\"UTF-8\"\r\nContent-Transfer-Encoding: 7bit\r\n\r\n${body}`;
  }

  /**
   * Codifica el mensaje en base64url
   * @private
   */
  static _encodeMessage(rawMessage) {
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
  static _validateEmailData(emailData) {
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
  static _handleError(e, defaultData = []) {
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

module.exports = GmailService;
