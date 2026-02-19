/**
 * MessageListPanel - Componente del panel de lista de mensajes
 * Maneja la creación y gestión del panel central con lista de mensajes
 */

import { ButtonComponent } from '../ui/Button.js';
import { MESSAGES } from '../../config/textConstants.js';

export class MessageListPanel {
  /**
   * Crea el panel de lista de mensajes completo
   * @param {Object} handlers - Handlers de eventos
   * @returns {HTMLElement} Panel de lista de mensajes creado
   */
  static create(handlers) {
    const panel = document.createElement('div');
    panel.className = 'panel-section message-list-section';
    panel.id = 'messageListPanel';

    const content = document.createElement('div');
    content.className = 'section-content-full';

    // Header con título y acciones
    const header = this.createHeader(handlers);
    content.appendChild(header);

    // Contenedor de mensajes
    const messageList = document.createElement('div');
    messageList.id = 'message-list';
    messageList.className = 'scrollable-content';
    content.appendChild(messageList);

    panel.appendChild(content);
    return panel;
  }

  /**
   * Crea el header de la lista de mensajes
   * @param {Object} handlers - Handlers de eventos
   * @returns {HTMLElement} Header creado
   */
  static createHeader(handlers) {
    const header = document.createElement('div');
    header.className = 'flex justify-between items-start mb-3';

    const titleContainer = document.createElement('div');
    titleContainer.className = 'mailbox-header';

    const title = document.createElement('h2');
    title.className = 'headline';
    title.id = 'current-mailbox-name';
    title.style.cssText = 'margin: 0';
    title.textContent = MESSAGES.MAILBOX_NAMES.all || 'Recibidos';
    titleContainer.appendChild(title);

    const count = document.createElement('div');
    count.className = 'mailbox-count text-base';
    count.id = 'current-mailbox-count';
    count.style.cssText = 'margin-top: 6px';
    count.textContent = '0 mensajes';
    titleContainer.appendChild(count);

    header.appendChild(titleContainer);

    // Botones de acciones
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'flex items-center space-x-1';

    // Botón de búsqueda
    const searchButton = ButtonComponent.iconOnly('SEARCH', {
      id: 'search-button',
      className: 'search-button',
      onClick: handlers.onSearch,
      title: 'Buscar mensajes'
    });
    actionsContainer.appendChild(searchButton);

    // Botón de opciones
    const optionsButton = ButtonComponent.iconOnly('OPTIONS', {
      id: 'options-button',
      className: 'options-button',
      onClick: handlers.onOptions,
      title: 'Más opciones'
    });
    actionsContainer.appendChild(optionsButton);

    header.appendChild(actionsContainer);
    return header;
  }

  /**
   * Actualiza el título de la lista de mensajes
   * @param {HTMLElement} panel - Panel de lista de mensajes
   * @param {string} title - Nuevo título
   * @param {string} count - Nuevo contador
   */
  static updateHeader(panel, title, count) {
    if (!panel) return;

    const titleElement = panel.querySelector('#current-mailbox-name');
    if (titleElement) {
      titleElement.textContent = title;
    }

    const countElement = panel.querySelector('#current-mailbox-count');
    if (countElement) {
      countElement.textContent = `${count} mensajes`;
    }
  }

  /**
   * Actualiza los títulos de los botones de acción
   * @param {HTMLElement} panel - Panel de lista de mensajes
   * @param {Object} titles - Objeto con títulos { search: string, options: string }
   */
  static updateButtonTitles(panel, titles) {
    if (!panel) return;

    const searchButton = panel.querySelector('#search-button');
    if (searchButton && titles.search) {
      searchButton.title = titles.search;
    }

    const optionsButton = panel.querySelector('#options-button');
    if (optionsButton && titles.options) {
      optionsButton.title = titles.options;
    }
  }
}
