/**
 * Event Bus System
 * Sistema de eventos centralizado con soporte para pub/sub y eventos en cadena
 */

const { loggers } = require('../common/logger');

class EventBus {
  constructor() {
    this.listeners = new Map();
    this.middlewares = [];
    this.eventHistory = [];
    this.maxHistorySize = 1000;
    
    loggers.app.info('Event bus initialized');
  }

  /**
   * Suscribe un listener a un evento
   * @param {string} eventName - Nombre del evento
   * @param {Function} listener - Función a ejecutar
   * @param {Object} options - Opciones del listener
   */
  on(eventName, listener, options = {}) {
    if (typeof listener !== 'function') {
      throw new Error('Listener must be a function');
    }

    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }

    const listenerData = {
      fn: listener,
      once: options.once || false,
      priority: options.priority || 0,
      id: this.generateId(),
      createdAt: new Date().toISOString()
    };

    this.listeners.get(eventName).push(listenerData);
    
    // Ordenar por prioridad (mayor a menor)
    this.listeners.get(eventName).sort((a, b) => b.priority - a.priority);
    
    loggers.events.subscribed(eventName, listenerData.id);
    
    return listenerData.id;
  }

  /**
   * Suscribe un listener que se ejecuta una sola vez
   * @param {string} eventName - Nombre del evento
   * @param {Function} listener - Función a ejecutar
   * @param {Object} options - Opciones del listener
   */
  once(eventName, listener, options = {}) {
    return this.on(eventName, listener, { ...options, once: true });
  }

  /**
   * Desuscribe un listener
   * @param {string} eventName - Nombre del evento
   * @param {string|Function} listenerId - ID del listener o la función
   */
  off(eventName, listenerId) {
    if (!this.listeners.has(eventName)) {
      return false;
    }

    const listeners = this.listeners.get(eventName);
    const initialLength = listeners.length;

    if (typeof listenerId === 'function') {
      // Buscar por función
      this.listeners.set(eventName, listeners.filter(l => l.fn !== listenerId));
    } else {
      // Buscar por ID
      this.listeners.set(eventName, listeners.filter(l => l.id !== listenerId));
    }

    const removed = listeners.length < initialLength;
    
    if (removed) {
      loggers.events.unsubscribed(eventName, listenerId);
    }
    
    return removed;
  }

  /**
   * Desuscribe todos los listeners de un evento
   * @param {string} eventName - Nombre del evento
   */
  offAll(eventName) {
    if (this.listeners.has(eventName)) {
      this.listeners.delete(eventName);
      loggers.events.unsubscribedAll(eventName);
      return true;
    }
    return false;
  }

  /**
   * Emite un evento
   * @param {string} eventName - Nombre del evento
   * @param {any} data - Datos del evento
   * @param {Object} context - Contexto del evento
   */
  async emit(eventName, data = null, context = {}) {
    const startTime = Date.now();
    const event = {
      name: eventName,
      data,
      context,
      timestamp: new Date().toISOString(),
      id: this.generateId()
    };

    try {
      // Aplicar middlewares
      const processedEvent = await this.applyMiddlewares(event);
      
      if (!processedEvent) {
        return; // Evento cancelado por middleware
      }

      // Obtener listeners
      const listeners = this.listeners.get(eventName) || [];
      
      // Ejecutar listeners en paralelo
      const promises = listeners.map(async (listener) => {
        try {
          await listener.fn(processedEvent.data, processedEvent.context);
          
          // Remover listeners "once"
          if (listener.once) {
            this.off(eventName, listener.id);
          }
        } catch (error) {
          loggers.events.error('listener_error', error, {
            eventName,
            listenerId: listener.id,
            eventId: event.id
          });
        }
      });

      await Promise.allSettled(promises);

      // Registrar en historial
      this.addToHistory(event);
      
      const duration = Date.now() - startTime;
      loggers.events.emitted(eventName, duration, {
        listenersCount: listeners.length,
        eventId: event.id
      });

    } catch (error) {
      loggers.events.error('emit_error', error, {
        eventName,
        eventId: event.id
      });
      throw error;
    }
  }

  /**
   * Emite un evento de forma síncrona
   * @param {string} eventName - Nombre del evento
   * @param {any} data - Datos del evento
   * @param {Object} context - Contexto del evento
   */
  emitSync(eventName, data = null, context = {}) {
    const startTime = Date.now();
    const event = {
      name: eventName,
      data,
      context,
      timestamp: new Date().toISOString(),
      id: this.generateId()
    };

    try {
      // Aplicar middlewares
      const processedEvent = this.applyMiddlewaresSync(event);
      
      if (!processedEvent) {
        return; // Evento cancelado por middleware
      }

      // Obtener listeners
      const listeners = this.listeners.get(eventName) || [];
      
      // Ejecutar listeners en secuencia
      for (const listener of listeners) {
        try {
          listener.fn(processedEvent.data, processedEvent.context);
          
          // Remover listeners "once"
          if (listener.once) {
            this.off(eventName, listener.id);
          }
        } catch (error) {
          loggers.events.error('listener_error_sync', error, {
            eventName,
            listenerId: listener.id,
            eventId: event.id
          });
        }
      }

      // Registrar en historial
      this.addToHistory(event);
      
      const duration = Date.now() - startTime;
      loggers.events.emitted(eventName, duration, {
        listenersCount: listeners.length,
        eventId: event.id,
        sync: true
      });

    } catch (error) {
      loggers.events.error('emit_sync_error', error, {
        eventName,
        eventId: event.id
      });
      throw error;
    }
  }

  /**
   * Agrega un middleware al bus de eventos
   * @param {Function} middleware - Función middleware
   */
  use(middleware) {
    if (typeof middleware !== 'function') {
      throw new Error('Middleware must be a function');
    }

    this.middlewares.push(middleware);
    loggers.events.middleware_added(middleware.name || 'anonymous');
  }

  /**
   * Aplica middlewares a un evento
   * @private
   */
  async applyMiddlewares(event) {
    let currentEvent = event;

    for (const middleware of this.middlewares) {
      try {
        const result = await middleware(currentEvent);
        
        if (result === null || result === false) {
          return null; // Evento cancelado
        }
        
        currentEvent = result || currentEvent;
      } catch (error) {
        loggers.events.error('middleware_error', error, {
          middleware: middleware.name || 'anonymous',
          eventId: event.id
        });
        return null; // Evento cancelado por error
      }
    }

    return currentEvent;
  }

  /**
   * Aplica middlewares de forma síncrona
   * @private
   */
  applyMiddlewaresSync(event) {
    let currentEvent = event;

    for (const middleware of this.middlewares) {
      try {
        const result = middleware(currentEvent);
        
        if (result === null || result === false) {
          return null; // Evento cancelado
        }
        
        currentEvent = result || currentEvent;
      } catch (error) {
        loggers.events.error('middleware_error_sync', error, {
          middleware: middleware.name || 'anonymous',
          eventId: event.id
        });
        return null; // Evento cancelado por error
      }
    }

    return currentEvent;
  }

  /**
   * Obtiene listeners de un evento
   * @param {string} eventName - Nombre del evento
   * @returns {Array} Array de listeners
   */
  getListeners(eventName) {
    return this.listeners.get(eventName) || [];
  }

  /**
   * Obtiene todos los nombres de eventos
   * @returns {Array} Array de nombres de eventos
   */
  getEventNames() {
    return Array.from(this.listeners.keys());
  }

  /**
   * Obtiene el historial de eventos
   * @param {number} limit - Límite de eventos a retornar
   * @returns {Array} Array de eventos
   */
  getHistory(limit = 100) {
    const end = Math.max(0, this.eventHistory.length - limit);
    return this.eventHistory.slice(end);
  }

  /**
   * Limpia el historial de eventos
   */
  clearHistory() {
    this.eventHistory = [];
    loggers.events.history_cleared();
  }

  /**
   * Obtiene estadísticas del bus de eventos
   * @returns {Object} Estadísticas
   */
  getStats() {
    const totalListeners = Array.from(this.listeners.values())
      .reduce((sum, listeners) => sum + listeners.length, 0);

    return {
      totalEvents: this.eventHistory.length,
      totalListeners,
      activeEventNames: this.getEventNames().length,
      middlewaresCount: this.middlewares.length,
      historySize: this.eventHistory.length,
      maxHistorySize: this.maxHistorySize
    };
  }

  /**
   * Genera un ID único
   * @private
   */
  generateId() {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Agrega un evento al historial
   * @private
   */
  addToHistory(event) {
    this.eventHistory.push({
      id: event.id,
      name: event.name,
      timestamp: event.timestamp,
      listenersCount: this.getListeners(event.name).length
    });

    // Mantener tamaño máximo del historial
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Crea un evento con datos de usuario
   * @param {string} type - Tipo de evento
   * @param {string} action - Acción realizada
   * @param {Object} data - Datos del evento
   * @param {Object} user - Información del usuario
   */
  createUserEvent(type, action, data = {}, user = {}) {
    return {
      type: 'user',
      subtype: type,
      action,
      data,
      user: {
        id: user.id || 'anonymous',
        email: user.email || null,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Crea un evento con datos del sistema
   * @param {string} type - Tipo de evento
   * @param {string} action - Acción realizada
   * @param {Object} data - Datos del evento
   */
  createSystemEvent(type, action, data = {}) {
    return {
      type: 'system',
      subtype: type,
      action,
      data,
      system: {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
      }
    };
  }

  /**
   * Crea un evento con datos de API
   * @param {string} type - Tipo de evento
   * @param {string} action - Acción realizada
   * @param {Object} data - Datos del evento
   * @param {Object} api - Información de la API
   */
  createApiEvent(type, action, data = {}, api = {}) {
    return {
      type: 'api',
      subtype: type,
      action,
      data,
      api: {
        endpoint: api.endpoint || null,
        method: api.method || null,
        status: api.status || null,
        duration: api.duration || null,
        timestamp: new Date().toISOString()
      }
    };
  }
}

// Exportar instancia única (Singleton)
module.exports = new EventBus();