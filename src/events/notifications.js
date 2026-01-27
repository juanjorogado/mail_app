/**
 * Notification System
 * Sistema de notificaciones con múltiples canales y prioridades
 */

const { loggers } = require('../common/logger');
const EventBus = require('./EventBus');

class NotificationManager {
  constructor() {
    this.channels = new Map();
    this.templates = new Map();
    this.rules = [];
    this.notifications = [];
    this.maxNotifications = 1000;
    
    this.initializeDefaultChannels();
    this.initializeDefaultTemplates();
    this.initializeDefaultRules();
    
    loggers.app.info('Notification manager initialized');
  }

  /**
   * Inicializa canales de notificación por defecto
   * @private
   */
  initializeDefaultChannels() {
    // Canal de logging
    this.addChannel('log', {
      type: 'log',
      enabled: true,
      priority: 1,
      handler: (notification) => {
        const logLevel = this.getLogLevel(notification.priority);
        loggers.notifications[logLevel](notification.title, notification.message, {
          type: notification.type,
          priority: notification.priority,
          channel: 'log'
        });
      }
    });

    // Canal de eventos
    this.addChannel('event', {
      type: 'event',
      enabled: true,
      priority: 2,
      handler: async (notification) => {
        await EventBus.emit('notification', notification, {
          source: 'notification_manager',
          channel: 'event'
        });
      }
    });

    // Canal de console (para desarrollo)
    this.addChannel('console', {
      type: 'console',
      enabled: process.env.NODE_ENV === 'development',
      priority: 3,
      handler: (notification) => {
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${notification.priority.toUpperCase()}]`;
        console.log(`${prefix} ${notification.title}: ${notification.message}`);
      }
    });
  }

  /**
   * Inicializa plantillas de notificación por defecto
   * @private
   */
  initializeDefaultTemplates() {
    this.addTemplate('account_added', {
      title: 'Cuenta agregada exitosamente',
      message: 'La cuenta {{email}} ha sido agregada al sistema',
      priority: 'info',
      type: 'account'
    });

    this.addTemplate('account_removed', {
      title: 'Cuenta eliminada',
      message: 'La cuenta {{email}} ha sido eliminada del sistema',
      priority: 'warning',
      type: 'account'
    });

    this.addTemplate('email_sent', {
      title: 'Email enviado',
      message: 'El email a {{to}} ha sido enviado exitosamente',
      priority: 'info',
      type: 'email'
    });

    this.addTemplate('email_failed', {
      title: 'Error al enviar email',
      message: 'No se pudo enviar el email a {{to}}: {{error}}',
      priority: 'error',
      type: 'email'
    });

    this.addTemplate('sync_completed', {
      title: 'Sincronización completada',
      message: 'Se han sincronizado {{count}} emails',
      priority: 'info',
      type: 'sync'
    });

    this.addTemplate('sync_failed', {
      title: 'Error de sincronización',
      message: 'No se pudo sincronizar los emails: {{error}}',
      priority: 'error',
      type: 'sync'
    });

    this.addTemplate('token_expired', {
      title: 'Token expirado',
      message: 'El token de la cuenta {{email}} ha expirado y necesita renovación',
      priority: 'warning',
      type: 'security'
    });

    this.addTemplate('security_alert', {
      title: 'Alerta de seguridad',
      message: '{{message}}',
      priority: 'critical',
      type: 'security'
    });
  }

  /**
   * Inicializa reglas de notificación por defecto
   * @private
   */
  initializeDefaultRules() {
    // Regla para notificaciones críticas: enviar a todos los canales
    this.addRule({
      condition: (notification) => notification.priority === 'critical',
      channels: ['log', 'event', 'console'],
      throttle: 0 // Sin throttling para críticos
    });

    // Regla para notificaciones de error: enviar a log y event
    this.addRule({
      condition: (notification) => notification.priority === 'error',
      channels: ['log', 'event'],
      throttle: 1000 // 1 segundo
    });

    // Regla para notificaciones de warning: enviar a log
    this.addRule({
      condition: (notification) => notification.priority === 'warning',
      channels: ['log'],
      throttle: 5000 // 5 segundos
    });

    // Regla para notificaciones info: enviar solo a log
    this.addRule({
      condition: (notification) => notification.priority === 'info',
      channels: ['log'],
      throttle: 10000 // 10 segundos
    });
  }

  /**
   * Agrega un canal de notificación
   * @param {string} name - Nombre del canal
   * @param {Object} config - Configuración del canal
   */
  addChannel(name, config) {
    if (typeof config.handler !== 'function') {
      throw new Error('Channel handler must be a function');
    }

    this.channels.set(name, {
      ...config,
      name,
      createdAt: new Date().toISOString()
    });

    loggers.notifications.channel_added(name, config.type);
  }

  /**
   * Elimina un canal de notificación
   * @param {string} name - Nombre del canal
   */
  removeChannel(name) {
    if (this.channels.has(name)) {
      this.channels.delete(name);
      loggers.notifications.channel_removed(name);
      return true;
    }
    return false;
  }

  /**
   * Agrega una plantilla de notificación
   * @param {string} name - Nombre de la plantilla
   * @param {Object} template - Plantilla de notificación
   */
  addTemplate(name, template) {
    this.templates.set(name, {
      ...template,
      name,
      createdAt: new Date().toISOString()
    });

    loggers.notifications.template_added(name);
  }

  /**
   * Elimina una plantilla de notificación
   * @param {string} name - Nombre de la plantilla
   */
  removeTemplate(name) {
    if (this.templates.has(name)) {
      this.templates.delete(name);
      loggers.notifications.template_removed(name);
      return true;
    }
    return false;
  }

  /**
   * Agrega una regla de notificación
   * @param {Object} rule - Regla de notificación
   */
  addRule(rule) {
    if (typeof rule.condition !== 'function') {
      throw new Error('Rule condition must be a function');
    }

    this.rules.push({
      ...rule,
      id: this.generateId(),
      createdAt: new Date().toISOString()
    });

    loggers.notifications.rule_added(rule.id);
  }

  /**
   * Elimina una regla de notificación
   * @param {string} ruleId - ID de la regla
   */
  removeRule(ruleId) {
    const index = this.rules.findIndex(rule => rule.id === ruleId);
    if (index !== -1) {
      this.rules.splice(index, 1);
      loggers.notifications.rule_removed(ruleId);
      return true;
    }
    return false;
  }

  /**
   * Envía una notificación
   * @param {Object|string} notification - Notificación o nombre de plantilla
   * @param {Object} data - Datos para reemplazar en la plantilla
   * @param {Object} context - Contexto de la notificación
   */
  async send(notification, data = {}, context = {}) {
    try {
      // Si es un string, buscar en plantillas
      if (typeof notification === 'string') {
        const template = this.templates.get(notification);
        if (!template) {
          throw new Error(`Template '${notification}' not found`);
        }
        
        notification = this.applyTemplate(template, data);
      }

      // Validar notificación
      const validatedNotification = this.validateNotification(notification);
      
      // Aplicar reglas
      const channels = this.getChannelsForNotification(validatedNotification);
      
      // Enviar a canales
      const results = await this.sendToChannels(validatedNotification, channels, context);
      
      // Registrar notificación
      this.addNotification(validatedNotification, results);
      
      loggers.notifications.sent(validatedNotification.title, validatedNotification.priority, {
        channels: channels.length,
        context
      });

      return {
        success: true,
        notification: validatedNotification,
        channels: results
      };

    } catch (error) {
      loggers.notifications.error('send', error, { notification, data });
      throw error;
    }
  }

  /**
   * Aplica una plantilla a una notificación
   * @private
   */
  applyTemplate(template, data) {
    const title = this.replacePlaceholders(template.title, data);
    const message = this.replacePlaceholders(template.message, data);
    
    return {
      title,
      message,
      priority: template.priority || 'info',
      type: template.type || 'general',
      timestamp: new Date().toISOString(),
      id: this.generateId()
    };
  }

  /**
   * Reemplaza placeholders en texto
   * @private
   */
  replacePlaceholders(text, data) {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? data[key] : match;
    });
  }

  /**
   * Valida una notificación
   * @private
   */
  validateNotification(notification) {
    const requiredFields = ['title', 'message', 'priority', 'type'];
    
    for (const field of requiredFields) {
      if (!notification[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    const validPriorities = ['critical', 'error', 'warning', 'info'];
    if (!validPriorities.includes(notification.priority)) {
      throw new Error(`Invalid priority: ${notification.priority}`);
    }

    return {
      ...notification,
      id: notification.id || this.generateId(),
      timestamp: notification.timestamp || new Date().toISOString(),
      read: notification.read || false
    };
  }

  /**
   * Obtiene canales para una notificación según reglas
   * @private
   */
  getChannelsForNotification(notification) {
    const applicableRules = this.rules.filter(rule => rule.condition(notification));
    
    if (applicableRules.length === 0) {
      return ['log']; // Canal por defecto
    }

    // Combinar canales de todas las reglas aplicables
    const channels = new Set();
    for (const rule of applicableRules) {
      rule.channels.forEach(channel => channels.add(channel));
    }

    return Array.from(channels).filter(channel => 
      this.channels.has(channel) && this.channels.get(channel).enabled
    );
  }

  /**
   * Envía notificación a canales
   * @private
   */
  async sendToChannels(notification, channels, context) {
    const results = [];
    
    for (const channelName of channels) {
      const channel = this.channels.get(channelName);
      
      try {
        await channel.handler(notification);
        results.push({
          channel: channelName,
          success: true,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        loggers.notifications.error('channel_error', error, {
          channel: channelName,
          notificationId: notification.id
        });
        
        results.push({
          channel: channelName,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }

    return results;
  }

  /**
   * Agrega notificación al historial
   * @private
   */
  addNotification(notification, results) {
    this.notifications.push({
      ...notification,
      channels: results,
      deliveredAt: new Date().toISOString()
    });

    // Mantener tamaño máximo del historial
    if (this.notifications.length > this.maxNotifications) {
      this.notifications.shift();
    }
  }

  /**
   * Obtiene notificaciones por tipo
   * @param {string} type - Tipo de notificación
   * @param {number} limit - Límite de resultados
   * @returns {Array} Array de notificaciones
   */
  getNotificationsByType(type, limit = 50) {
    return this.notifications
      .filter(n => n.type === type)
      .slice(-limit);
  }

  /**
   * Obtiene notificaciones por prioridad
   * @param {string} priority - Prioridad de notificación
   * @param {number} limit - Límite de resultados
   * @returns {Array} Array de notificaciones
   */
  getNotificationsByPriority(priority, limit = 50) {
    return this.notifications
      .filter(n => n.priority === priority)
      .slice(-limit);
  }

  /**
   * Marca una notificación como leída
   * @param {string} notificationId - ID de la notificación
   */
  markAsRead(notificationId) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      notification.readAt = new Date().toISOString();
      loggers.notifications.marked_as_read(notificationId);
      return true;
    }
    return false;
  }

  /**
   * Obtiene estadísticas de notificaciones
   * @returns {Object} Estadísticas
   */
  getStats() {
    const stats = {
      total: this.notifications.length,
      byType: {},
      byPriority: {},
      byChannel: {},
      unread: 0,
      channels: this.channels.size,
      templates: this.templates.size,
      rules: this.rules.length
    };

    for (const notification of this.notifications) {
      // Contar por tipo
      stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;
      
      // Contar por prioridad
      stats.byPriority[notification.priority] = (stats.byPriority[notification.priority] || 0) + 1;
      
      // Contar no leídas
      if (!notification.read) {
        stats.unread++;
      }

      // Contar por canal
      if (notification.channels) {
        for (const channel of notification.channels) {
          stats.byChannel[channel.channel] = (stats.byChannel[channel.channel] || 0) + 1;
        }
      }
    }

    return stats;
  }

  /**
   * Limpia el historial de notificaciones
   * @param {number} keep - Cantidad a mantener
   */
  clearHistory(keep = 0) {
    if (keep === 0) {
      this.notifications = [];
    } else {
      this.notifications = this.notifications.slice(-keep);
    }
    
    loggers.notifications.history_cleared(keep);
  }

  /**
   * Obtiene nivel de log según prioridad
   * @private
   */
  getLogLevel(priority) {
    switch (priority) {
      case 'critical': return 'error';
      case 'error': return 'error';
      case 'warning': return 'warn';
      case 'info': return 'info';
      default: return 'info';
    }
  }

  /**
   * Genera un ID único
   * @private
   */
  generateId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Exportar instancia única (Singleton)
module.exports = new NotificationManager();