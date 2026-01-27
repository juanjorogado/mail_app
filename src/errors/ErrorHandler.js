/**
 * Error Handler
 * Sistema centralizado de manejo de errores con políticas de reintentos y recuperación
 */

const { loggers } = require('../common/logger');
const EventBus = require('../events/EventBus');
const NotificationManager = require('../events/notifications');
const AppError = require('./AppError');

class ErrorHandler {
  constructor() {
    this.errorPolicies = new Map();
    this.retryStrategies = new Map();
    this.errorHandlers = new Map();
    this.globalHandlers = [];
    this.errorHistory = [];
    this.maxHistorySize = 1000;
    
    this.initializeDefaultPolicies();
    this.initializeDefaultStrategies();
    this.setupGlobalHandlers();
    
    loggers.app.info('Error handler initialized');
  }

  /**
   * Inicializa políticas de manejo de errores por defecto
   * @private
   */
  initializeDefaultPolicies() {
    // Política para errores de red
    this.addPolicy('NETWORK_ERROR', {
      retry: true,
      maxRetries: 3,
      backoff: 'exponential',
      timeout: 30000,
      recovery: 'retry_with_backoff'
    });

    // Política para errores de timeout
    this.addPolicy('TIMEOUT_ERROR', {
      retry: true,
      maxRetries: 2,
      backoff: 'linear',
      timeout: 60000,
      recovery: 'increase_timeout'
    });

    // Política para errores de autenticación
    this.addPolicy('AUTHENTICATION_ERROR', {
      retry: false,
      maxRetries: 0,
      backoff: null,
      timeout: 0,
      recovery: 'renew_token'
    });

    // Política para errores de autorización
    this.addPolicy('AUTHORIZATION_ERROR', {
      retry: false,
      maxRetries: 0,
      backoff: null,
      timeout: 0,
      recovery: 'check_permissions'
    });

    // Política para errores de validación
    this.addPolicy('VALIDATION_ERROR', {
      retry: false,
      maxRetries: 0,
      backoff: null,
      timeout: 0,
      recovery: 'fix_data'
    });

    // Política para errores internos
    this.addPolicy('INTERNAL_ERROR', {
      retry: true,
      maxRetries: 2,
      backoff: 'exponential',
      timeout: 15000,
      recovery: 'fallback'
    });

    // Política para errores de servicio no disponible
    this.addPolicy('SERVICE_UNAVAILABLE', {
      retry: true,
      maxRetries: 5,
      backoff: 'exponential',
      timeout: 120000,
      recovery: 'wait_and_retry'
    });
  }

  /**
   * Inicializa estrategias de reintento por defecto
   * @private
   */
  initializeDefaultStrategies() {
    // Estrategia de reintento exponencial
    this.addRetryStrategy('exponential', (attempt, baseDelay = 1000) => {
      return baseDelay * Math.pow(2, attempt);
    });

    // Estrategia de reintento lineal
    this.addRetryStrategy('linear', (attempt, baseDelay = 1000) => {
      return baseDelay * (attempt + 1);
    });

    // Estrategia de reintento con jitter
    this.addRetryStrategy('jitter', (attempt, baseDelay = 1000) => {
      const delay = baseDelay * Math.pow(2, attempt);
      return delay + Math.random() * 1000;
    });

    // Estrategia de reintento fijo
    this.addRetryStrategy('fixed', (attempt, baseDelay = 1000) => {
      return baseDelay;
    });
  }

  /**
   * Configura manejadores de errores globales
   * @private
   */
  setupGlobalHandlers() {
    // Manejador de errores no capturados
    process.on('uncaughtException', (error) => {
      this.handleGlobalError('uncaughtException', error);
    });

    // Manejador de promesas rechazadas no capturadas
    process.on('unhandledRejection', (reason, promise) => {
      this.handleGlobalError('unhandledRejection', reason, { promise });
    });

    // Manejador de errores de proceso hijo
    process.on('warning', (warning) => {
      this.handleGlobalError('processWarning', warning);
    });
  }

  /**
   * Agrega una política de manejo de errores
   * @param {string} errorCode - Código de error
   * @param {Object} policy - Política de manejo
   */
  addPolicy(errorCode, policy) {
    this.errorPolicies.set(errorCode, {
      ...policy,
      errorCode,
      createdAt: new Date().toISOString()
    });

    loggers.errors.policy_added(errorCode, policy);
  }

  /**
   * Agrega una estrategia de reintento
   * @param {string} name - Nombre de la estrategia
   * @param {Function} strategy - Función de estrategia
   */
  addRetryStrategy(name, strategy) {
    if (typeof strategy !== 'function') {
      throw new Error('Retry strategy must be a function');
    }

    this.retryStrategies.set(name, strategy);
    loggers.errors.retry_strategy_added(name);
  }

