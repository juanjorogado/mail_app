/**
 * AccountManager - Gestión de cuentas del lado del renderer
 * Maneja conexión, desconexión y estado de cuentas
 */

import { MESSAGES, TIMEOUTS } from '../config/textConstants.js';

export class AccountManager {
  constructor(uiManager) {
    this.uiManager = uiManager;
    this.currentAccount = null;
    this.accounts = [];
    this.isAuthenticating = false;
    this.authTimeout = null;
    this.AUTH_TIMEOUT_MS = 120000; // 2 minutes timeout for authentication
  }

  /**
   * Inicializa el gestor de cuentas
   */
  async initialize() {
    await this.loadExistingAccounts();
  }

  /**
   * Carga cuentas existentes al iniciar
   */
  async loadExistingAccounts() {
    try {
      const response = await window.electronAPI.listAccounts();
      this.accounts = response?.data || [];

      if (this.accounts.length > 0) {
        const firstAccount = this.accounts[0];
        await this.setActiveAccount(firstAccount);
        this.uiManager.showMainApp();
        // Emitir evento para que MailApp cambie de pantalla
        this.emitAccountConnected(firstAccount);
        return true;
      } else {
        this.uiManager.showOnboarding();
        return false;
      }
    } catch (error) {
      console.error('Error loading existing accounts:', error);
      this.uiManager.showNotification(
        'Error al cargar cuentas existentes',
        'error',
        TIMEOUTS.NOTIFICATION_LONG
      );
      return false;
    }
  }

  /**
   * Conecta una nueva cuenta de Gmail
   */
  async connectGmailAccount() {
    if (this.isAuthenticating) {
      this.handleConnectionError('Authentication already in progress. Please wait.');
      return { success: false, error: 'Authentication already in progress. Please wait.' };
    }

    this.isAuthenticating = true;

    try {
      this.uiManager.showNotification(
        'Iniciando conexión con Gmail...',
        'info',
        TIMEOUTS.NOTIFICATION_SHORT
      );

      console.log('Calling window.electronAPI.addGmailAccount()...');
      const response = await window.electronAPI.addGmailAccount();
      console.log('addGmailAccount response:', response);

      if (response.success && response.account) {
        console.log('Account connection successful, handling connected account');
        await this.handleAccountConnected(response.account);
        return { success: true, account: response.account };
      } else {
        console.log('Account connection failed:', response.error);
        this.handleConnectionError(response.error);
        return { success: false, error: response.error };
      }
    } catch (error) {
      console.error('Error connecting Gmail account:', error);
      this.handleConnectionError(error.message);
      return { success: false, error: error.message };
    } finally {
      this.isAuthenticating = false;
    }
  }

  /**
   * Maneja la conexión exitosa de una cuenta
   */
  async handleAccountConnected(account) {
    this.currentAccount = account;
    
    // Agregar a la lista de cuentas si no existe
    if (!this.accounts.find(acc => acc.id === account.id)) {
      this.accounts.push(account);
    }

    // Actualizar UI
    this.uiManager.updateCurrentAccount(account);
    this.uiManager.showMainApp();
    
    this.uiManager.showNotification(
      MESSAGES.NOTIFICATIONS.ACCOUNT_CONNECTED,
      'success',
      TIMEOUTS.NOTIFICATION_DEFAULT
    );

    // Emitir evento de cuenta conectada
    this.emitAccountConnected(account);
  }

  /**
   * Maneja errores de conexión
   */
  handleConnectionError(error) {
    console.error('Account connection error:', error);
    
    let errorMessage = MESSAGES.NOTIFICATIONS.ACCOUNT_CONNECT_ERROR;
    
    // Mensajes específicos para errores comunes
    if (error) {
      const errorLower = error.toLowerCase();
      
      if (errorLower.includes('cancelled') || errorLower.includes('closed')) {
        errorMessage = 'Conexión cancelada por el usuario';
      } else if (errorLower.includes('network') || errorLower.includes('internet')) {
        errorMessage = 'Error de conexión. Verifica tu acceso a internet.';
      } else if (errorLower.includes('auth')) {
        errorMessage = 'Error de autenticación. Por favor intenta de nuevo.';
      }
    }

    this.uiManager.showNotification(
      errorMessage,
      'error',
      TIMEOUTS.NOTIFICATION_LONG
    );
  }

