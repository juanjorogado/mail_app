/**
 * Services Module Exports
 * Exporta todos los servicios de la aplicación
 */

// Servicios principales
const gmailService = require('./gmailService');
const calendarService = require('./calendarService');

// Exportar todos los servicios
module.exports = {
  gmailService,
  calendarService
};

// Exportar individualmente para compatibilidad
module.exports.GmailService = gmailService;
module.exports.CalendarService = calendarService;