  /**
   * Agrega un manejador de errores personalizado
   * @param {string} errorCode - Código de error
   * @param {Function} handler - Función manejadora
   */
  addErrorHandler(errorCode, handler) {
    if (typeof handler !== 'function') {
      throw new Error('Error handler must be a function');
    }

    if (!this.errorHandlers.has(errorCode)) {
      this.errorHandlers.set(errorCode, []);
    }

    this.errorHandlers.get(errorCode).push({
      fn: handler,
      id: this.generateId(),
      createdAt: new Date().toISOString()
    });

    loggers.errors.handler_added(errorCode);
  }

  /**
   * Agrega un manejador global de errores
   * @param {Function} handler - Función manejadora
   */
  addGlobalHandler(handler) {
    if (typeof handler !== 'function') {
      throw new Error('Global handler must be a function');
    }

    this.globalHandlers.push({
      fn: handler,
      id: this.generateId(),
      createdAt: new Date().toISOString()
    });

    loggers.errors.global_handler_added();
  }

  /**
   * Maneja un error de forma centralizada
   * @param {Error|AppError|string} error - Error a manejar
   * @param {Object} context - Contexto del error
   * @returns {Promise<Object>} Resultado del manejo del error
   */
  async handle(error, context = {}) {
    try {
      // Normalizar error
      const normalizedError = this.normalizeError(error);
      
      // Registrar error en historial
      this.addToHistory(normalizedError, context);
      
      // Buscar política de manejo
      const policy = this.getPolicy(normalizedError.code);
      
      // Aplicar manejadores personalizados
      const customResult = await this.applyCustomHandlers(normalizedError, context);
      
      if (customResult.handled) {
        return customResult;
      }

      // Aplicar política de manejo
      const policyResult = await this.applyPolicy(normalizedError, policy, context);
      
      // Notificar sobre el error
      await this.notifyError(normalizedError, context);
      
      // Aplicar manejadores globales
      await this.applyGlobalHandlers(normalizedError, context);
      
      return {
        handled: true,
        error: normalizedError,
        policy: policy,
        result: policyResult,
        context
      };

    } catch (handlingError) {
      loggers.errors.error_handling_failed(handlingError, error);
      throw handlingError;
    }
  }

  /**
   * Normaliza un error a AppError
   * @private
   */
  normalizeError(error) {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      return AppError.internal(error.message, error);
    }

    if (typeof error === 'string') {
      return AppError.internal(error);
    }

