/**
 * Sistema de Validación Robusta
 * Validación de entrada con sanitización avanzada y seguridad
 */

const { loggers } = require('./logger');

class ValidationManager {
  constructor() {
    this.rules = {
      email: {
        regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        maxLength: 254, // RFC 5321 limit
        minLength: 3
      },
      subject: {
        maxLength: 200,
        minLength: 1
      },
      body: {
        maxLength: 10000,
        minLength: 1
      },
      accountId: {
        minLength: 1
      }
    };
  }

  /**
   * Valida formato de email con validación avanzada
   */
  isValidEmail(email) {
    try {
      if (!email || typeof email !== 'string') {
        loggers.security.validation_error('email', email);
        return false;
      }

      const trimmed = email.trim();
      
      // Validar longitud
      if (trimmed.length < this.rules.email.minLength || trimmed.length > this.rules.email.maxLength) {
        loggers.security.validation_error('email_length', trimmed.length);
        return false;
      }

      // Validar formato básico
      if (!this.rules.email.regex.test(trimmed)) {
        loggers.security.validation_error('email_format', trimmed);
        return false;
      }

      // Validar dominio (básico)
      const domain = trimmed.split('@')[1];
      if (!domain || domain.length < 2) {
        loggers.security.validation_error('email_domain', domain);
        return false;
      }

      return true;
    } catch (error) {
      loggers.security.validation_error('email_exception', email, { error: error.message });
      return false;
    }
  }

  /**
   * Valida múltiples emails separados por coma
   */
  isValidEmailList(emails) {
    try {
      if (!emails || typeof emails !== 'string') {
        loggers.security.validation_error('email_list', emails);
        return false;
      }

      const emailList = emails.split(',').map(e => e.trim()).filter(e => e.length > 0);
      
      if (emailList.length === 0) {
        loggers.security.validation_error('email_list_empty', emails);
        return false;
      }

      // Limitar número de destinatarios
      if (emailList.length > 50) {
        loggers.security.validation_error('email_list_too_many', emailList.length);
        return false;
      }

      const validEmails = emailList.filter(email => this.isValidEmail(email));
      
      if (validEmails.length !== emailList.length) {
        const invalidEmails = emailList.filter(email => !this.isValidEmail(email));
        loggers.security.validation_error('email_list_invalid', invalidEmails);
        return false;
      }

      return true;
    } catch (error) {
      loggers.security.validation_error('email_list_exception', emails, { error: error.message });
      return false;
    }
  }

  /**
   * Sanitiza texto para prevenir XSS avanzado
   */
  sanitizeText(text) {
    try {
      if (!text || typeof text !== 'string') {
        return '';
      }

      // Eliminar etiquetas HTML peligrosas
      let sanitized = text
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
        .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
        .replace(/<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link>/gi, '')
        .replace(/<meta\b[^<]*(?:(?!<\/meta>)<[^<]*)*<\/meta>/gi, '');

      // Escapar caracteres HTML básicos
      sanitized = sanitized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

      // Limitar longitud
      if (sanitized.length > this.rules.body.maxLength) {
        sanitized = sanitized.substring(0, this.rules.body.maxLength);
        loggers.security.validation_error('text_too_long', sanitized.length);
      }

      return sanitized;
    } catch (error) {
      loggers.security.validation_error('sanitize_exception', text, { error: error.message });
      return '';
    }
  }

  /**
   * Valida que un campo no esté vacío
   */
  isNotEmpty(value, minLength = 1) {
    try {
      if (typeof value !== 'string') {
        loggers.security.validation_error('not_empty_type', typeof value);
        return false;
      }

      const trimmed = value.trim();
      if (trimmed.length < minLength) {
        loggers.security.validation_error('not_empty_length', trimmed.length, { required: minLength });
        return false;
      }

      return true;
    } catch (error) {
      loggers.security.validation_error('not_empty_exception', value, { error: error.message });
      return false;
    }
  }

  /**
   * Valida longitud máxima
   */
  isWithinLength(value, maxLength) {
    try {
      if (typeof value !== 'string') {
        loggers.security.validation_error('length_type', typeof value);
        return false;
      }

      if (value.length > maxLength) {
        loggers.security.validation_error('length_exceeded', value.length, { max: maxLength });
        return false;
      }

      return true;
    } catch (error) {
      loggers.security.validation_error('length_exception', value, { error: error.message });
      return false;
    }
  }

