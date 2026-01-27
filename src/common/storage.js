/**
 * Sistema de Almacenamiento Persistente
 * Gestiona el almacenamiento de cuentas, tokens y configuración
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class StorageManager {
  constructor() {
    this.storageDir = path.join(__dirname, '../../storage');
    this.accountsFile = path.join(this.storageDir, 'accounts.json');
    this.configFile = path.join(this.storageDir, 'config.json');
    
    // Crear directorio de almacenamiento si no existe
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
    
    // Inicializar archivos si no existen
    this.initializeStorage();
  }

  /**
   * Inicializa los archivos de almacenamiento
   */
  initializeStorage() {
    try {
      // Inicializar cuentas
      if (!fs.existsSync(this.accountsFile)) {
        this.saveAccounts([]);
      }
      
      // Inicializar configuración
      if (!fs.existsSync(this.configFile)) {
        this.saveConfig({
          version: '1.0.0',
          encryption: {
            enabled: true,
            algorithm: 'aes-256-gcm'
          },
          backup: {
            enabled: true,
            interval: 24 * 60 * 60 * 1000 // 24 horas
          }
        });
      }
    } catch (error) {
      console.error('Error al inicializar almacenamiento:', error);
      throw new Error('No se pudo inicializar el sistema de almacenamiento');
    }
  }

  /**
   * Cifra datos sensibles
   */
  encrypt(data) {
    try {
      const key = this.getEncryptionKey();
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      throw new Error('Error al cifrar datos: ' + error.message);
    }
  }

  /**
   * Descifra datos sensibles
   */
  decrypt(encryptedData) {
    try {
      const key = this.getEncryptionKey();
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const authTag = Buffer.from(encryptedData.authTag, 'hex');
      
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      throw new Error('Error al descifrar datos: ' + error.message);
    }
  }

  /**
   * Obtiene la clave de encriptación
   */
  getEncryptionKey() {
    // En un entorno real, esto debería venir de una variable de entorno segura
    const secret = process.env.APP_SECRET || 'default-secret-key-for-development-only';
    return crypto.scryptSync(secret, 'salt', 32);
  }

  /**
   * Guarda cuentas encriptadas
   */
  saveAccounts(accounts) {
    try {
      const encryptedAccounts = accounts.map(account => ({
        ...account,
        tokens: account.tokens ? this.encrypt(account.tokens) : null
      }));
      
      fs.writeFileSync(this.accountsFile, JSON.stringify(encryptedAccounts, null, 2));
      this.createBackup('accounts');
      
      return true;
    } catch (error) {
      console.error('Error al guardar cuentas:', error);
      throw new Error('No se pudieron guardar las cuentas');
    }
  }

  /**
   * Carga cuentas desencriptadas
   */
  loadAccounts() {
    try {
      if (!fs.existsSync(this.accountsFile)) {
        return [];
      }
      
      const data = fs.readFileSync(this.accountsFile, 'utf8');
      const encryptedAccounts = JSON.parse(data);
      
      return encryptedAccounts.map(account => ({
        ...account,
        tokens: account.tokens ? this.decrypt(account.tokens) : null
      }));
    } catch (error) {
      console.error('Error al cargar cuentas:', error);
      return [];
    }
  }

  /**
   * Guarda una cuenta individual
   */
  saveAccount(account) {
    const accounts = this.loadAccounts();
    const existingIndex = accounts.findIndex(acc => acc.id === account.id);
    
    if (existingIndex > -1) {
      accounts[existingIndex] = account;
    } else {
      accounts.push(account);
    }
    
    return this.saveAccounts(accounts);
  }

  /**
   * Elimina una cuenta
   */
  removeAccount(accountId) {
    const accounts = this.loadAccounts();
    const filteredAccounts = accounts.filter(acc => acc.id !== accountId);
    
    return this.saveAccounts(filteredAccounts);
  }

  /**
   * Actualiza tokens de una cuenta
   */
  updateAccountTokens(accountId, newTokens) {
    const accounts = this.loadAccounts();
    const accountIndex = accounts.findIndex(acc => acc.id === accountId);
    
    if (accountIndex === -1) {
      throw new Error('Cuenta no encontrada');
    }
    
    accounts[accountIndex].tokens = newTokens;
    accounts[accountIndex].lastUpdated = new Date().toISOString();
    
    return this.saveAccount(accounts[accountIndex]);
  }

  /**
   * Guarda configuración
   */
  saveConfig(config) {
    try {
      fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2));
      return true;
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      throw new Error('No se pudo guardar la configuración');
    }
  }

  /**
   * Carga configuración
   */
  loadConfig() {
    try {
      if (!fs.existsSync(this.configFile)) {
        return this.getDefaultConfig();
      }
      
      const data = fs.readFileSync(this.configFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error al cargar configuración:', error);
      return this.getDefaultConfig();
    }
  }

  /**
   * Configuración por defecto
   */
  getDefaultConfig() {
    return {
      version: '1.0.0',
      encryption: {
        enabled: true,
        algorithm: 'aes-256-gcm'
      },
      backup: {
        enabled: true,
        interval: 24 * 60 * 60 * 1000 // 24 horas
      }
    };
  }

  /**
   * Crea backup de los datos
   */
  createBackup(type = 'all') {
    try {
      const backupDir = path.join(this.storageDir, 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(backupDir, `${type}_${timestamp}.json`);
      
      if (type === 'accounts' || type === 'all') {
        const accounts = this.loadAccounts();
        fs.writeFileSync(backupFile, JSON.stringify(accounts, null, 2));
      }
      
      // Mantener solo los últimos 10 backups
      this.cleanupBackups(backupDir);
      
      return true;
    } catch (error) {
      console.error('Error al crear backup:', error);
      return false;
    }
  }

  /**
   * Limpia backups antiguos
   */
  cleanupBackups(backupDir) {
    try {
      const files = fs.readdirSync(backupDir);
      const backupFiles = files
        .filter(file => file.endsWith('.json'))
        .map(file => ({
          name: file,
          path: path.join(backupDir, file),
          mtime: fs.statSync(path.join(backupDir, file)).mtime
        }))
        .sort((a, b) => b.mtime - a.mtime);
      
      // Eliminar backups antiguos (mantener últimos 10)
      if (backupFiles.length > 10) {
        const filesToDelete = backupFiles.slice(10);
        filesToDelete.forEach(file => {
          fs.unlinkSync(file.path);
        });
      }
    } catch (error) {
      console.error('Error al limpiar backups:', error);
    }
  }

  /**
   * Restaura desde backup
   */
  restoreFromBackup(backupFile) {
    try {
      if (!fs.existsSync(backupFile)) {
        throw new Error('Archivo de backup no encontrado');
      }
      
      const data = fs.readFileSync(backupFile, 'utf8');
      const accounts = JSON.parse(data);
      
      return this.saveAccounts(accounts);
    } catch (error) {
      console.error('Error al restaurar desde backup:', error);
      throw new Error('No se pudo restaurar desde el backup');
    }
  }

  /**
   * Verifica integridad de los datos
   */
  verifyIntegrity() {
    try {
      const accounts = this.loadAccounts();
      
      // Verificar que todas las cuentas tengan ID
      const invalidAccounts = accounts.filter(acc => !acc.id);
      if (invalidAccounts.length > 0) {
        throw new Error(`Cuentas inválidas encontradas: ${invalidAccounts.length}`);
      }
      
      // Verificar tokens encriptados
      const accountsWithTokens = accounts.filter(acc => acc.tokens);
      accountsWithTokens.forEach(acc => {
        if (!acc.tokens.encrypted || !acc.tokens.iv || !acc.tokens.authTag) {
          throw new Error(`Tokens mal formados para la cuenta: ${acc.id}`);
        }
      });
      
      return {
        valid: true,
        accountsCount: accounts.length,
        accountsWithTokens: accountsWithTokens.length
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Obtiene estadísticas del almacenamiento
   */
  getStorageStats() {
    try {
      const accounts = this.loadAccounts();
      const config = this.loadConfig();
      
      const accountsSize = fs.statSync(this.accountsFile).size;
      const configSize = fs.statSync(this.configFile).size;
      
      return {
        accountsCount: accounts.length,
        accountsSize: accountsSize,
        configSize: configSize,
        totalSize: accountsSize + configSize,
        encryptionEnabled: config.encryption?.enabled || false,
        backupEnabled: config.backup?.enabled || false
      };
    } catch (error) {
      return {
        error: error.message
      };
    }
  }
}

// Exportar instancia única
module.exports = new StorageManager();