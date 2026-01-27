/**
 * Errors Module Exports
 * Exporta todos los sistemas de manejo de errores
 */

// Clases principales
const AppError = require('./AppError');
const ErrorHandler = require('./ErrorHandler');

// Exportar todos los sistemas
module.exports = {
  AppError,
  ErrorHandler
};

// Exportar individualmente para compatibilidad
module.exports.appError = AppError;
module.exports.errorHandler = ErrorHandler;