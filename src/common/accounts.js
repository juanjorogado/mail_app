/**
 * Sistema de Gestión de Cuentas
 * Gestiona cuentas de usuario con persistencia y encriptación
 */

const StorageManager = require('./storage');
const { loggers } = require('./logger');

class AccountManager {
  constructor() {
    this.storage = StorageManager;
  }

  /**
   * Obtiene todas las cuentas almacenadas
   */
  getAccounts() {
    try {
      const accounts = this.storage.loadAccounts();
      loggers.accounts.info('Cuentas cargadas', { count: accounts.length });
      return accounts;
    } catch (error) {
      loggers.accounts.error('getAccounts', error);
      return [];
    }
  }

  /**
   * Agrega una nueva cuenta
   */
  addAccount(account) {
    try {
      if (!account || !account.id) {
        throw new Error('Account ID is required');
      }

      const accounts = this.getAccounts();
      const existingAccount = accounts.find(acc => acc.id === account.id);
      
      if (existingAccount) {
        throw new Error('Account already exists');
      }

      // Validar estructura básica de la cuenta
      const validatedAccount = this.validateAccount(account);
      
      // Guardar cuenta
      const success = this.storage.saveAccount(validatedAccount);
      
      if (success) {
        loggers.accounts.created(account.id, { email: account.email });
        return validatedAccount;
      } else {
        throw new Error('Failed to save account');
      }
    } catch (error) {
      loggers.accounts.error('addAccount', error, { accountId: account?.id });
      throw error;
    }
  }

  /**
   * Elimina una cuenta
   */
  removeAccount(accountId) {
    try {
      if (!accountId) {
        throw new Error('Account ID is required');
      }

      const accounts = this.getAccounts();
      const accountToRemove = accounts.find(acc => acc.id === accountId);
      
      if (!accountToRemove) {
        throw new Error('Account not found');
      }

      const success = this.storage.removeAccount(accountId);
      
      if (success) {
        loggers.accounts.removed(accountId, { email: accountToRemove.email });
        return accountToRemove;
      } else {
        throw new Error('Failed to remove account');
      }
    } catch (error) {
      loggers.accounts.error('removeAccount', error, { accountId });
      throw error;
    }
  }

  /**
   * Actualiza tokens de una cuenta
   */
  updateAccountTokens(accountId, newTokens) {
    try {
      if (!accountId || !newTokens) {
        throw new Error('Account ID and tokens are required');
      }

      const success = this.storage.updateAccountTokens(accountId, newTokens);
      
      if (success) {
        loggers.auth.token_refresh(accountId);
        return true;
      } else {
        throw new Error('Failed to update tokens');
      }
    } catch (error) {
      loggers.accounts.error('updateAccountTokens', error, { accountId });
      throw error;
    }
  }

  /**
   * Valida la estructura de una cuenta
   */
  validateAccount(account) {
    const requiredFields = ['id', 'email'];
    
    for (const field of requiredFields) {
      if (!account[field] || typeof account[field] !== 'string') {
        throw new Error(`Invalid ${field}: ${account[field]}`);
      }
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(account.email)) {
      throw new Error(`Invalid email format: ${account.email}`);
    }

    return {
      ...account,
      createdAt: account.createdAt || new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Verifica la integridad de las cuentas
   */
  verifyAccountsIntegrity() {
    try {
      return this.storage.verifyIntegrity();
    } catch (error) {
      loggers.accounts.error('verifyAccountsIntegrity', error);
      return { valid: false, error: error.message };
    }
  }

  /**
   * Obtiene estadísticas del sistema de cuentas
   */
  getAccountsStats() {
    try {
      const stats = this.storage.getStorageStats();
      return {
        ...stats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      loggers.accounts.error('getAccountsStats', error);
      return { error: error.message };
    }
  }
}

// Exportar instancia única
module.exports = new AccountManager();