  /**
   * Desconecta la cuenta actual
   */
  async disconnectCurrentAccount() {
    if (!this.currentAccount) {
      this.uiManager.showNotification(
        'No hay sesión activa para cerrar.',
        'warning',
        TIMEOUTS.NOTIFICATION_DEFAULT
      );
      return { success: false, error: 'No active account' };
    }

    // Confirmar desconexión
    const confirmed = confirm(MESSAGES.NOTIFICATIONS.LOGOUT_CONFIRM);
    if (!confirmed) {
      return { success: false, error: 'User cancelled' };
    }

    try {
      const response = await window.electronAPI.removeAccount(this.currentAccount.id);

      if (response.success) {
        await this.handleAccountDisconnected();
        return { success: true };
      } else {
        this.handleDisconnectionError(response.error);
        return { success: false, error: response.error };
      }
    } catch (error) {
      console.error('Error disconnecting account:', error);
      this.handleDisconnectionError(error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Maneja la desconexión exitosa
   */
  async handleAccountDisconnected() {
    // Remover cuenta de la lista
    this.accounts = this.accounts.filter(acc => acc.id !== this.currentAccount.id);
    
    // Limpiar estado
    this.currentAccount = null;
    this.uiManager.clearCurrentAccount();
    this.uiManager.clearMessageList();
    this.uiManager.clearMessageDetail();

    // Resetear UI
    this.uiManager.showOnboarding();

    this.uiManager.showNotification(
      MESSAGES.NOTIFICATIONS.LOGOUT_SUCCESS,
      'success',
      TIMEOUTS.NOTIFICATION_DEFAULT
    );

    // Emitir evento de cuenta desconectada
    this.emitAccountDisconnected();
  }

  /**
   * Maneja errores de desconexión
   */
  handleDisconnectionError(error) {
    console.error('Account disconnection error:', error);
    
    this.uiManager.showNotification(
      `${MESSAGES.NOTIFICATIONS.LOGOUT_ERROR}: ${error}`,
      'error',
      TIMEOUTS.NOTIFICATION_LONG
    );
  }

  /**
   * Establece una cuenta como activa
   */
  async setActiveAccount(account) {
    if (!account) return;

    this.currentAccount = account;
    this.uiManager.updateCurrentAccount(account);
    
    // Emitir evento de cambio de cuenta
    this.emitAccountChanged(account);
  }

  /**
   * Obtiene la cuenta actual
   */
  getCurrentAccount() {
    return this.currentAccount;
  }

  /**
   * Obtiene el ID de la cuenta actual
   */
  getCurrentAccountId() {
    return this.currentAccount?.id || null;
  }

  /**
   * Verifica si hay una cuenta activa
   */
  hasActiveAccount() {
    return !!this.currentAccount;
  }

  /**
   * Obtiene todas las cuentas
   */
  getAllAccounts() {
    return [...this.accounts];
  }

  /**
   * Busca una cuenta por ID
   */
  findAccountById(accountId) {
    return this.accounts.find(acc => acc.id === accountId);
  }

  /**
   * Actualiza información de una cuenta
   */
  updateAccount(accountId, updates) {
    const accountIndex = this.accounts.findIndex(acc => acc.id === accountId);
    
    if (accountIndex !== -1) {
      this.accounts[accountIndex] = { ...this.accounts[accountIndex], ...updates };
      
      // Si es la cuenta actual, actualizarla también
      if (this.currentAccount && this.currentAccount.id === accountId) {
        this.currentAccount = { ...this.currentAccount, ...updates };
        this.uiManager.updateCurrentAccount(this.currentAccount);
      }
      
      // Emitir evento de actualización
      this.emitAccountUpdated(this.accounts[accountIndex]);
    }
  }

  /**
   * Emite evento de cuenta conectada
   */
  emitAccountConnected(account) {
    const event = new CustomEvent('accountConnected', {
      detail: { account }
    });
    document.dispatchEvent(event);
  }

  /**
   * Emite evento de cuenta desconectada
   */
  emitAccountDisconnected() {
    const event = new CustomEvent('accountDisconnected', {
      detail: {}
    });
    document.dispatchEvent(event);
  }

  /**
   * Emite evento de cambio de cuenta
   */
  emitAccountChanged(account) {
    const event = new CustomEvent('accountChanged', {
      detail: { account }
    });
    document.dispatchEvent(event);
  }

  /**
   * Emite evento de actualización de cuenta
   */
  emitAccountUpdated(account) {
    const event = new CustomEvent('accountUpdated', {
      detail: { account }
    });
    document.dispatchEvent(event);
  }

  /**
   * Verifica si una cuenta puede realizar acciones
   */
  canPerformAction() {
    return this.hasActiveAccount() && this.getCurrentAccountId();
  }

  /**
   * Obtiene información para logging
   */
  getAccountInfo() {
    return {
      hasActiveAccount: this.hasActiveAccount(),
      currentAccountId: this.getCurrentAccountId(),
      totalAccounts: this.accounts.length,
      currentAccountEmail: this.currentAccount?.email || null
    };
  }

  /**
   * Limpia recursos
   */
  cleanup() {
    this.currentAccount = null;
    this.accounts = [];
  }
}
