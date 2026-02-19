/**
 * Main Renderer - Punto de entrada coordinador modular
 * Reemplaza al monolítico script.js con arquitectura modular
 */

import { UIManager } from './modules/UIManager.js';
import { EmailRenderer } from './modules/EmailRenderer.js';
import { SearchManager } from './modules/SearchManager.js';
import { AccountManager } from './modules/AccountManager.js';
import { EventHandler } from './modules/EventHandler.js';

/**
 * Clase principal que coordina todos los módulos
 */
class MailApp {
  constructor() {
    this.uiManager = null;
    this.emailRenderer = null;
    this.searchManager = null;
    this.accountManager = null;
    this.eventHandler = null;
    this.isInitialized = false;
    this.isConnecting = false;
    this.connectButton = null;
  }

  /**
   * Inicializa la aplicación
   */
  async initialize() {
    try {
      console.log('Initializing Mail App...');

      // Inicializar módulos
      await this.initializeModules();

      // Configurar event listeners
      this.setupEventListeners();

      // Escuchar evento de cuenta conectada
      document.addEventListener('accountConnected', () => {
        console.log('accountConnected event received');
        this.showMainApp();
      });

      // Inicializar gestor de cuentas (verificar si hay cuentas existentes)
      await this.accountManager.initialize();

      this.isInitialized = true;
      console.log('Mail App initialized successfully');

    } catch (error) {
      console.error('Error initializing Mail App:', error);
    }
  }

