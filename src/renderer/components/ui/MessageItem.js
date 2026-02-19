/**
 * MessageItemComponent - Componente para items de mensaje
 * Maneja renderizado seguro, selección y estado de lectura
 */

export class MessageItemComponent {
  /**
   * Crea un item de mensaje
   * @param {Object} config - Configuración del mensaje
   * @returns {HTMLElement} Item de mensaje creado
   */
  static create(config = {}) {
    const {
      id = '',
      threadId = '',
      from = '',
      subject = '',
      snippet = '',
      date = '',
      read = false,
      onClick = null
    } = config;

    const item = document.createElement('div');
    item.className = 'message-item';
    item.setAttribute('data-message-id', id || threadId || this.generateId(from, date));

    // Clases de estado
    if (!read) {
      item.classList.add('font-bold');
    }

    // Header con remitente y fecha
    const headerDiv = this.createHeader(from, date);
    item.appendChild(headerDiv);

    // Asunto
    const subjectP = this.createSubject(subject);
    item.appendChild(subjectP);

    // Snippet
    const snippetP = this.createSnippet(snippet);
    item.appendChild(snippetP);

    // Event listener
    if (onClick && typeof onClick === 'function') {
      item.addEventListener('click', (event) => {
        onClick(event, { id, threadId, from, subject, snippet, date, read });
      });
    }

    return item;
  }

  /**
   * Crea el header del mensaje
   * @param {string} from - Remitente
   * @param {string} date - Fecha
   * @returns {HTMLElement} Header creado
   */
  static createHeader(from, date) {
    const headerDiv = document.createElement('div');
    headerDiv.className = 'message-header';

    // Remitente
    const fromSpan = document.createElement('span');
    fromSpan.className = 'message-from';
    fromSpan.textContent = this.extractSenderName(from);
    headerDiv.appendChild(fromSpan);

    // Fecha
    const dateSpan = document.createElement('span');
    dateSpan.className = 'message-date';
    dateSpan.textContent = this.formatDate(date);
    headerDiv.appendChild(dateSpan);

    return headerDiv;
  }

  /**
   * Crea el elemento del asunto
   * @param {string} subject - Asunto del mensaje
   * @returns {HTMLElement} Elemento de asunto creado
   */
  static createSubject(subject) {
    const subjectP = document.createElement('p');
    subjectP.className = 'message-subject';
    subjectP.textContent = this.sanitizeText(subject) || 'Sin asunto';
    return subjectP;
  }

  /**
   * Crea el elemento del snippet
   * @param {string} snippet - Snippet del mensaje
   * @returns {HTMLElement} Elemento de snippet creado
   */
  static createSnippet(snippet) {
    const snippetP = document.createElement('p');
    snippetP.className = 'message-snippet';
    
    const cleanSnippet = this.cleanSnippet(snippet);
    const truncatedSnippet = cleanSnippet.substring(0, 50);
    snippetP.textContent = truncatedSnippet + (cleanSnippet.length > 50 ? '...' : '');

    return snippetP;
  }

  /**
   * Extrae el nombre del remitente de forma segura
   * @param {string} fromString - String del remitente
   * @returns {string} Nombre extraído
   */
  static extractSenderName(fromString) {
    if (!fromString) return 'Unknown';

    // Si tiene formato "Name" <email@example.com>, extraer solo el nombre
    const match = fromString.match(/^"?([^"<]+)"?\s*</);
    if (match) {
      return match[1].trim();
    }

    // Si es solo un email, mostrarlo sin los <>
    return fromString.replace(/[<>]/g, '').trim() || 'Unknown';
  }

  /**
   * Formatea la fecha de forma segura
   * @param {string} dateString - String de fecha
   * @returns {string} Fecha formateada
   */
  static formatDate(dateString) {
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
   * @param {string} snippet - Snippet original
   * @returns {string} Snippet limpio
   */
  static cleanSnippet(snippet) {
    if (!snippet) return '';

    // Decodificar entidades HTML
    const decoded = this.decodeHtmlEntities(snippet);
    
    // Eliminar tags HTML si los hay
    return decoded.replace(/<[^>]*>/g, '').trim();
  }

  /**
   * Decodifica entidades HTML de forma segura
   * @param {string} text - Texto a decodificar
   * @returns {string} Texto decodificado
   */
  static decodeHtmlEntities(text) {
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
   * @param {string} text - Texto a sanitizar
   * @returns {string} Texto sanitizado
   */
  static sanitizeText(text) {
    if (!text) return '';
    return this.decodeHtmlEntities(text);
  }

  /**
   * Genera un ID único para el mensaje
   * @param {string} from - Remitente
   * @param {string} date - Fecha
   * @returns {string} ID generado
   */
  static generateId(from, date) {
    const timestamp = date ? new Date(date).getTime() : Date.now();
    const sender = from ? from.replace(/[^a-zA-Z0-9]/g, '') : 'unknown';
    return `${sender}_${timestamp}`;
  }

  /**
   * Establece estado de selección
   * @param {HTMLElement} itemElement - Elemento item
   * @param {boolean} selected - Estado de selección
   */
  static setSelected(itemElement, selected = true) {
    if (!itemElement) return;

    if (selected) {
      itemElement.classList.add('selected');
    } else {
      itemElement.classList.remove('selected');
    }
  }

  /**
   * Actualiza estado de lectura
   * @param {HTMLElement} itemElement - Elemento item
   * @param {boolean} read - Estado de lectura
   */
  static setReadStatus(itemElement, read) {
    if (!itemElement) return;

    if (read) {
      itemElement.classList.remove('font-bold');
    } else {
      itemElement.classList.add('font-bold');
    }
  }

  /**
   * Encuentra un item por ID de mensaje
   * @param {string} messageId - ID del mensaje a buscar
   * @returns {HTMLElement|null} Item encontrado
   */
  static findByMessageId(messageId) {
    return document.querySelector(`[data-message-id="${messageId}"]`);
  }

  /**
   * Limpia todas las selecciones
   */
  static clearAllSelected() {
    document.querySelectorAll('.message-item.selected').forEach(item => {
      item.classList.remove('selected');
    });
  }

  /**
   * Crea múltiples items de mensaje
   * @param {Array} messages - Array de mensajes
   * @param {Function} onItemClick - Handler de clic
   * @returns {DocumentFragment} Fragmento con items
   */
  static createMultiple(messages, onItemClick) {
    const fragment = document.createDocumentFragment();
    
    messages.forEach((message, index) => {
      try {
        const item = this.create({
          ...message,
          onClick: onItemClick
        });
        fragment.appendChild(item);
      } catch (error) {
        console.error(`Error creating message item at index ${index}:`, error, message);
      }
    });

    return fragment;
  }

  /**
   * Elimina un item del DOM
   * @param {string} messageId - ID del mensaje a eliminar
   */
  static remove(messageId) {
    const item = this.findByMessageId(messageId);
    if (item) {
      item.remove();
    }
  }
}
