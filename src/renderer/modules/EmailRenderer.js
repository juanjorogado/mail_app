/**
 * EmailRenderer - Manejo especializado del renderizado de emails
 * Encargado de crear elementos DOM para mensajes de forma segura
 */

import { CSS_CLASSES } from '../config/uiConfig.js';
import { MESSAGES, LIMITS } from '../config/textConstants.js';

export class EmailRenderer {
  constructor(uiManager) {
    this.uiManager = uiManager;
  }

  /**
   * Renderiza una lista de mensajes
   */
  renderMessages(messages, mailboxType) {
    if (!messages || !Array.isArray(messages)) {
      console.error('Invalid messages data provided to renderMessages');
      return;
    }

    this.uiManager.clearMessageList();

    if (messages.length === 0) {
      this.uiManager.showEmptyMessage();
      this.uiManager.clearMessageDetail();
      return;
    }

    const fragment = document.createDocumentFragment();
    
    messages.forEach((message, index) => {
      try {
        const messageElement = this.createMessageElement(message, index);
        if (messageElement) {
          fragment.appendChild(messageElement);
        }
      } catch (error) {
        console.error(`Error rendering message at index ${index}:`, error, message);
      }
    });

    const messageList = this.uiManager.elements.messageList || document.querySelector('#message-list');
    if (messageList) {
      messageList.appendChild(fragment);
    } else {
      console.error('message-list element not found for rendering');
    }
    this.attachMessageListeners();
    
    // Seleccionar primer mensaje por defecto
    if (messages.length > 0) {
      this.selectFirstMessage(messages[0]);
    }
  }

  /**
   * Crea un elemento DOM para un mensaje individual
   */
  createMessageElement(message, index) {
    if (!message || typeof message !== 'object') {
      console.warn(`Invalid message at index ${index}:`, message);
      return null;
    }

    const messageItem = document.createElement('div');
    messageItem.classList.add(
      CSS_CLASSES.MESSAGE_ITEM,
      CSS_CLASSES.PADDING.P3,
      CSS_CLASSES.BORDERS.BORDER_B,
      CSS_CLASSES.BORDERS.BORDER_GRAY_200,
      CSS_CLASSES.INTERACTION.HOVER_BG_GRAY_50,
      CSS_CLASSES.INTERACTION.CURSOR_POINTER
    );

    // Marcar como no leído
    if (message.read === false) {
      messageItem.classList.add(CSS_CLASSES.MESSAGE_UNREAD);
    }

    // Generar ID seguro
    const emailId = this.generateEmailId(message, index);
    messageItem.dataset.messageId = emailId;

    // Crear contenido del mensaje
    const headerDiv = this.createMessageHeader(message);
    const subjectP = this.createMessageSubject(message);
    const snippetP = this.createMessageSnippet(message);

    messageItem.appendChild(headerDiv);
    messageItem.appendChild(subjectP);
    messageItem.appendChild(snippetP);

    return messageItem;
  }

  /**
   * Crea el encabezado del mensaje (remitente y fecha)
   */
  createMessageHeader(message) {
    const headerDiv = document.createElement('div');
    headerDiv.className = CSS_CLASSES.MESSAGE_HEADER;

    const fromSpan = document.createElement('span');
    fromSpan.className = CSS_CLASSES.MESSAGE_FROM;
    fromSpan.textContent = this.extractSenderName(message.from);

    const dateSpan = document.createElement('span');
    dateSpan.className = CSS_CLASSES.MESSAGE_DATE;
    dateSpan.textContent = this.formatDate(message.date);

    headerDiv.appendChild(fromSpan);
    headerDiv.appendChild(dateSpan);

    return headerDiv;
  }

  /**
   * Crea el elemento del asunto
   */
  createMessageSubject(message) {
    const subjectP = document.createElement('p');
    subjectP.className = CSS_CLASSES.MESSAGE_SUBJECT;
    subjectP.textContent = this.sanitizeText(message.subject) || MESSAGES.NO_SUBJECT;
    return subjectP;
  }

  /**
   * Crea el elemento del snippet
   */
  createMessageSnippet(message) {
    const snippetP = document.createElement('p');
    snippetP.className = CSS_CLASSES.MESSAGE_SNIPPET;
    
    const cleanSnippet = this.cleanSnippet(message.snippet);
    const truncatedSnippet = cleanSnippet.substring(0, LIMITS.SNIPPET_LENGTH);
    snippetP.textContent = truncatedSnippet + (cleanSnippet.length > LIMITS.SNIPPET_LENGTH ? '...' : '');

    return snippetP;
  }

  /**
   * Genera un ID seguro para el mensaje
   */
  generateEmailId(message, index) {
    try {
      return message.id || 
             message.threadId || 
             (message.from && message.date ? `${message.from}_${message.date}` : `msg-${index}`);
    } catch (error) {
      console.warn('Error generating email ID:', error);
      return `msg-${index}`;
    }
  }

  /**
   * Extrae el nombre del remitente de forma segura
   */
  extractSenderName(fromString) {
    if (!fromString) return MESSAGES.UNKNOWN_SENDER;

    // Si tiene formato "Name" <email@example.com>, extraer solo el nombre
    const match = fromString.match(/^"?([^"<]+)"?\s*</);
    if (match) {
      return match[1].trim();
    }

