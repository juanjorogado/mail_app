/**
 * EventHandler - Gestión centralizada de eventos DOM
 * Coordina todos los eventos de la aplicación
 */

import { SELECTORS, CSS_CLASSES, MAILBOX_MAPPING } from '../config/uiConfig.js';
import { MESSAGES, TIMEOUTS } from '../config/textConstants.js';

export class EventHandler {
  constructor(uiManager, emailRenderer, searchManager, accountManager) {
    this.uiManager = uiManager;
    this.emailRenderer = emailRenderer;
    this.searchManager = searchManager;
    this.accountManager = accountManager;
    
    this.currentFetchedMessages = [];
    this.initEventListeners();
  }

  /**
   * Inicializa todos los event listeners
   */
  initEventListeners() {
    this.attachAccountEventListeners();
    this.attachMailboxEventListeners();
    this.attachActionEventListeners();
    this.attachMessageDetailEventListeners();
    this.attachGlobalEventListeners();
    this.attachCustomEventListeners();
  }

  /**
   * Adjunta listeners relacionados con cuentas
   */
  attachAccountEventListeners() {
    // Botón de conectar cuenta
    const connectButton = this.uiManager.elements.connectAccountButton;
    if (connectButton) {
      connectButton.addEventListener('click', async () => {
        await this.handleConnectAccount();
      });
    }

    // Botón de logout
    const logoutButton = this.uiManager.elements.logoutButton;
    if (logoutButton) {
      logoutButton.addEventListener('click', async () => {
        await this.handleLogout();
      });
    }
  }

  /**
   * Adjunta listeners de buzones
   */
  attachMailboxEventListeners() {
    const mailboxItems = this.uiManager.elements.mailboxItems;
    
    mailboxItems.forEach(item => {
      item.addEventListener('click', () => {
        this.handleMailboxClick(item);
      });
    });
  }

  /**
   * Adjunta listeners de acciones principales
   */
  attachActionEventListeners() {
    // Botón de redactar
    const composeButton = document.querySelector(SELECTORS.COMPOSE_BUTTON);
    if (composeButton) {
      composeButton.addEventListener('click', () => {
        this.handleCompose();
      });
    }

    // Botón de editar buzones
    const editButton = document.querySelector(SELECTORS.EDIT_BUTTON);
    if (editButton) {
      editButton.addEventListener('click', () => {
        this.handleEditMailboxes();
      });
    }

    // Botón de opciones
    const optionsIcon = document.querySelector(SELECTORS.OPTIONS_ICON);
    if (optionsIcon) {
      optionsIcon.addEventListener('click', () => {
        this.handleOptions();
      });
    }
  }

  /**
   * Adjunta listeners del detalle de mensaje
   */
  attachMessageDetailEventListeners() {
    const messageDetailButtons = document.querySelectorAll(SELECTORS.MESSAGE_DETAIL_BUTTONS);
    
    messageDetailButtons.forEach(button => {
      button.addEventListener('click', async () => {
        await this.handleMessageDetailAction(button);
      });
    });
  }