  /**
   * Configura event listeners en elementos del DOM
   */
  setupEventListeners() {
    // Botón conectar cuenta
    this.connectButton = document.getElementById('connect-account-button');
    if (this.connectButton) {
      this.connectButton.addEventListener('click', () => this.handleConnectAccount());
    }

    // Botón logout
    const logoutBtn = document.getElementById('logout-button');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleLogout();
      });
    }

    // Botón compose
    const composeBtn = document.getElementById('compose-button');
    if (composeBtn) {
      composeBtn.addEventListener('click', () => this.handleCompose());
    }

    // Mailbox items
    const mailboxItems = document.querySelectorAll('.mailbox-item');
    mailboxItems.forEach(item => {
      item.addEventListener('click', (e) => {
        const mailboxType = item.dataset.mailbox;
        this.handleMailboxClick(e, { mailbox: mailboxType });
      });
    });

    // Panel resizing
    this.setupPanelResizing();
  }

  /**
   * Configura redimensionamiento de paneles
   */
  setupPanelResizing() {
    const dividers = document.querySelectorAll('.panel-divider');
    const mailboxesPanel = document.getElementById('mailboxesPanel');
    const messageDetailPanel = document.getElementById('messageDetailPanel');

    dividers.forEach((divider, index) => {
      let isResizing = false;
      let startX = 0;
      let startWidth = 0;
      let targetPanel = null;

      divider.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        
        // First divider resizes mailboxes panel (left)
        // Second divider resizes message detail panel (right)
        if (index === 0 && mailboxesPanel) {
          targetPanel = mailboxesPanel;
        } else if (index === 1 && messageDetailPanel) {
          targetPanel = messageDetailPanel;
        }
        
        if (targetPanel) {
          startWidth = targetPanel.getBoundingClientRect().width;
          // Add visual feedback
          divider.style.background = '#6366f1';
          divider.style.width = '8px';
        }
        
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
      });

      document.addEventListener('mousemove', (e) => {
        if (!isResizing || !targetPanel) return;
        
        const diff = e.clientX - startX;
        let newWidth;
        
        if (index === 0) {
          // First divider: dragging right increases mailboxes panel width
          newWidth = startWidth + diff;
        } else {
          // Second divider: dragging left increases detail panel width
          // When dragging left (diff < 0), panel gets wider
          // When dragging right (diff > 0), panel gets narrower
          newWidth = startWidth - diff;
        }
        
        // Constrain width between 200px and 800px
        newWidth = Math.max(200, Math.min(800, newWidth));
        targetPanel.style.width = newWidth + 'px';
        targetPanel.style.flex = '0 0 auto';
        targetPanel.style.minWidth = newWidth + 'px';
      });

      document.addEventListener('mouseup', () => {
        if (isResizing) {
          isResizing = false;
          targetPanel = null;
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
          // Reset visual feedback
          dividers.forEach(d => {
            d.style.background = '';
            d.style.width = '';
          });
        }
      });
    });
  }

  /**
   * Inicializa los módulos
   */
  async initializeModules() {
    // UI Manager primero (otros módulos dependen de él)
    this.uiManager = new UIManager();
    
    // Módulos que dependen de UI Manager
    this.emailRenderer = new EmailRenderer(this.uiManager);
    this.searchManager = new SearchManager(this.uiManager);
    this.accountManager = new AccountManager(this.uiManager);
    
    // Event Handler al final (coordina a todos los demás)
    this.eventHandler = new EventHandler(
      this.uiManager,
      this.emailRenderer,
      this.searchManager,
      this.accountManager
    );
  }

  /**
   * Muestra la pantalla de onboarding
   */
  showOnboarding() {
    const onboardingScreen = document.getElementById('onboarding-screen');
    const mainAppScreen = document.getElementById('main-app-screen');
    if (onboardingScreen) onboardingScreen.classList.remove('hidden');
    if (mainAppScreen) mainAppScreen.classList.add('hidden');
  }

  /**
   * Muestra la pantalla principal de la aplicación
   */
  showMainApp() {
    const onboardingScreen = document.getElementById('onboarding-screen');
    const mainAppScreen = document.getElementById('main-app-screen');
    if (onboardingScreen) onboardingScreen.classList.add('hidden');
    if (mainAppScreen) mainAppScreen.classList.remove('hidden');
  }

  /**
   * Maneja la conexión de cuenta
   */
  async handleConnectAccount() {
    if (this.isConnecting) return;

    this.isConnecting = true;

    if (this.connectButton) {
      this.connectButton.disabled = true;
      this.connectButton.textContent = 'Conectando...';
    }

    try {
      const result = await this.accountManager.connectGmailAccount();
      if (result.success) {
        console.log('Account connected successfully, showing main app');
        this.showMainApp();
      } else {
        console.log('Account connection failed:', result.error);
      }
    } catch (error) {
      console.error('Error connecting account:', error);
    } finally {
      this.isConnecting = false;
      if (this.connectButton) {
        this.connectButton.disabled = false;
        this.connectButton.textContent = 'Conectar con Google';
      }
    }
  }

  /**
   * Maneja el clic en un buzón
   */
  async handleMailboxClick(event, mailboxData) {
    if (!this.accountManager.canPerformAction()) return;
    // Delegar al event handler si existe
    if (this.eventHandler) {
      await this.eventHandler.handleMailboxClick(event.currentTarget);
    }
  }

  /**
   * Maneja la redacción de email
   */
  handleCompose() {
    if (!this.accountManager.canPerformAction()) return;
    window.electronAPI.openCompose();
  }

  /**
   * Maneja la edición de buzones
   */
  handleEditMailboxes() {
    console.log('Edit mailboxes clicked');
  }

  /**
   * Maneja acciones en el mensaje
   */
  async handleMessageAction(action) {
    const currentAccountId = this.accountManager.getCurrentAccountId();
    const currentEmailId = this.uiManager.getCurrentEmailId();

    if (!currentAccountId || !currentEmailId) return;

    // Delegar al event handler
    if (this.eventHandler) {
      await this.eventHandler.handleMessageDetailAction({ textContent: action.toLowerCase() });
    }
  }

  /**
   * Maneja la búsqueda
   */
  handleSearch() {
    if (this.searchManager) {
      this.searchManager.focus();
    }
  }

  /**
   * Maneja las opciones
   */
  handleOptions() {
    console.log('Options clicked');
  }

  /**
   * Maneja el logout
   */
  async handleLogout() {
    await this.accountManager.disconnectCurrentAccount();
    this.showOnboarding();
  }

  /**
   * Maneja errores de inicialización
   */
  async handleInitializationError(error) {
    console.error('Critical initialization error:', error);

    // Usar componente de error modular en lugar de código hardcodeado
    try {
      const { ErrorScreen } = await import('./components/ui/ErrorScreen.js');
      ErrorScreen.show(error);
    } catch (componentError) {
      // Fallback crítico mínimo cuando todo falla
      console.error('Critical: Component system failed:', componentError);
      if (document.body) {
        document.body.innerHTML = '<div style="padding:20px;text-align:center;font-family:monospace;">Critical Error: Application failed to start. Please restart.</div>';
      }
    }
  }

  /**
   * Emite evento de inicialización completa
   */
  emitAppInitialized() {
    const event = new CustomEvent('appInitialized', {
      detail: {
        modules: {
          uiManager: !!this.uiManager,
          emailRenderer: !!this.emailRenderer,
          searchManager: !!this.searchManager,
          accountManager: !!this.accountManager,
          eventHandler: !!this.eventHandler
        }
      }
    });
    document.dispatchEvent(event);
  }

  /**
   * Obtiene estado de la aplicación
   */
  getAppState() {
    return {
      isInitialized: this.isInitialized,
      hasActiveAccount: this.accountManager?.hasActiveAccount() || false,
      currentAccountId: this.accountManager?.getCurrentAccountId() || null,
      searchState: this.searchManager?.getSearchState() || null,
      uiState: this.uiManager?.getState() || null
    };
  }

  /**
   * Reinicia la aplicación
   */
  async restart() {
    console.log('Restarting Mail App...');
    
    // Limpiar módulos
    this.cleanup();
    
    // Re-inicializar
    await this.initialize();
  }

  /**
   * Limpia recursos
   */
  cleanup() {
    console.log('Cleaning up Mail App resources...');
    try {
      if (this.eventHandler) this.eventHandler.cleanup();
      if (this.searchManager) this.searchManager.cleanup();
      if (this.accountManager) this.accountManager.cleanup();
      this.uiManager = null;
      this.emailRenderer = null;
      this.searchManager = null;
      this.accountManager = null;
      this.eventHandler = null;
      this.isInitialized = false;
      console.log('Mail App cleanup completed');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

// Crear instancia global de la aplicación
let mailApp = null;

/**
 * Inicialización cuando el DOM está listo
 */
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM Content Loaded - Starting Mail App initialization...');
  
  try {
    mailApp = new MailApp();
    await mailApp.initialize();
    window.mailApp = mailApp;
  } catch (error) {
    console.error('Fatal error during app startup:', error);
    if (document.body) {
      document.body.innerHTML = '<h1>Error - Please restart</h1>';
    }
  }
});

/**
 * Limpieza al descargar la página
 */
window.addEventListener('beforeunload', () => {
  if (mailApp) {
    mailApp.cleanup();
  }
});

// Exportar para testing
export { MailApp };
