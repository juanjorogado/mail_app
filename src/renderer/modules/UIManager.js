/**
 * UIManager - Gestión centralizada de la interfaz de usuario
 * Maneja DOM, estado visual y transiciones
 */

import { SELECTORS, CSS_CLASSES, UI_CONSTANTS } from '../config/uiConfig.js';
import { MESSAGES, TIMEOUTS, LIMITS } from '../config/textConstants.js';

export class UIManager {
  constructor() {
    this.elements = {};
    this.state = {
      currentAccountId: null,
      currentEmailId: null,
      isSearchMode: false
    };
    this.initElements();
  }

  /**
   * Inicializa referencias a elementos DOM
   */
  initElements() {
    try {
      this.elements = {
        // Main containers
        onboardingScreen: document.querySelector(SELECTORS.ONBOARDING_SCREEN),
        mainAppScreen: document.querySelector(SELECTORS.MAIN_APP_SCREEN),
        messageList: document.querySelector(SELECTORS.MESSAGE_LIST),
        messageDetail: document.querySelector(SELECTORS.MESSAGE_DETAIL),
        
        // Message elements
        messageTitle: document.querySelector(SELECTORS.MESSAGE_TITLE),
        messageSender: document.querySelector(SELECTORS.MESSAGE_SENDER),
        messageRecipient: document.querySelector(SELECTORS.MESSAGE_RECIPIENT),
        messageDate: document.querySelector(SELECTORS.MESSAGE_DATE),
        messageBody: document.querySelector(SELECTORS.MESSAGE_BODY),
        
        // Account elements
        currentAccount: document.querySelector(SELECTORS.CURRENT_ACCOUNT),
        connectAccountButton: document.querySelector(SELECTORS.CONNECT_ACCOUNT_BUTTON),
        logoutButton: document.querySelector(SELECTORS.LOGOUT_BUTTON),
        
        // Search elements
        searchInput: document.querySelector(SELECTORS.SEARCH_INPUT),
        searchButton: document.querySelector(SELECTORS.SEARCH_BUTTON),
        
        // Mailbox elements
        mailboxItems: document.querySelectorAll(SELECTORS.MAILBOX_ITEMS),
        countElements: {
          all: document.querySelector(SELECTORS.COUNT_ALL),
          unread: document.querySelector(SELECTORS.COUNT_UNREAD),
          today: document.querySelector(SELECTORS.COUNT_TODAY),
          flagged: document.querySelector(SELECTORS.COUNT_FLAGGED)
        },
        
        // Dynamic selectors
        messageListTitle: document.querySelector(SELECTORS.MESSAGE_LIST_TITLE),
        messageListCount: document.querySelector(SELECTORS.MESSAGE_LIST_COUNT)
      };

      this.validateElements();
    } catch (error) {
      console.error('Error initializing UI elements:', error);
      throw error;
    }
  }

  /**
   * Valida que todos los elementos críticos existan
   * Ahora más flexible - solo valida elementos esenciales
   */
  validateElements() {
    // No hay elementos críticos estáticos - todo se crea dinámicamente
    const criticalElements = [];

    const missing = criticalElements.filter(key => !this.elements[key]);

    if (missing.length > 0) {
      console.error('Missing critical UI elements:', missing);
      throw new Error(`Missing critical UI elements: ${missing.join(', ')}`);
    }

    // Log debug sobre elementos opcionales faltantes (creados dinámicamente por componentes)
    const optionalElements = [
      'onboardingScreen', 'mainAppScreen', 'messageList', 'connectAccountButton'
    ];

    const missingOptional = optionalElements.filter(key => !this.elements[key]);
    if (missingOptional.length > 0) {
      console.debug('Optional UI elements will be created by components:', missingOptional);
    }
  }

  /**
   * Muestra la pantalla principal y oculta onboarding
   */
  showMainApp() {
    const onboardingScreen = this.elements.onboardingScreen || document.querySelector('#onboarding-screen');
    const mainAppScreen = this.elements.mainAppScreen || document.querySelector('#main-app-screen');
    
    if (onboardingScreen) {
      onboardingScreen.classList.add(CSS_CLASSES.HIDDEN);
    }
    if (mainAppScreen) {
      mainAppScreen.classList.remove(CSS_CLASSES.HIDDEN);
    }
  }

  /**
   * Muestra onboarding y oculta pantalla principal
   */
  showOnboarding() {
    const onboardingScreen = this.elements.onboardingScreen || document.querySelector('#onboarding-screen');
    const mainAppScreen = this.elements.mainAppScreen || document.querySelector('#main-app-screen');
    
    if (onboardingScreen) {
      onboardingScreen.classList.remove(CSS_CLASSES.HIDDEN);
    }
    if (mainAppScreen) {
      mainAppScreen.classList.add(CSS_CLASSES.HIDDEN);
    }
  }

  /**
   * Actualiza la información de la cuenta actual
   */
  updateCurrentAccount(account) {
    if (!this.elements.currentAccount || !account) return;

    const displayName = account.alias || account.provider || 'Gmail';
    this.elements.currentAccount.textContent = displayName;
    this.elements.currentAccount.title = account.email;
    
    this.state.currentAccountId = account.id;
  }

  /**
   * Limpia la información de la cuenta
   */
  clearCurrentAccount() {
    if (this.elements.currentAccount) {
      this.elements.currentAccount.textContent = 'Gmail';
      this.elements.currentAccount.title = '';
    }
    this.state.currentAccountId = null;
  }