  /**
   * Valida payload completo de email con validación avanzada
   */
  validateEmailPayload(payload) {
    const errors = [];
    const warnings = [];

    try {
      if (!payload || typeof payload !== 'object') {
        errors.push('Payload is required and must be an object');
        return { isValid: false, errors, warnings };
      }

      // Validar 'to'
      if (!payload.to || !this.isValidEmailList(payload.to)) {
        errors.push('Invalid email address(es) in "To" field');
      } else {
        const emailCount = payload.to.split(',').map(e => e.trim()).filter(e => e.length > 0).length;
        if (emailCount > 10) {
          warnings.push('Consider reducing the number of recipients for better performance');
        }
      }

      // Validar 'subject'
      if (!payload.subject || !this.isNotEmpty(payload.subject)) {
        errors.push('Subject is required');
      } else if (!this.isWithinLength(payload.subject, this.rules.subject.maxLength)) {
        errors.push(`Subject must be ${this.rules.subject.maxLength} characters or less`);
      } else {
        // Validar contenido del subject
        const sanitizedSubject = this.sanitizeText(payload.subject);
        if (sanitizedSubject !== payload.subject) {
          warnings.push('Subject contained potentially unsafe characters and was sanitized');
        }
      }

      // Validar 'body'
      if (!payload.body || !this.isNotEmpty(payload.body)) {
        errors.push('Body is required');
      } else if (!this.isWithinLength(payload.body, this.rules.body.maxLength)) {
        errors.push(`Body must be ${this.rules.body.maxLength} characters or less`);
      } else {
        // Validar contenido del body
        const sanitizedBody = this.sanitizeText(payload.body);
        if (sanitizedBody !== payload.body) {
          warnings.push('Body contained potentially unsafe characters and was sanitized');
        }
      }

      // Validar 'accountId'
      if (!payload.accountId || !this.isNotEmpty(payload.accountId, this.rules.accountId.minLength)) {
        errors.push('Account selection is required');
      }

      // Validar tamaño total del payload
      const payloadSize = JSON.stringify(payload).length;
      if (payloadSize > 50000) { // 50KB limit
        warnings.push('Payload size is large, consider reducing content');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        sanitizedPayload: this.sanitizePayload(payload)
      };
    } catch (error) {
      loggers.security.validation_error('payload_validation_exception', payload, { error: error.message });
      return {
        isValid: false,
        errors: ['Validation failed due to internal error'],
        warnings: [],
        sanitizedPayload: null
      };
    }
  }

  /**
   * Sanitiza todo el payload
   */
  sanitizePayload(payload) {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    return {
      ...payload,
      to: payload.to ? payload.to.trim() : '',
      subject: payload.subject ? this.sanitizeText(payload.subject) : '',
      body: payload.body ? this.sanitizeText(payload.body) : '',
      accountId: payload.accountId ? payload.accountId.trim() : ''
    };
  }

  /**
   * Valida ID de cuenta
   */
  isValidAccountId(accountId) {
    try {
      if (!accountId || typeof accountId !== 'string') {
        loggers.security.validation_error('account_id_type', typeof accountId);
        return false;
      }

      const trimmed = accountId.trim();
      if (trimmed.length < this.rules.accountId.minLength) {
        loggers.security.validation_error('account_id_length', trimmed.length);
        return false;
      }

      // Validar formato de ID (no debe contener caracteres especiales peligrosos)
      if (/[<>\"'&]/.test(trimmed)) {
        loggers.security.validation_error('account_id_special_chars', trimmed);
        return false;
      }

      return true;
    } catch (error) {
      loggers.security.validation_error('account_id_exception', accountId, { error: error.message });
      return false;
    }
  }

  /**
   * Valida email contra lista negra
   */
  isEmailAllowed(email) {
    const blacklistedDomains = [
      'spam.com',
      'tempmail.org',
      '10minutemail.com'
    ];

    const domain = email.toLowerCase().split('@')[1];
    if (blacklistedDomains.includes(domain)) {
      loggers.security.suspicious_activity('blacklisted_domain', { domain, email });
      return false;
    }

    return true;
  }
}

// Exportar instancia única
const validationManager = new ValidationManager();

// Exportar funciones globalmente para compatibilidad
if (typeof window !== 'undefined') {
  window.validation = {
    isValidEmail: (email) => validationManager.isValidEmail(email),
    isValidEmailList: (emails) => validationManager.isValidEmailList(emails),
    sanitizeText: (text) => validationManager.sanitizeText(text),
    isNotEmpty: (value, minLength) => validationManager.isNotEmpty(value, minLength),
    isWithinLength: (value, maxLength) => validationManager.isWithinLength(value, maxLength),
    validateEmailPayload: (payload) => validationManager.validateEmailPayload(payload),
    isValidAccountId: (accountId) => validationManager.isValidAccountId(accountId),
    isEmailAllowed: (email) => validationManager.isEmailAllowed(email)
  };
}

module.exports = validationManager;