  /**
   * Adjunta listeners globales
   */
  attachGlobalEventListeners() {
    // Eventos de ventana
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });

    // Eventos de redimensionamiento
    this.initResizablePanels();
  }

  /**
   * Adjunta listeners de eventos personalizados
   */
  attachCustomEventListeners() {
    // Eventos de búsqueda
    document.addEventListener('searchResults', (event) => {
      this.handleSearchResults(event.detail.results, event.detail.query);
    });

    document.addEventListener('searchClear', () => {
      this.handleSearchClear();
    });

    // Eventos de cuenta
    document.addEventListener('accountConnected', (event) => {
      this.handleAccountConnected(event.detail.account);
    });

    document.addEventListener('accountDisconnected', () => {
      this.handleAccountDisconnected();
    });

    document.addEventListener('accountChanged', (event) => {
      this.handleAccountChanged(event.detail.account);
    });
  }

  /**
   * Maneja la conexión de cuenta
   */
  async handleConnectAccount() {
    if (!this.accountManager.canPerformAction()) {
      await this.accountManager.connectGmailAccount();
    }
  }

  /**
   * Maneja el logout
   */
  async handleLogout() {
    await this.accountManager.disconnectCurrentAccount();
  }

  /**
   * Maneja el clic en un buzón
   */
  async handleMailboxClick(mailboxItem) {
    if (!this.accountManager.canPerformAction()) {
      this.uiManager.showNotification(
        MESSAGES.NOTIFICATIONS.NO_ACCOUNT,
        'warning',
        TIMEOUTS.NOTIFICATION_DEFAULT
      );
      return;
    }

    // Actualizar UI
    this.uiManager.elements.mailboxItems.forEach(item => {
      item.classList.remove(CSS_CLASSES.ACTIVE);
    });
    mailboxItem.classList.add(CSS_CLASSES.ACTIVE);

    // Cargar mensajes del buzón
    const mailboxType = mailboxItem.dataset.mailbox;
    const folder = MAILBOX_MAPPING[mailboxType] || 'INBOX';
    
    await this.loadEmailsForMailbox(folder, mailboxType);
  }

  /**
   * Maneja el redactar email
   */
  handleCompose() {
    if (!this.accountManager.canPerformAction()) {
      this.uiManager.showNotification(
        MESSAGES.NOTIFICATIONS.NO_ACCOUNT_COMPOSE,
        'warning',
        TIMEOUTS.NOTIFICATION_DEFAULT
      );
      return;
    }

    window.electronAPI.openCompose();
  }

  /**
   * Maneja la edición de buzones
   */
  handleEditMailboxes() {
    this.uiManager.showNotification(
      MESSAGES.NOTIFICATIONS.COMING_SOON,
      'info',
      TIMEOUTS.NOTIFICATION_DEFAULT
    );
  }

  /**
   * Maneja las opciones
   */
  handleOptions() {
    this.uiManager.showNotification(
      'Opciones de lista de mensajes coming soon.',
      'info',
      TIMEOUTS.NOTIFICATION_DEFAULT
    );
  }

  /**
   * Maneja acciones en el detalle de mensaje
   */
  async handleMessageDetailAction(button) {
    const buttonText = button.textContent.trim().toLowerCase();
    const currentAccountId = this.accountManager.getCurrentAccountId();
    const currentEmailId = this.uiManager.getCurrentEmailId();

    if (!currentAccountId || !currentEmailId) {
      this.uiManager.showNotification(
        MESSAGES.NOTIFICATIONS.NO_MESSAGE_SELECTED,
        'warning',
        TIMEOUTS.NOTIFICATION_DEFAULT
      );
      return;
    }

    // Eliminar mensaje
    if (buttonText.includes('eliminar') || buttonText.includes('trash') || button.textContent.includes('🗑')) {
      await this.handleDeleteEmail(currentAccountId, currentEmailId);
    }
    // Responder mensaje
    else if (buttonText.includes('responder') || buttonText.includes('reply')) {
      await this.handleReplyEmail(currentAccountId, currentEmailId);
    }
    // Reenviar mensaje
    else if (buttonText.includes('reenviar') || buttonText.includes('forward')) {
      await this.handleForwardEmail(currentAccountId, currentEmailId);
    }
  }

  /**
   * Maneja la eliminación de email
   */
  async handleDeleteEmail(accountId, emailId) {
    try {
      this.uiManager.showNotification('Eliminando mensaje...', 'info', 0);
      
      const response = await window.electronAPI.deleteEmail(accountId, emailId);

      if (response.success) {
        this.uiManager.showNotification(
          MESSAGES.NOTIFICATIONS.EMAIL_DELETE_SUCCESS,
          'success',
          TIMEOUTS.NOTIFICATION_DEFAULT
        );
        
        // Recargar mensajes
        await this.loadEmailsForMailbox('INBOX', 'all');
        this.uiManager.clearMessageDetail();
        
        // Eliminar de la lista renderizada
        this.emailRenderer.removeMessageFromList(emailId);
      } else {
        this.uiManager.showNotification(
          `${MESSAGES.NOTIFICATIONS.EMAIL_DELETE_ERROR}: ${response.error}`,
          'error',
          TIMEOUTS.NOTIFICATION_LONG
        );
      }
    } catch (error) {
      console.error('Error deleting email:', error);
      this.uiManager.showNotification(
        MESSAGES.NOTIFICATIONS.EMAIL_DELETE_ERROR,
        'error',
        TIMEOUTS.NOTIFICATION_LONG
      );
    }
  }

  /**
   * Maneja la respuesta de email
   */
  async handleReplyEmail(accountId, emailId) {
    const selectedEmail = this.currentFetchedMessages.find(
      email => email.id === emailId || email.threadId === emailId
    );

    if (selectedEmail) {
      window.electronAPI.openCompose({
        mode: 'reply',
        emailData: selectedEmail,
        accountId: accountId
      });
    } else {
      this.uiManager.showNotification(
        MESSAGES.NOTIFICATIONS.NO_MESSAGE_REPLY,
        'warning',
        TIMEOUTS.NOTIFICATION_DEFAULT
      );
    }
  }

  /**
   * Maneja el reenvío de email
   */
  async handleForwardEmail(accountId, emailId) {
    const selectedEmail = this.currentFetchedMessages.find(
      email => email.id === emailId || email.threadId === emailId
    );

    if (selectedEmail) {
      window.electronAPI.openCompose({
        mode: 'forward',
        emailData: selectedEmail,
        accountId: accountId
      });
    } else {
      this.uiManager.showNotification(
        MESSAGES.NOTIFICATIONS.NO_MESSAGE_REPLY,
        'warning',
        TIMEOUTS.NOTIFICATION_DEFAULT
      );
    }
  }

  /**
   * Carga emails para un buzón específico
   */
  async loadEmailsForMailbox(folder, mailboxType) {
    if (!this.accountManager.canPerformAction()) {
      this.uiManager.showNotification(
        MESSAGES.NOTIFICATIONS.NO_ACCOUNT,
        'warning',
        TIMEOUTS.NOTIFICATION_DEFAULT
      );
      return;
    }

    try {
      this.uiManager.showNotification(
        MESSAGES.NOTIFICATIONS.EMAIL_LOADING,
        'info',
        TIMEOUTS.NOTIFICATION_SHORT
      );

      const currentAccountId = this.accountManager.getCurrentAccountId();
      const response = await window.electronAPI.fetchEmails(currentAccountId, folder);

      if (response.success) {
        this.currentFetchedMessages = response.data;
        
        // Actualizar header
        const mailboxName = this.getMailboxDisplayName(mailboxType);
        this.uiManager.updateMessageListHeader(mailboxName, response.data.length);
        
        // Renderizar mensajes
        this.emailRenderer.renderMessages(response.data, mailboxType);
        
        // Actualizar contadores
        await this.updateMailboxCounts();
      } else {
        this.uiManager.showNotification(
          `${MESSAGES.NOTIFICATIONS.EMAIL_LOAD_ERROR}: ${response.error}`,
          'error',
          TIMEOUTS.NOTIFICATION_LONG
        );
      }
    } catch (error) {
      console.error('Error loading emails:', error);
      this.uiManager.showNotification(
        this.getErrorMessage(error),
        'error',
        TIMEOUTS.NOTIFICATION_LONG
      );
    }
  }

  /**
   * Maneja resultados de búsqueda
   */
  handleSearchResults(results, query) {
    this.currentFetchedMessages = results;
    this.emailRenderer.renderMessages(results, 'search');
  }

  /**
   * Maneja la limpieza de búsqueda
   */
  async handleSearchClear() {
    await this.loadEmailsForMailbox('INBOX', 'all');
  }

  /**
   * Maneja conexión de cuenta
   */
  async handleAccountConnected(account) {
    await this.loadEmailsForMailbox('INBOX', 'all');
    await this.updateMailboxCounts();
    
    // Seleccionar buzón por defecto
    const defaultMailbox = document.querySelector('[data-mailbox="all"]');
    if (defaultMailbox) {
      defaultMailbox.classList.add(CSS_CLASSES.ACTIVE);
    }
  }

  /**
   * Maneja desconexión de cuenta
   */
  handleAccountDisconnected() {
    this.currentFetchedMessages = [];
    
    // Limpiar selección de buzones
    this.uiManager.elements.mailboxItems.forEach(item => {
      item.classList.remove(CSS_CLASSES.ACTIVE);
    });
  }

  /**
   * Maneja cambio de cuenta
   */
  async handleAccountChanged(account) {
    await this.loadEmailsForMailbox('INBOX', 'all');
    await this.updateMailboxCounts();
  }

  /**
   * Actualiza los contadores de buzones
   */
  async updateMailboxCounts() {
    if (!this.accountManager.canPerformAction()) return;

    try {
      const currentAccountId = this.accountManager.getCurrentAccountId();
      
      // Obtener conteos en paralelo
      const [allResponse, unreadResponse, todayResponse, flaggedResponse] = await Promise.all([
        window.electronAPI.fetchEmails(currentAccountId, 'INBOX'),
        window.electronAPI.fetchEmails(currentAccountId, 'UNREAD'),
        window.electronAPI.fetchEmails(currentAccountId, 'TODAY'),
        window.electronAPI.fetchEmails(currentAccountId, 'STARRED')
      ]);

      const counts = {
        all: allResponse.success ? allResponse.data?.length || 0 : 0,
        unread: unreadResponse.success ? unreadResponse.data?.length || 0 : 0,
        today: todayResponse.success ? todayResponse.data?.length || 0 : 0,
        flagged: flaggedResponse.success ? flaggedResponse.data?.length || 0 : 0
      };

      this.uiManager.updateMailboxCounts(counts);
    } catch (error) {
      console.error('Error updating mailbox counts:', error);
    }
  }

  /**
   * Obtiene el nombre para mostrar del buzón
   */
  getMailboxDisplayName(mailboxType) {
    return MESSAGES.MAILBOX_NAMES[mailboxType] || mailboxType;
  }

  /**
   * Obtiene mensaje de error apropiado
   */
  getErrorMessage(error) {
    if (!error || !error.message) {
      return MESSAGES.NOTIFICATIONS.NETWORK_ERROR;
    }

    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return MESSAGES.NOTIFICATIONS.NO_INTERNET;
    }

    if (errorMessage.includes('timeout') || errorMessage.includes('etimedout')) {
      return MESSAGES.NOTIFICATIONS.TIMEOUT_ERROR;
    }

    if (errorMessage.includes('auth') || errorMessage.includes('401')) {
      return MESSAGES.NOTIFICATIONS.AUTH_ERROR;
    }

    return error.message || MESSAGES.NOTIFICATIONS.NETWORK_ERROR;
  }

  /**
   * Inicializa paneles redimensionables
   */
  initResizablePanels() {
    const dividers = document.querySelectorAll(SELECTORS.PANEL_DIVIDERS);

    dividers.forEach(divider => {
      let isResizing = false;
      let startX;
      let leftPanel;
      let leftPanelStartWidth;

      divider.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        divider.classList.add(CSS_CLASSES.RESIZING);

        const resizeType = divider.dataset.resize;
        if (resizeType === 'mailboxes-messageList') {
          leftPanel = document.getElementById('mailboxesPanel');
        } else if (resizeType === 'messageList-messageDetail') {
          leftPanel = document.getElementById('messageListPanel');
        }

        if (leftPanel) {
          leftPanelStartWidth = leftPanel.offsetWidth;
        }

        e.preventDefault();
      });

      document.addEventListener('mousemove', (e) => {
        if (!isResizing || !leftPanel) return;

        const deltaX = e.clientX - startX;
        const newWidth = leftPanelStartWidth + deltaX;

        // Aplicar límites
        const minWidth = 200;
        const maxWidth = 400;

        if (newWidth >= minWidth && newWidth <= maxWidth) {
          leftPanel.style.width = newWidth + 'px';

          // Guardar en localStorage
          const panelId = leftPanel.id;
          localStorage.setItem(panelId + '_width', newWidth);
        }
      });

      document.addEventListener('mouseup', () => {
        if (isResizing) {
          isResizing = false;
          divider.classList.remove(CSS_CLASSES.RESIZING);
        }
      });
    });
  }

  /**
   * Limpia recursos
   */
  cleanup() {
    this.currentFetchedMessages = [];
    
    if (this.searchManager) {
      this.searchManager.cleanup();
    }
  }
}