  /**
   * Actualiza los contadores de buzones
   */
  updateMailboxCounts(counts) {
    Object.entries(counts).forEach(([mailbox, count]) => {
      const countElement = this.elements.countElements[mailbox];
      if (countElement) {
        const displayCount = count > LIMITS.MAX_COUNT_DISPLAY 
          ? `${LIMITS.MAX_COUNT_DISPLAY}+` 
          : count.toString();
        
        countElement.textContent = displayCount;
        countElement.style.display = count > 0 ? 'inline' : 'none';
      }
    });
  }

  /**
   * Actualiza el título y contador de la lista de mensajes
   */
  updateMessageListHeader(title, count, isSearch = false) {
    if (this.elements.messageListTitle) {
      this.elements.messageListTitle.textContent = title;
    }
    
    if (this.elements.messageListCount) {
      const label = isSearch 
        ? MESSAGES.COUNTER_LABELS.search_results(title)
        : `${count} ${MESSAGES.COUNTER_LABELS.messages}`;
      this.elements.messageListCount.textContent = label;
    }
  }

  /**
   * Muestra los detalles de un mensaje
   */
  displayMessageDetail(message) {
    if (!message) {
      this.clearMessageDetail();
      return;
    }

    this.state.currentEmailId = message.id;

    if (this.elements.messageTitle) {
      this.elements.messageTitle.textContent = message.subject || MESSAGES.NO_SUBJECT;
    }

    if (this.elements.messageSender) {
      this.elements.messageSender.textContent = message.from || '';
    }

    if (this.elements.messageRecipient) {
      this.elements.messageRecipient.textContent = message.to || 'me';
    }

    if (this.elements.messageDate) {
      this.elements.messageDate.textContent = new Date(message.date).toLocaleString();
    }

    this.renderMessageBody(message);
  }

  /**
   * Limpia los detalles del mensaje
   */
  clearMessageDetail() {
    if (this.elements.messageTitle) {
      this.elements.messageTitle.textContent = MESSAGES.SELECT_MESSAGE;
    }

    ['messageSender', 'messageRecipient', 'messageDate'].forEach(element => {
      if (this.elements[element]) {
        this.elements[element].textContent = '';
      }
    });

    if (this.elements.messageBody) {
      this.elements.messageBody.innerHTML = '';
      const placeholder = document.createElement('div');
      placeholder.textContent = MESSAGES.MESSAGE_CONTENT_PLACEHOLDER;
      this.elements.messageBody.appendChild(placeholder);
    }

    this.state.currentEmailId = null;
  }

  /**
   * Renderiza el cuerpo del mensaje
   */
  renderMessageBody(message) {
    if (!this.elements.messageBody) return;

    this.elements.messageBody.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'email-content';

    if (message.htmlBody) {
      container.innerHTML = message.htmlBody;
    } else if (message.body) {
      const bodyText = document.createElement('div');
      bodyText.className = 'plain-text';
      bodyText.style.whiteSpace = 'pre-wrap';
      bodyText.textContent = message.body;
      container.appendChild(bodyText);
    } else {
      const noContentMsg = document.createElement('p');
      noContentMsg.className = 'message-no-content';
      noContentMsg.textContent = MESSAGES.NO_CONTENT;
      container.appendChild(noContentMsg);
    }

    this.elements.messageBody.appendChild(container);
  }

  /**
   * Limpia la lista de mensajes
   */
  clearMessageList() {
    if (this.elements.messageList) {
      this.elements.messageList.innerHTML = '';
    }
  }

  /**
   * Muestra mensaje de lista vacía
   */
  showEmptyMessage() {
    if (!this.elements.messageList) return;

    const emptyMsg = document.createElement('p');
    emptyMsg.className = 'empty-message';
    emptyMsg.textContent = MESSAGES.NO_MESSAGES;
    this.elements.messageList.appendChild(emptyMsg);
  }

  /**
   * Activa/desactiva buzones
   */
  setActiveMailbox(mailboxType) {
    this.elements.mailboxItems.forEach(item => {
      item.classList.remove(CSS_CLASSES.ACTIVE);
    });

    const activeMailbox = document.querySelector(
      SELECTORS.MAILBOX_BY_TYPE(mailboxType)
    );
    if (activeMailbox) {
      activeMailbox.classList.add(CSS_CLASSES.ACTIVE);
    }
  }

  /**
   * Gestiona el modo de búsqueda
   */
  setSearchMode(isSearchMode) {
    this.state.isSearchMode = isSearchMode;
    
    if (isSearchMode) {
      this.elements.mailboxItems.forEach(item => {
        item.classList.remove(CSS_CLASSES.ACTIVE);
      });
    }
  }

  /**
   * Muestra notificación usando el sistema global
   */
  showNotification(message, type = 'info', duration = TIMEOUTS.NOTIFICATION_DEFAULT) {
    if (window.showNotification) {
      window.showNotification(message, type, duration);
    } else {
      console.log(`Notification [${type}]: ${message}`);
    }
  }

  /**
   * Obtiene el estado actual
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Verifica si hay una cuenta activa
   */
  hasActiveAccount() {
    return !!this.state.currentAccountId;
  }

  /**
   * Obtiene el ID de la cuenta actual
   */
  getCurrentAccountId() {
    return this.state.currentAccountId;
  }

  /**
   * Obtiene el ID del email actual
   */
  getCurrentEmailId() {
    return this.state.currentEmailId;
  }
}