    // Si es solo un email, mostrarlo sin los <>
    return fromString.replace(/[<>]/g, '').trim() || MESSAGES.UNKNOWN_SENDER;
  }

  /**
   * Formatea la fecha de forma segura
   */
  formatDate(dateString) {
    try {
      const date = new Date(dateString || Date.now());
      return date.toLocaleDateString();
    } catch (error) {
      console.warn('Error formatting date:', error);
      return new Date().toLocaleDateString();
    }
  }

  /**
   * Limpia y sanitiza el snippet
   */
  cleanSnippet(snippet) {
    if (!snippet) return '';

    // Decodificar entidades HTML
    const decoded = this.decodeHtmlEntities(snippet);
    
    // Eliminar tags HTML si los hay
    return decoded.replace(/<[^>]*>/g, '').trim();
  }

  /**
   * Decodifica entidades HTML de forma segura
   */
  decodeHtmlEntities(text) {
    if (typeof text !== 'string') return '';

    try {
      const textarea = document.createElement('textarea');
      textarea.innerHTML = text;
      return textarea.value;
    } catch (error) {
      console.warn('Error decoding HTML entities:', error);
      return text;
    }
  }

  /**
   * Sanitiza texto para prevenir XSS
   */
  sanitizeText(text) {
    if (!text) return '';

    return this.decodeHtmlEntities(text);
  }

  /**
   * Adjunta listeners a los elementos de mensaje
   */
  attachMessageListeners() {
    const messageList = this.uiManager.elements.messageList || document.querySelector('#message-list');
    if (!messageList) {
      console.error('message-list not found for attaching listeners');
      return;
    }
    
    const messageItems = messageList.querySelectorAll(
      `.${CSS_CLASSES.MESSAGE_ITEM}`
    );

    messageItems.forEach(item => {
      item.addEventListener('click', async (event) => {
        await this.handleMessageClick(event);
      });
    });
  }

  /**
   * Maneja el clic en un mensaje
   */
  async handleMessageClick(event) {
    try {
      const messageList = this.uiManager.elements.messageList || document.querySelector('#message-list');
      if (!messageList) return;
      
      // Remover selección previa
      messageList
        .querySelectorAll(`.${CSS_CLASSES.SELECTED}`)
        .forEach(item => item.classList.remove(CSS_CLASSES.SELECTED));

      // Seleccionar mensaje actual
      event.currentTarget.classList.add(CSS_CLASSES.SELECTED);

      const selectedId = event.currentTarget.dataset.messageId;
      const currentAccountId = this.uiManager.getCurrentAccountId();

      if (currentAccountId && selectedId) {
        // Cargar detalles completos del mensaje
        const detailResponse = await window.electronAPI.fetchEmailDetails(
          currentAccountId,
          selectedId
        );

        if (detailResponse.success) {
          this.uiManager.displayMessageDetail(detailResponse.data);
        } else {
          console.error('Error loading email details:', detailResponse.error);
          this.uiManager.showNotification(
            'Error al cargar el mensaje',
            'error',
            3000
          );
        }
      }
    } catch (error) {
      console.error('Error selecting message:', error);
      this.uiManager.showNotification(
        'Error al seleccionar el mensaje',
        'error',
        3000
      );
    }
  }

  /**
   * Selecciona y carga el primer mensaje
   */
  async selectFirstMessage(firstMessage) {
    try {
      const messageList = this.uiManager.elements.messageList || document.querySelector('#message-list');
      if (!messageList) return;
      
      const firstMessageElement = messageList.querySelector(
        `.${CSS_CLASSES.MESSAGE_ITEM}`
      );

      if (firstMessageElement) {
        firstMessageElement.classList.add(CSS_CLASSES.SELECTED);
        
        const currentAccountId = this.uiManager.getCurrentAccountId();
        if (currentAccountId && firstMessage.id) {
          const detailResponse = await window.electronAPI.fetchEmailDetails(
            currentAccountId,
            firstMessage.id
          );

          if (detailResponse.success) {
            this.uiManager.displayMessageDetail(detailResponse.data);
          } else {
            console.error('Error loading first message details:', detailResponse.error);
          }
        }
      }
    } catch (error) {
      console.error('Error selecting first message:', error);
    }
  }

  /**
   * Actualiza el estado de leído/no leído de un mensaje
   */
  updateMessageReadStatus(emailId, isRead) {
    const messageList = this.uiManager.elements.messageList || document.querySelector('#message-list');
    if (!messageList) return;
    
    const messageElement = messageList.querySelector(
      `[data-message-id="${emailId}"]`
    );

    if (messageElement) {
      if (isRead) {
        messageElement.classList.remove(CSS_CLASSES.MESSAGE_UNREAD);
      } else {
        messageElement.classList.add(CSS_CLASSES.MESSAGE_UNREAD);
      }
    }
  }

  /**
   * Elimina un mensaje de la lista
   */
  removeMessageFromList(emailId) {
    const messageList = this.uiManager.elements.messageList || document.querySelector('#message-list');
    if (!messageList) return;
    
    const messageElement = messageList.querySelector(
      `[data-message-id="${emailId}"]`
    );

    if (messageElement) {
      messageElement.remove();
    }
  }
}
