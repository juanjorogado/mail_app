/**
 * Sistema de Logging Estructurado
 * Implementa logging con Winston para la aplicación
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Crear directorio de logs si no existe
const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Formato de logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Transportes de logs
const transports = [
  // Log de errores
  new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }),
  
  // Log general
  new winston.transports.File({
    filename: path.join(logDir, 'combined.log'),
    format: logFormat
  }),
  
  // Log de consola (solo en desarrollo)
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
  })
];

// Crear logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports,
  exitOnError: false
});

// Métodos de utilidad para diferentes tipos de logs
const loggers = {
  // Logs de aplicación
  app: {
    info: (message, meta = {}) => logger.info(`[APP] ${message}`, meta),
    warn: (message, meta = {}) => logger.warn(`[APP] ${message}`, meta),
    error: (message, meta = {}) => logger.error(`[APP] ${message}`, meta),
    debug: (message, meta = {}) => logger.debug(`[APP] ${message}`, meta)
  },

  // Logs de API
  api: {
    request: (method, url, meta = {}) => logger.info(`[API] ${method} ${url}`, { ...meta, type: 'request' }),
    response: (method, url, status, meta = {}) => logger.info(`[API] ${method} ${url} ${status}`, { ...meta, type: 'response' }),
    error: (method, url, error, meta = {}) => logger.error(`[API] ${method} ${url}`, { ...meta, error: error.message, stack: error.stack })
  },

  // Logs de autenticación
  auth: {
    success: (email, meta = {}) => logger.info(`[AUTH] Login successful for ${email}`, { ...meta, type: 'auth_success' }),
    failure: (email, reason, meta = {}) => logger.warn(`[AUTH] Login failed for ${email}: ${reason}`, { ...meta, type: 'auth_failure' }),
    token_refresh: (accountId, meta = {}) => logger.info(`[AUTH] Token refreshed for account ${accountId}`, { ...meta, type: 'token_refresh' })
  },

  // Logs de cuentas
  accounts: {
    info: (message, meta = {}) => logger.info(`[ACCOUNTS] ${message}`, meta),
    created: (accountId, meta = {}) => logger.info(`[ACCOUNTS] Account created: ${accountId}`, { ...meta, type: 'account_created' }),
    removed: (accountId, meta = {}) => logger.info(`[ACCOUNTS] Account removed: ${accountId}`, { ...meta, type: 'account_removed' }),
    error: (operation, error, meta = {}) => logger.error(`[ACCOUNTS] ${operation} failed`, { ...meta, error: error.message })
  },

  // Logs de performance
  performance: {
    start: (operation, meta = {}) => logger.debug(`[PERF] Starting ${operation}`, { ...meta, type: 'perf_start' }),
    end: (operation, duration, meta = {}) => logger.debug(`[PERF] ${operation} completed in ${duration}ms`, { ...meta, duration, type: 'perf_end' }),
    slow_operation: (operation, duration, meta = {}) => logger.warn(`[PERF] Slow operation: ${operation} took ${duration}ms`, { ...meta, duration, type: 'slow_operation' })
  },

  // Logs de seguridad
  security: {
    suspicious_activity: (activity, meta = {}) => logger.warn(`[SECURITY] Suspicious activity: ${activity}`, { ...meta, type: 'suspicious_activity' }),
    validation_error: (field, value, meta = {}) => logger.warn(`[SECURITY] Validation error on ${field}: ${value}`, { ...meta, type: 'validation_error' }),
    unauthorized_access: (resource, meta = {}) => logger.error(`[SECURITY] Unauthorized access attempt to ${resource}`, { ...meta, type: 'unauthorized_access' })
  }
};

// Middleware para Express (si se usa en el futuro)
const expressLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    loggers.api.response(req.method, req.originalUrl, res.statusCode, {
      duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
    
    // Log de operaciones lentas
    if (duration > 1000) {
      loggers.performance.slow_operation(`${req.method} ${req.originalUrl}`, duration);
    }
  });

  loggers.api.request(req.method, req.originalUrl, {
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  next();
};

// Manejador global de errores no capturados
const setupGlobalErrorHandlers = () => {
  process.on('uncaughtException', (error) => {
    loggers.app.error('Uncaught Exception', { error: error.message, stack: error.stack });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    loggers.app.error('Unhandled Promise Rejection', { 
      reason: reason instanceof Error ? reason.message : reason,
      stack: reason instanceof Error ? reason.stack : null,
      promise: promise.toString()
    });
  });
};

// Exportar logger y métodos
module.exports = {
  logger,
  loggers,
  expressLogger,
  setupGlobalErrorHandlers
};