    return AppError.internal('Unknown error occurred', error);
  }

  /**
   * Obtiene la política de manejo para un código de error
   * @private
   */
  getPolicy(errorCode) {
    return this.errorPolicies.get(errorCode) || {
      retry: false,
      maxRetries: 0,
      backoff: null,
      timeout: 0,
      recovery: 'log_and_throw'
    };
  }

  /**
   * Aplica manejadores de errores personalizados
   * @private
   */
  async applyCustomHandlers(error, context) {
    const handlers = this.errorHandlers.get(error.code) || [];
    
    for (const handler of handlers) {
      try {
        const result = await handler.fn(error, context);
        if (result && result.handled) {
          loggers.errors.custom_handler_applied(error.code, handler.id);
          return result;
        }
      } catch (handlerError) {
        loggers.errors.custom_handler_failed(handler.id, handlerError);
      }
    }

    return { handled: false };
  }

  /**
   * Aplica la política de manejo de errores
   * @private
   */
  async applyPolicy(error, policy, context) {
    if (!policy.retry || policy.maxRetries <= 0) {
      return this.applyRecovery(error, policy.recovery, context);
    }

    let lastError = error;
    
    for (let attempt = 0; attempt <= policy.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Calcular delay de reintento
          const delay = this.calculateRetryDelay(policy.backoff, attempt);
          await this.sleep(delay);
          
          loggers.errors.retry_attempt(error.code, attempt, delay);
        }

        // Intentar recuperación
        const result = await this.applyRecovery(error, policy.recovery, context);
        
        if (result && result.success) {
          loggers.errors.retry_success(error.code, attempt);
          return result;
        }

      } catch (retryError) {
        lastError = retryError;
        loggers.errors.retry_failed(error.code, attempt, retryError.message);
      }
    }

    throw lastError;
  }

  /**
   * Aplica estrategia de recuperación
   * @private
   */
  async applyRecovery(error, recovery, context) {
    switch (recovery) {
      case 'retry_with_backoff':
        return { success: true, strategy: 'retry_with_backoff' };
      
      case 'increase_timeout':
        return { success: true, strategy: 'increase_timeout' };
      
      case 'renew_token':
        return await this.renewToken(error, context);
      
      case 'check_permissions':
        return { success: false, strategy: 'check_permissions' };
      
      case 'fix_data':
        return { success: false, strategy: 'fix_data' };
      
      case 'fallback':
        return await this.applyFallback(error, context);
      
      case 'wait_and_retry':
        await this.sleep(5000); // Esperar 5 segundos
        return { success: true, strategy: 'wait_and_retry' };
      
      case 'log_and_throw':
      default:
        return { success: false, strategy: 'log_and_throw' };
    }
  }

  /**
   * Renueva token de autenticación
   * @private
   */
  async renewToken(error, context) {
    try {
      // Intentar renovar token
      const OAuthHelper = require('../common/oauthHelper');
      const accountId = context.accountId;
      
      if (accountId) {
        await OAuthHelper.refreshToken(accountId);
        loggers.errors.token_renewed(accountId);
        return { success: true, strategy: 'renew_token' };
      }
      
      return { success: false, strategy: 'renew_token' };
      
    } catch (renewError) {
      loggers.errors.token_renewal_failed(renewError);
      return { success: false, strategy: 'renew_token', error: renewError };
    }
  }

  /**
   * Aplica estrategia de fallback
   * @private
   */
  async applyFallback(error, context) {
    try {
      // Intentar usar datos en caché o valores por defecto
      const cache = require('../utils/cache');
      const cachedData = cache.get(`fallback_${error.code}`);
      
      if (cachedData) {
        loggers.errors.fallback_applied(error.code);
        return { success: true, strategy: 'fallback', data: cachedData };
      }
      
      return { success: false, strategy: 'fallback' };
      
    } catch (fallbackError) {
      loggers.errors.fallback_failed(fallbackError);
      return { success: false, strategy: 'fallback', error: fallbackError };
    }
  }

  /**
   * Calcula el delay de reintento según la estrategia
   * @private
   */
  calculateRetryDelay(strategyName, attempt) {
    const strategy = this.retryStrategies.get(strategyName);
    if (!strategy) {
      return 1000; // Delay por defecto
    }

    return strategy(attempt);
  }

  /**
   * Notifica sobre un error
   * @private
   */
  async notifyError(error, context) {
    try {
      // Enviar notificación
      await NotificationManager.send('security_alert', {
        message: `${error.code}: ${error.message}`,
        errorId: error.id
      }, {
        source: 'error_handler',
        context
      });

      // Emitir evento
      await EventBus.emit('error', {
        error: error.toJSON(),
        context,
        timestamp: new Date().toISOString()
      });

    } catch (notificationError) {
      loggers.errors.notification_failed(notificationError);
    }
  }

  /**
   * Aplica manejadores globales de errores
   * @private
   */
  async applyGlobalHandlers(error, context) {
    for (const handler of this.globalHandlers) {
      try {
        await handler.fn(error, context);
      } catch (handlerError) {
        loggers.errors.global_handler_failed(handler.id, handlerError);
      }
    }
  }

  /**
   * Maneja errores globales del proceso
   * @private
   */
  handleGlobalError(type, error, additionalContext = {}) {
    const normalizedError = this.normalizeError(error);
    
    loggers.errors.global_error(type, normalizedError, additionalContext);
    
    // Enviar notificación crítica
    NotificationManager.send('security_alert', {
      message: `Global error: ${type} - ${normalizedError.message}`,
      errorId: normalizedError.id
    });

    // Decidir si terminar el proceso
    if (type === 'uncaughtException') {
      loggers.app.error('Uncaught exception, shutting down...');
      process.exit(1);
    }
  }

  /**
   * Obtiene estadísticas de errores
   * @returns {Object} Estadísticas de errores
   */
  getStats() {
    const stats = {
      totalErrors: this.errorHistory.length,
      byCode: {},
      byHour: {},
      policiesCount: this.errorPolicies.size,
      strategiesCount: this.retryStrategies.size,
      handlersCount: this.errorHandlers.size,
      globalHandlersCount: this.globalHandlers.length
    };

    for (const record of this.errorHistory) {
      // Contar por código
      stats.byCode[record.error.code] = (stats.byCode[record.error.code] || 0) + 1;
      
      // Contar por hora
      const hour = new Date(record.timestamp).getHours();
      stats.byHour[hour] = (stats.byHour[hour] || 0) + 1;
    }

    return stats;
  }

  /**
   * Obtiene el historial de errores
   * @param {number} limit - Límite de resultados
   * @returns {Array} Array de errores
   */
  getErrorHistory(limit = 100) {
    const end = Math.max(0, this.errorHistory.length - limit);
    return this.errorHistory.slice(end);
  }

  /**
   * Limpia el historial de errores
   * @param {number} keep - Cantidad a mantener
   */
  clearHistory(keep = 0) {
    if (keep === 0) {
      this.errorHistory = [];
    } else {
      this.errorHistory = this.errorHistory.slice(-keep);
    }
    
    loggers.errors.history_cleared(keep);
  }

  /**
   * Agrega un error al historial
   * @private
   */
  addToHistory(error, context) {
    this.errorHistory.push({
      error: error.toJSON(),
      context,
      timestamp: new Date().toISOString()
    });

    // Mantener tamaño máximo del historial
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }
  }

  /**
   * Genera un ID único
   * @private
   */
  generateId() {
    return `handler_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Utilidad para dormir
   * @private
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Exportar instancia única (Singleton)
module.exports = new ErrorHandler();