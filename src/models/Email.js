/**
 * Email Model
 * Modelo de datos para emails con validación y transformación
 */

const { loggers } = require('../common/logger');
const { VALIDATION } = require('../config/constants');

class Email {
  constructor(data = {}) {
    this.id = data.id || null;
    this.threadId = data.threadId || null;
    this.subject = data.subject || "No Subject";
    this.from = data.from || "";
    this.to = data.to || "";
    this.cc = data.cc || "";
    this.bcc = data.bcc || "";
    this.date = data.date || new Date().toISOString();
    this.snippet = data.snippet || "";
    this.body = data.body || "";
    this.htmlBody = data.htmlBody || "";
    this.size = data.size || 0;
    this.labels = data.labels || [];
    this.attachments = data.attachments || [];
    this.historyId = data.historyId || "";
    this.isRead = data.isRead !== undefined ? data.isRead : true;
    this.priority = data.priority || 'normal';
    this.importance = data.importance || 'normal';
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  /**
   * Valida el modelo de email
   * @returns {Object} Resultado de validación
   */
  validate() {
    const errors = [];
    const warnings = [];

    // Validar campos requeridos
    if (!this.subject || this.subject.trim().length === 0) {
      errors.push("Subject is required");
    }

    if (!this.from || !this.isValidEmail(this.from)) {
      errors.push("Valid from email is required");
    }

    // Validar tamaño del cuerpo
    if (this.body && this.body.length > VALIDATION.BODY_MAX_LENGTH) {
      errors.push(`Body exceeds maximum length of ${VALIDATION.BODY_MAX_LENGTH} characters`);
    }

    if (this.subject && this.subject.length > VALIDATION.SUBJECT_MAX_LENGTH) {
      errors.push(`Subject exceeds maximum length of ${VALIDATION.SUBJECT_MAX_LENGTH} characters`);
    }

    // Validar adjuntos
    if (this.attachments && this.attachments.length > VALIDATION.MAX_ATTACHMENTS) {
      errors.push(`Too many attachments. Maximum allowed: ${VALIDATION.MAX_ATTACHMENTS}`);
    }

    // Validar tamaño total
    const totalSize = this.calculateTotalSize();
    if (totalSize > VALIDATION.MAX_EMAIL_SIZE) {
      errors.push(`Email size exceeds maximum of ${this.formatBytes(VALIDATION.MAX_EMAIL_SIZE)}`);
    }

    // Validar prioridad
    const validPriorities = ['low', 'normal', 'high'];
    if (this.priority && !validPriorities.includes(this.priority)) {
      warnings.push(`Invalid priority: ${this.priority}. Using 'normal'`);
      this.priority = 'normal';
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Convierte el modelo a formato para Gmail API
   * @returns {Object} Formato Gmail API
   */
  toGmailFormat() {
    const validation = this.validate();
    
    if (!validation.isValid) {
      throw new Error(`Email validation failed: ${validation.errors.join(', ')}`);
    }

    const rawMessage = [
      `From: ${this.from}`,
      `To: ${this.to}`,
      `Cc: ${this.cc}`,
      `Subject: ${this.subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: 7bit',
      '',
      this.body
    ].join('\r\n');

    return {
      raw: this.encodeMessage(rawMessage),
      threadId: this.threadId,
      labelIds: this.labels
    };
  }

  /**
   * Convierte de formato Gmail API a modelo
   * @param {Object} gmailMessage - Mensaje de Gmail API
   * @returns {Email} Instancia de Email
   */
  static fromGmailFormat(gmailMessage) {
    const payload = gmailMessage.payload || {};
    const headers = payload.headers || [];

    const getHeader = (name) => {
      const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
      return header ? header.value : "";
    };

    const email = new Email({
      id: gmailMessage.id,
      threadId: gmailMessage.threadId,
      subject: getHeader("subject") || "No Subject",
      from: getHeader("from") || "",
      to: getHeader("to") || "",
      cc: getHeader("cc") || "",
      bcc: getHeader("bcc") || "",
      date: getHeader("date") || "",
      snippet: gmailMessage.snippet || "",
      size: gmailMessage.sizeEstimate || 0,
      labels: gmailMessage.labelIds || [],
      historyId: gmailMessage.historyId || "",
      isRead: !gmailMessage.labelIds?.includes('UNREAD'),
      createdAt: gmailMessage.internalDate ? new Date(parseInt(gmailMessage.internalDate)).toISOString() : new Date().toISOString()
    });

    // Extraer cuerpo del mensaje
    email.extractBody(payload);

    // Extraer adjuntos
    email.extractAttachments(payload);

    return email;
  }

  /**
   * Extrae el cuerpo del mensaje
   * @private
   */
  extractBody(part) {
    if (part.body && part.body.data) {
      const data = Buffer.from(part.body.data, 'base64').toString('utf-8');
      if (part.mimeType === 'text/plain') {
        this.body = data;
      } else if (part.mimeType === 'text/html') {
        this.htmlBody = data;
      }
    }

    if (part.parts) {
      part.parts.forEach(p => this.extractBody(p));
    }
  }

  /**
   * Extrae adjuntos del mensaje
   * @private
   */
  extractAttachments(part) {
    if (part.filename && part.body && part.body.attachmentId) {
      this.attachments.push({
        filename: part.filename,
        mimeType: part.mimeType,
        size: part.body.size || 0,
        attachmentId: part.body.attachmentId
      });
    }

    if (part.parts) {
      part.parts.forEach(p => this.extractAttachments(p));
    }
  }

  /**
   * Codifica mensaje para Gmail API
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
   * Calcula el tamaño total del email
   * @returns {number} Tamaño en bytes
   */
  calculateTotalSize() {
    const bodySize = Buffer.byteLength(this.body || '', 'utf8');
    const htmlBodySize = Buffer.byteLength(this.htmlBody || '', 'utf8');
    const attachmentsSize = this.attachments.reduce((total, att) => total + (att.size || 0), 0);
    
    return bodySize + htmlBodySize + attachmentsSize;
  }

  /**
   * Formatea bytes a string legible
   * @private
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Verifica si un email es válido
   * @private
   */
  isValidEmail(email) {
    return VALIDATION.EMAIL_REGEX.test(email);
  }

  /**
   * Obtiene estadísticas del email
   * @returns {Object} Estadísticas
   */
  getStats() {
    return {
      id: this.id,
      subject: this.subject,
      from: this.from,
      to: this.to,
      size: this.formatBytes(this.calculateTotalSize()),
      attachmentsCount: this.attachments.length,
      labelsCount: this.labels.length,
      isRead: this.isRead,
      priority: this.priority,
      age: this.getAge(),
      hasHtmlBody: !!this.htmlBody,
      hasAttachments: this.attachments.length > 0
    };
  }

  /**
   * Calcula la antigüedad del email
   * @returns {string} Edad formateada
   */
  getAge() {
    const now = new Date();
    const createdAt = new Date(this.createdAt);
    const diffMs = now - createdAt;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays} day(s) ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour(s) ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute(s) ago`;
    } else {
      return 'Just now';
    }
  }

  /**
   * Marca el email como leído
   */
  markAsRead() {
    this.isRead = true;
    this.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Marca el email como no leído
   */
  markAsUnread() {
    this.isRead = false;
    this.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Agrega una etiqueta
   * @param {string} label - Etiqueta a agregar
   */
  addLabel(label) {
    if (!this.labels.includes(label)) {
      this.labels.push(label);
      this.updatedAt = new Date().toISOString();
    }
    return this;
  }

  /**
   * Remueve una etiqueta
   * @param {string} label - Etiqueta a remover
   */
  removeLabel(label) {
    this.labels = this.labels.filter(l => l !== label);
    this.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Agrega un adjunto
   * @param {Object} attachment - Adjunto a agregar
   */
  addAttachment(attachment) {
    if (this.attachments.length >= VALIDATION.MAX_ATTACHMENTS) {
      throw new Error(`Maximum number of attachments (${VALIDATION.MAX_ATTACHMENTS}) exceeded`);
    }

    this.attachments.push({
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      size: attachment.size || 0,
      attachmentId: attachment.attachmentId || null
    });

    this.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Convierte a JSON
   * @returns {Object} Representación JSON
   */
  toJSON() {
    return {
      id: this.id,
      threadId: this.threadId,
      subject: this.subject,
      from: this.from,
      to: this.to,
      cc: this.cc,
      bcc: this.bcc,
      date: this.date,
      snippet: this.snippet,
      body: this.body,
      htmlBody: this.htmlBody,
      size: this.size,
      labels: this.labels,
      attachments: this.attachments,
      historyId: this.historyId,
      isRead: this.isRead,
      priority: this.priority,
      importance: this.importance,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Crea una instancia desde JSON
   * @param {Object} json - Datos JSON
   * @returns {Email} Instancia de Email
   */
  static fromJSON(json) {
    return new Email(json);
  }
}

module.exports = Email;