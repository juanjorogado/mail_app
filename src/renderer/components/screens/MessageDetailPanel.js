/**
 * MessageDetailPanel - Componente del panel de detalles del mensaje
 * Maneja la creación y gestión del panel derecho con detalles del mensaje
 */

import { ButtonComponent } from '../ui/Button.js';
import { MESSAGES } from '../../config/textConstants.js';

export class MessageDetailPanel {
  /**
   * Crea el panel de detalles del mensaje completo
   * @param {Object} handlers - Handlers de eventos
   * @returns {HTMLElement} Panel de detalles creado
   */
  static create(handlers) {
    const panel = document.createElement('div');
    panel.className = 'panel-section message-detail-section';
    panel.id = 'messageDetailPanel';

    const content = document.createElement('div');
    content.className = 'section-content-full';

    // Header con acciones del mensaje
    const header = this.createHeader(handlers);
    content.appendChild(header);

    // Contenido del mensaje
    const messageContent = this.createMessageContent();
    content.appendChild(messageContent);

    panel.appendChild(content);
    return panel;
  }

  /**
   * Crea el header de detalles del mensaje
   * @param {Object} handlers - Handlers de eventos
   * @returns {HTMLElement} Header creado
   */
  static createHeader(handlers) {
    const header = document.createElement('div');
    header.className = 'flex justify-between items-center mb-3';

    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'flex space-x-1';

    // Botones de acciones del mensaje
    const actions = [
      { icon: 'PREVIOUS', title: 'Anterior' },
      { icon: 'NEXT', title: 'Siguiente' },
      { icon: 'REPLY', title: 'Responder' },
      { icon: 'FORWARD', title: 'Reenviar' },
      { icon: 'DELETE', title: 'Eliminar', variant: 'danger' }
    ];

    actions.forEach(action => {
      const button = ButtonComponent.iconOnly(action.icon, {
        className: action.variant === 'danger' ? 'button-delete' : '',
        onClick: () => handlers.onMessageAction && handlers.onMessageAction(action.icon),
        title: action.title
      });
      actionsContainer.appendChild(button);
    });

    header.appendChild(actionsContainer);
    return header;
  }

  /**
   * Crea el contenido del mensaje
   * @returns {HTMLElement} Contenido creado
   */
  static createMessageContent() {
    const content = document.createElement('div');
    content.className = 'scrollable-content';

    // Título del mensaje
    const title = document.createElement('h1');
    title.id = 'message-title';
    title.textContent = MESSAGES.SELECT_MESSAGE || 'Selecciona un mensaje';
    content.appendChild(title);

    // Metadatos del mensaje
    const meta = document.createElement('div');
    meta.id = 'message-meta';
    meta.className = 'hidden';
    meta.innerHTML = `
      <p>De: <span id="message-sender"></span></p>
      <p>Para: <span id="message-recipient"></span></p>
      <p id="message-date" class="text-right"></p>
    `;
    content.appendChild(meta);

    // Cuerpo del mensaje
    const body = document.createElement('div');
    body.id = 'message-body';
    body.innerHTML = `<p>${MESSAGES.MESSAGE_CONTENT_PLACEHOLDER || 'Contenido del mensaje seleccionado aparecerá aquí.'}</p>`;
    content.appendChild(body);

    return content;
  }

  /**
   * Actualiza el contenido del mensaje
   * @param {HTMLElement} panel - Panel de detalles del mensaje
   * @param {Object} message - Datos del mensaje
   */
  static updateMessage(panel, message) {
    if (!panel) return;

    const titleElement = panel.querySelector('#message-title');
    const metaElement = panel.querySelector('#message-meta');
    const bodyElement = panel.querySelector('#message-body');

    if (message) {
      // Mostrar mensaje
      if (titleElement) {
        titleElement.textContent = message.subject || 'Sin asunto';
      }

      if (metaElement) {
        metaElement.classList.remove('hidden');
        const senderElement = metaElement.querySelector('#message-sender');
        const recipientElement = metaElement.querySelector('#message-recipient');
        const dateElement = metaElement.querySelector('#message-date');

        if (senderElement) senderElement.textContent = message.from || '';
        if (recipientElement) recipientElement.textContent = message.to || '';
        if (dateElement) dateElement.textContent = message.date || '';
      }

      if (bodyElement) {
        bodyElement.innerHTML = message.body || '<p>No hay contenido disponible.</p>';
      }
    } else {
      // Mostrar placeholder
      if (titleElement) {
        titleElement.textContent = MESSAGES.SELECT_MESSAGE || 'Selecciona un mensaje';
      }

      if (metaElement) {
        metaElement.classList.add('hidden');
      }

      if (bodyElement) {
        bodyElement.innerHTML = `<p>${MESSAGES.MESSAGE_CONTENT_PLACEHOLDER || 'Contenido del mensaje seleccionado aparecerá aquí.'}</p>`;
      }
    }
  }
}
