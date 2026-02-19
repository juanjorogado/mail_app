/**
 * MailboxesPanel - Componente del panel lateral de mailboxes
 * Maneja la creación y gestión del panel de mailboxes con header, lista y footer
 */

import { MailboxItemComponent } from '../ui/MailboxItem.js';
import { ButtonComponent } from '../ui/Button.js';
import { MESSAGES } from '../../config/textConstants.js';

export class MailboxesPanel {
  /**
   * Crea el panel de mailboxes completo
   * @param {Object} handlers - Handlers de eventos
   * @returns {HTMLElement} Panel de mailboxes creado
   */
  static create(handlers) {
    const panel = document.createElement('div');
    panel.className = 'panel-section mailboxes-section';
    panel.id = 'mailboxesPanel';

    const content = document.createElement('div');
    content.className = 'section-content';

    // Header
    const header = this.createHeader(handlers);
    content.appendChild(header);

    // Lista de mailboxes
    const mailboxesList = this.createMailboxesList(handlers);
    content.appendChild(mailboxesList);

    // Botón de redactar
    const composeButton = this.createComposeButton(handlers);
    content.appendChild(composeButton);

    // Footer con información de cuenta
    const footer = this.createAccountFooter(handlers);
    content.appendChild(footer);

    panel.appendChild(content);
    return panel;
  }

  /**
   * Crea el header de mailboxes
   * @param {Object} handlers - Handlers de eventos
   * @returns {HTMLElement} Header creado
   */
  static createHeader(handlers) {
    const header = document.createElement('div');
    header.className = 'flex justify-between items-center mb-4';

    const title = document.createElement('h2');
    title.className = 'headline';
    title.style.cssText = 'margin: 0; font-family: Helvetica, Arial, sans-serif';
    title.textContent = MESSAGES.MAILBOX_NAMES.TITLE || 'Mailboxes';
    header.appendChild(title);

    const editButton = ButtonComponent.create({
      text: MESSAGES.BUTTONS.EDIT_MAILBOXES || 'Editar',
      className: 'edit-button',
      onClick: handlers.onEditMailboxes,
      title: 'Editar buzones'
    });
    header.appendChild(editButton);

    return header;
  }

  /**
   * Crea la lista de mailboxes
   * @param {Object} handlers - Handlers de eventos
   * @returns {HTMLElement} Lista de mailboxes creada
   */
  static createMailboxesList(handlers) {
    const list = document.createElement('div');
    list.className = 'space-y-1 mb-4';

    // Mailboxes predefinidos
    const mailboxes = [
      { id: 'all', type: 'all', label: MESSAGES.MAILBOX_NAMES.all || 'Recibidos' },
      { id: 'unread', type: 'unread', label: MESSAGES.MAILBOX_NAMES.unread || 'No leídos' },
      { id: 'today', type: 'today', label: MESSAGES.MAILBOX_NAMES.today || 'Hoy' },
      { id: 'flagged', type: 'flagged', label: MESSAGES.MAILBOX_NAMES.flagged || 'Con indicador' }
    ];

    // Crear items
    const fragment = MailboxItemComponent.createMultiple(mailboxes, handlers.onMailboxClick);
    list.appendChild(fragment);

    return list;
  }

  /**
   * Crea el botón de redactar
   * @param {Object} handlers - Handlers de eventos
   * @returns {HTMLButtonElement} Botón creado
   */
  static createComposeButton(handlers) {
    return ButtonComponent.withIcon(
      'COMPOSE',
      MESSAGES.BUTTONS.COMPOSE || 'Escribir',
      {
        className: 'compose-button',
        onClick: handlers.onCompose,
        title: 'Redactar nuevo mensaje'
      }
    );
  }

  /**
   * Crea el footer con información de cuenta
   * @param {Object} handlers - Handlers de eventos
   * @returns {HTMLElement} Footer creado
   */
  static createAccountFooter(handlers) {
    const footer = document.createElement('div');
    footer.className = 'section-footer';

    const container = document.createElement('div');
    container.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    `;

    // Información de cuenta actual
    const accountSpan = document.createElement('span');
    accountSpan.id = 'currentAccount';
    accountSpan.className = 'account-alias';
    accountSpan.textContent = 'Gmail';
    accountSpan.title = '';
    container.appendChild(accountSpan);

    // Botón de logout
    const logoutLink = document.createElement('a');
    logoutLink.href = '#';
    logoutLink.id = 'logout-button';
    logoutLink.className = 'link-button';
    logoutLink.textContent = MESSAGES.BUTTONS.LOGOUT || 'Logout';
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (handlers.onLogout) handlers.onLogout();
    });
    container.appendChild(logoutLink);

    footer.appendChild(container);
    return footer;
  }

  /**
   * Actualiza la información de cuenta actual
   * @param {HTMLElement} panel - Panel de mailboxes
   * @param {Object} account - Información de la cuenta
   */
  static updateAccountInfo(panel, account) {
    if (!panel) return;

    const accountElement = panel.querySelector('#currentAccount');
    if (accountElement && account) {
      const displayName = account.alias || account.provider || 'Gmail';
      accountElement.textContent = displayName;
      accountElement.title = account.email || '';
    }
  }
}
