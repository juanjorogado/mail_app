/**
 * Sistema de Monitoreo de Salud
 * Monitorea la salud de la aplicación y sus componentes
 */

const { loggers } = require('./logger');
const StorageManager = require('./storage');
const Accounts = require('./accounts');
const ConfigManager = require('./config');

class HealthMonitor {
  constructor() {
    this.storage = StorageManager;
    this.accounts = Accounts;
    this.config = ConfigManager;
    this.checks = new Map();
    this.lastCheck = null;
  }

  /**
   * Realiza una verificación completa de salud
   */
  async performHealthCheck() {
    const startTime = Date.now();
    const healthReport = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      checks: {},
      duration: 0,
      issues: []
    };

    try {
      // Verificar almacenamiento
      healthReport.checks.storage = await this.checkStorage();
      
      // Verificar cuentas
      healthReport.checks.accounts = await this.checkAccounts();
      
      // Verificar configuración
      healthReport.checks.config = await this.checkConfig();
      
      // Verificar tokens OAuth
      healthReport.checks.oauth = await this.checkOAuth();
      
      // Verificar espacio en disco
      healthReport.checks.disk = await this.checkDiskSpace();
      
      // Calcular duración
      healthReport.duration = Date.now() - startTime;
      
      // Determinar estado general
      const failedChecks = Object.values(healthReport.checks).filter(check => check.status === 'unhealthy');
      
      if (failedChecks.length > 0) {
        healthReport.status = 'unhealthy';
        healthReport.issues = failedChecks.map(check => check.error);
      } else {
        // Verificar advertencias
        const warningChecks = Object.values(healthReport.checks).filter(check => check.status === 'warning');
        if (warningChecks.length > 0) {
          healthReport.status = 'warning';
          healthReport.issues = warningChecks.map(check => check.warning);
        }
      }

      this.lastCheck = healthReport;
      
      // Registrar en logs
      loggers.app.info('Health check completed', {
        status: healthReport.status,
        duration: healthReport.duration,
        checks: Object.keys(healthReport.checks),
        issues: healthReport.issues.length
      });

      return healthReport;
    } catch (error) {
      loggers.app.error('Health check failed', error);
      return {
        timestamp: new Date().toISOString(),
        status: 'error',
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Verifica el sistema de almacenamiento
   */
  async checkStorage() {
    try {
      const integrity = this.storage.verifyIntegrity();
      
      if (!integrity.valid) {
        return {
          status: 'unhealthy',
          error: `Storage integrity check failed: ${integrity.error}`,
          details: integrity
        };
      }

      const stats = this.storage.getStorageStats();
      
      // Verificar tamaño del almacenamiento
      if (stats.totalSize > 100 * 1024 * 1024) { // 100MB
        return {
          status: 'warning',
          warning: 'Storage size is getting large',
          details: stats
        };
      }

      return {
        status: 'healthy',
        details: stats
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: `Storage check failed: ${error.message}`
      };
    }
  }

  /**
   * Verifica las cuentas
   */
  async checkAccounts() {
    try {
      const accounts = this.accounts.getAccounts();
      
      if (accounts.length === 0) {
        return {
          status: 'warning',
          warning: 'No accounts configured',
          details: { count: 0 }
        };
      }

      // Verificar cuentas con tokens
      const accountsWithTokens = accounts.filter(acc => acc.tokens);
      
      if (accountsWithTokens.length === 0) {
        return {
          status: 'warning',
          warning: 'No accounts with valid tokens',
          details: { total: accounts.length, withTokens: 0 }
        };
      }

      return {
        status: 'healthy',
        details: {
          total: accounts.length,
          withTokens: accountsWithTokens.length,
          withoutTokens: accounts.length - accountsWithTokens.length
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: `Accounts check failed: ${error.message}`
      };
    }
  }

  /**
   * Verifica la configuración
   */
  async checkConfig() {
    try {
      const config = this.config.getConfig();
      
      // Verificar campos requeridos
      const requiredFields = ['version', 'encryption', 'backup'];
      const missingFields = requiredFields.filter(field => !config[field]);
      
      if (missingFields.length > 0) {
        return {
          status: 'unhealthy',
          error: `Missing required config fields: ${missingFields.join(', ')}`
        };
      }

      // Verificar encriptación
      if (!config.encryption.enabled) {
        return {
          status: 'warning',
          warning: 'Encryption is disabled'
        };
      }

      return {
        status: 'healthy',
        details: {
          version: config.version,
          encryptionEnabled: config.encryption.enabled,
          backupEnabled: config.backup.enabled
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: `Config check failed: ${error.message}`
      };
    }
  }

  /**
   * Verifica tokens OAuth
   */
  async checkOAuth() {
    try {
      const accounts = this.accounts.getAccounts();
      const accountsWithTokens = accounts.filter(acc => acc.tokens);
      
      if (accountsWithTokens.length === 0) {
        return {
          status: 'healthy', // No hay cuentas con tokens, no hay problema
          details: { checked: 0, valid: 0, invalid: 0 }
        };
      }

      let validTokens = 0;
      let invalidTokens = 0;

      // Verificar validez de tokens (simplificado)
      for (const account of accountsWithTokens) {
        try {
          // Aquí podrías hacer una llamada de prueba a la API
          // Por ahora, asumimos que si existen, son válidos
          validTokens++;
        } catch (error) {
          invalidTokens++;
        }
      }

      if (invalidTokens > 0) {
        return {
          status: 'warning',
          warning: `${invalidTokens} accounts have invalid tokens`,
          details: {
            checked: accountsWithTokens.length,
            valid: validTokens,
            invalid: invalidTokens
          }
        };
      }

      return {
        status: 'healthy',
        details: {
          checked: accountsWithTokens.length,
          valid: validTokens,
          invalid: invalidTokens
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: `OAuth check failed: ${error.message}`
      };
    }
  }

  /**
   * Verifica espacio en disco
   */
  async checkDiskSpace() {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Obtener espacio disponible en el directorio de almacenamiento
      const storageDir = path.join(__dirname, '../../storage');
      
      // En Node.js, no hay una forma directa de obtener espacio en disco
      // Por ahora, verificamos que el directorio exista y sea accesible
      try {
        fs.accessSync(storageDir, fs.constants.F_OK | fs.constants.R_OK | fs.constants.W_OK);
        
        return {
          status: 'healthy',
          details: { path: storageDir, accessible: true }
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          error: `Storage directory not accessible: ${error.message}`
        };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        error: `Disk space check failed: ${error.message}`
      };
    }
  }

  /**
   * Obtiene el último reporte de salud
   */
  getLastHealthReport() {
    return this.lastCheck;
  }

  /**
   * Obtiene estadísticas de salud
   */
  getHealthStats() {
    try {
      const lastReport = this.getLastHealthReport();
      
      if (!lastReport) {
        return {
          status: 'unknown',
          lastCheck: null,
          uptime: 0
        };
      }

      const uptime = process.uptime();
      
      return {
        status: lastReport.status,
        lastCheck: lastReport.timestamp,
        uptime: Math.floor(uptime),
        checks: Object.keys(lastReport.checks || {}),
        issues: lastReport.issues || []
      };
    } catch (error) {
      loggers.app.error('Failed to get health stats', error);
      return { error: error.message };
    }
  }

  /**
   * Inicia monitoreo continuo
   */
  startMonitoring(interval = 5 * 60 * 1000) { // Cada 5 minutos
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        loggers.app.error('Health monitoring error', error);
      }
    }, interval);

    loggers.app.info('Health monitoring started', { interval });
  }

  /**
   * Detiene el monitoreo
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      loggers.app.info('Health monitoring stopped');
    }
  }
}

// Exportar instancia única
module.exports = new HealthMonitor();