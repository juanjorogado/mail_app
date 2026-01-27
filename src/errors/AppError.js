/**
 * AppError Class
 * Clase base para todos los errores de la aplicación
 */

const { loggers } = require('../common/logger');

class AppError extends Error {
  constructor(message, code = 'UNKNOWN_ERROR', statusCode = 500, details = null) {
    super(message);
    
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.id = this.generateId();
    
    // Capturar stack trace
    Error.captureStackTrace(this, this.constructor);
    
    // Registrar error
    this.logError();
  }

  /**
   * Genera un ID único para el error
   * @private
   */
  generateId() {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Registra el error en el sistema de logging
   * @private
   */
  logError() {
    const logData = {
      errorId: this.id,
      code: this.code,
      statusCode: this.statusCode,
      message: this.message,
      details: this.details,
      stack: this.stack
    };

    // Determinar nivel de log según statusCode
    const logLevel = this.getLogLevel();
    loggers.errors[logLevel](this.message, logData);
  }

  /**
   * Obtiene el nivel de log según el statusCode
   * @private
   */
  getLogLevel() {
    if (this.statusCode >= 500) return 'error';
    if (this.statusCode >= 400) return 'warn';
    return 'info';
  }

  /**
   * Convierte el error a formato JSON para respuestas HTTP
   * @returns {Object} Error en formato JSON
   */
  toJSON() {
    return {
      error: {
        id: this.id,
        name: this.name,
        code: this.code,
        message: this.message,
        statusCode: this.statusCode,
        details: this.details,
        timestamp: this.timestamp
      }
    };
  }

  /**
   * Crea un error de validación
   * @param {string} message - Mensaje del error
   * @param {Array} fields - Campos con errores de validación
   * @returns {AppError} Instancia de AppError
   */
  static validation(message, fields = []) {
    return new AppError(message, 'VALIDATION_ERROR', 400, { fields });
  }

  /**
   * Crea un error de autenticación
   * @param {string} message - Mensaje del error
   * @param {Object} details - Detalles adicionales
   * @returns {AppError} Instancia de AppError
   */
  static authentication(message, details = {}) {
    return new AppError(message, 'AUTHENTICATION_ERROR', 401, details);
  }

  /**
   * Crea un error de autorización
   * @param {string} message - Mensaje del error
   * @param {Object} details - Detalles adicionales
   * @returns {AppError} Instancia de AppError
   */
  static authorization(message, details = {}) {
    return new AppError(message, 'AUTHORIZATION_ERROR', 403, details);
  }

  /**
   * Crea un error de recurso no encontrado
   * @param {string} message - Mensaje del error
   * @param {string} resource - Tipo de recurso
   * @param {string} identifier - Identificador del recurso
   * @returns {AppError} Instancia de AppError
   */
  static notFound(message, resource = null, identifier = null) {
    const details = {};
    if (resource) details.resource = resource;
    if (identifier) details.identifier = identifier;
    
    return new AppError(message, 'NOT_FOUND', 404, details);
  }

  /**
   * Crea un error de conflicto
   * @param {string} message - Mensaje del error
   * @param {Object} details - Detalles adicionales
   * @returns {AppError} Instancia de AppError
   */
  static conflict(message, details = {}) {
    return new AppError(message, 'CONFLICT', 409, details);
  }

  /**
   * Crea un error de servidor interno
   * @param {string} message - Mensaje del error
   * @param {Error} originalError - Error original
   * @returns {AppError} Instancia de AppError
   */
  static internal(message, originalError = null) {
    const details = {};
    if (originalError) {
      details.originalError = {
        name: originalError.name,
        message: originalError.message,
        stack: originalError.stack
      };
    }
    
    return new AppError(message, 'INTERNAL_ERROR', 500, details);
  }

  /**
   * Crea un error de timeout
   * @param {string} message - Mensaje del error
   * @param {Object} details - Detalles adicionales
   * @returns {AppError} Instancia de AppError
   */
  static timeout(message, details = {}) {
    return new AppError(message, 'TIMEOUT_ERROR', 408, details);
  }

  /**
   * Crea un error de red
   * @param {string} message - Mensaje del error
   * @param {Object} details - Detalles adicionales
   * @returns {AppError} Instancia de AppError
   */
  static network(message, details = {}) {
    return new AppError(message, 'NETWORK_ERROR', 502, details);
  }

  /**
   * Crea un error de servicio no disponible
   * @param {string} message - Mensaje del error
   * @param {Object} details - Detalles adicionales
   * @returns {AppError} Instancia de AppError
   */
  static serviceUnavailable(message, details = {}) {
    return new AppError(message, 'SERVICE_UNAVAILABLE', 503, details);
  }

  /**
   * Crea un error de límite de tasa
   * @param {string} message - Mensaje del error
   * @param {Object} details - Detalles adicionales
   * @returns {AppError} Instancia de AppError
   */
  static rateLimit(message, details = {}) {
    return new AppError(message, 'RATE_LIMIT_ERROR', 429, details);
  }

  /**
   * Crea un error de formato no soportado
   * @param {string} message - Mensaje del error
   * @param {string} format - Formato no soportado
   * @returns {AppError} Instancia de AppError
   */
  static unsupportedFormat(message, format = null) {
    const details = format ? { format } : {};
    return new AppError(message, 'UNSUPPORTED_FORMAT', 415, details);
  }

  /**
   * Crea un error de payload demasiado grande
   * @param {string} message - Mensaje del error
   * @param {number} size - Tamaño del payload
   * @param {number} maxSize - Tamaño máximo permitido
   * @returns {AppError} Instancia de AppError
   */
  static payloadTooLarge(message, size = null, maxSize = null) {
    const details = {};
    if (size !== null) details.size = size;
    if (maxSize !== null) details.maxSize = maxSize;
    
    return new AppError(message, 'PAYLOAD_TOO_LARGE', 413, details);
  }

  /**
   * Crea un error de operación no permitida
   * @param {string} message - Mensaje del error
   * @param {string} operation - Operación no permitida
   * @returns {AppError} Instancia de AppError
   */
  static operationNotAllowed(message, operation = null) {
    const details = operation ? { operation } : {};
    return new AppError(message, 'OPERATION_NOT_ALLOWED', 405, details);
  }
}

module.exports = AppError;