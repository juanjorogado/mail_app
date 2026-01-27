/**
 * Events Module Exports
 * Exporta todos los sistemas de eventos y notificaciones
 */

// Sistemas principales
const EventBus = require('./EventBus');
const NotificationManager = require('./notifications');

// Exportar todos los sistemas
module.exports = {
  EventBus,
  NotificationManager
};

// Exportar individualmente para compatibilidad
module.exports.eventBus = EventBus;
module.exports.notifications = NotificationManager;