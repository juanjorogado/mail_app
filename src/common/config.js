git remote add origin https://github.com/juanjorogado/mail_app.git
    git branch -M main
git push -u origin main/**
 * Sistema de Configuración Centralizado
 * Gestiona la configuración de la aplicación con validación y entornos
 */

const StorageManager = require('./storage');
const { loggers } = require('./logger');

class ConfigManager {
  constructor() {
    this.storage = StorageManager;
    this.config = null;
    this.environment = process.env.NODE_ENV || 'development';
  }

  /**
   * Obtiene la configuración actual
   */
  getConfig() {
    if (!this.config) {
      this.config = this.loadConfig();
    }
    return this.config;
  }

  /**
   * Carga la configuración desde almacenamiento
   */
  loadConfig() {
    try {
      const config = this.storage.loadConfig();
      this.validateConfig(config);
      this.config = config;
      
      loggers.app.info('Configuration loaded', { 
        environment: this.environment,
        encryptionEnabled: config.encryption?.enabled,
        backupEnabled: config.backup?.enabled
      });
      
      return config;
    } catch (error) {
      loggers.app.error('Failed to load configuration', error);
      return this.getDefaultConfig();
    }
  }

  /**
   * Guarda la configuración
   */
  saveConfig(config) {
    try {
      this.validateConfig(config);
      const success = this.storage.saveConfig(config);
      
      if (success) {
        this.config = config;
        loggers.app.info('Configuration saved', { config });
        return true;
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (error) {
      loggers.app.error('Failed to save configuration', error);
      throw error;
    }
  }

  /**
   * Valida la configuración
   */
  validateConfig(config) {
    const requiredFields = ['version', 'encryption', 'backup'];
    
    for (const field of requiredFields) {
      if (!config[field]) {
        throw new Error(`Missing required configuration field: ${field}`);
      }
    }

    // Validar encryption
    if (typeof config.encryption.enabled !== 'boolean') {
      throw new Error('Invalid encryption.enabled value');
    }

    if (!['aes-256-gcm'].includes(config.encryption.algorithm)) {
      throw new Error('Invalid encryption algorithm');
    }

    // Validar backup
    if (typeof config.backup.enabled !== 'boolean') {
      throw new Error('Invalid backup.enabled value');
    }

    if (typeof config.backup.interval !== 'number' || config.backup.interval <= 0) {
      throw new Error('Invalid backup.interval value');
    }

    return true;
  }

  /**
   * Obtiene la configuración por defecto
   */
  getDefaultConfig() {
    return {
      version: '1.0.0',
      environment: this.environment,
      encryption: {
        enabled: true,
        algorithm: 'aes-256-gcm'
      },
      backup: {
        enabled: true,
        interval: 24 * 60 * 60 * 1000 // 24 horas
      },
      api: {
        timeout: 30000, // 30 segundos
        retryAttempts: 3,
        maxResults: 10
      },
      security: {
        maxLoginAttempts: 5,
        lockoutDuration: 15 * 60 * 1000, // 15 minutos
        sessionTimeout: 8 * 60 * 60 * 1000 // 8 horas
      },
      logging: {
        level: this.environment === 'production' ? 'info' : 'debug',
        maxFileSize: 10 * 1024 * 1024, // 10MB
        maxFiles: 10
      }
    };
  }

  /**
   * Obtiene configuración para APIs específicas
   */
  getAPIConfig() {
    const config = this.getConfig();
    return {
      timeout: config.api?.timeout || 30000,
      retryAttempts: config.api?.retryAttempts || 3,
      maxResults: config.api?.maxResults || 10
    };
  }

  /**
   * Obtiene configuración de seguridad
   */
  getSecurityConfig() {
    const config = this.getConfig();
    return {
      maxLoginAttempts: config.security?.maxLoginAttempts || 5,
      lockoutDuration: config.security?.lockoutDuration || 15 * 60 * 1000,
      sessionTimeout: config.security?.sessionTimeout || 8 * 60 * 60 * 1000
    };
  }

  /**
   * Obtiene configuración de encriptación
   */
  getEncryptionConfig() {
    const config = this.getConfig();
    return {
      enabled: config.encryption?.enabled || true,
      algorithm: config.encryption?.algorithm || 'aes-256-gcm'
    };
  }

  /**
   * Obtiene configuración de backup
   */
  getBackupConfig() {
    const config = this.getConfig();
    return {
      enabled: config.backup?.enabled || true,
      interval: config.backup?.interval || 24 * 60 * 60 * 1000
    };
  }

  /**
   * Actualiza configuración parcial
   */
  updateConfig(updates) {
    try {
      const currentConfig = this.getConfig();
      const newConfig = { ...currentConfig, ...updates };
      
      return this.saveConfig(newConfig);
    } catch (error) {
      loggers.app.error('Failed to update configuration', error);
      throw error;
    }
  }

  /**
   * Reinicia la configuración a valores por defecto
   */
  resetConfig() {
    try {
      const defaultConfig = this.getDefaultConfig();
      return this.saveConfig(defaultConfig);
    } catch (error) {
      loggers.app.error('Failed to reset configuration', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de configuración
   */
  getConfigStats() {
    try {
      const config = this.getConfig();
      const storageStats = this.storage.getStorageStats();
      
      return {
        ...storageStats,
        configVersion: config.version,
        environment: this.environment,
        encryptionEnabled: config.encryption?.enabled,
        backupEnabled: config.backup?.enabled,
        apiTimeout: config.api?.timeout,
        maxLoginAttempts: config.security?.maxLoginAttempts
      };
    } catch (error) {
      loggers.app.error('Failed to get configuration stats', error);
      return { error: error.message };
    }
  }
}

// Exportar instancia única
module.exports = new ConfigManager();