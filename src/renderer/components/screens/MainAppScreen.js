/**
 * MainAppScreen - Componente coordinador de pantalla principal
 * Coordina los componentes modulares para crear la interfaz principal
 */

import { MailboxesPanel } from './MailboxesPanel.js';
import { MessageListPanel } from './MessageListPanel.js';
import { MessageDetailPanel } from './MessageDetailPanel.js';

export class MainAppScreen {
  /**
   * Crea la pantalla principal de la aplicación
   * @param {Object} options - Opciones de configuración
   * @returns {HTMLElement} Pantalla creada
   */
  static create(options = {}) {
    const {
      onMailboxClick = null,
      onCompose = null,
      onEditMailboxes = null,
      onMessageAction = null,
      onSearch = null,
      onOptions = null,
      onLogout = null
    } = options;

    const screen = document.createElement('div');
    screen.id = 'main-app-screen';
    screen.className = 'main-app-screen hidden';

    // Panel principal
    const mainPanel = this.createMainPanel({
      onMailboxClick,
      onCompose,
      onEditMailboxes,
      onMessageAction,
      onSearch,
      onOptions
    });
    screen.appendChild(mainPanel);

    return screen;
  }

  /**
   * Crea el panel principal con las tres columnas
   * @param {Object} handlers - Handlers de eventos
   * @returns {HTMLElement} Panel principal creado
   */
  static createMainPanel(handlers) {
    const mainPanel = document.createElement('div');
    mainPanel.className = 'main-panel';

    // Columna izquierda: Mailboxes
    const mailboxesPanel = MailboxesPanel.create(handlers);
    mainPanel.appendChild(mailboxesPanel);

    // Divisor
    const divider1 = this.createDivider('mailboxes-messageList');
    mainPanel.appendChild(divider1);

    // Columna central: Lista de mensajes
    const messageListPanel = MessageListPanel.create(handlers);
    mainPanel.appendChild(messageListPanel);

    // Divisor
    const divider2 = this.createDivider('messageList-messageDetail');
    mainPanel.appendChild(divider2);

    // Columna derecha: Detalles del mensaje
    const messageDetailPanel = MessageDetailPanel.create(handlers);
    mainPanel.appendChild(messageDetailPanel);

    return mainPanel;
  }

  /**
   * Crea un divisor redimensionable
   * @param {string} resizeType - Tipo de redimensionamiento
   * @returns {HTMLElement} Divisor creado
   */
  static createDivider(resizeType) {
    const divider = document.createElement('div');
    divider.className = 'panel-divider resizable';
    divider.setAttribute('data-resize', resizeType);
    return divider;
  }

  /**
   * Muestra la pantalla
   * @param {HTMLElement} screen - Elemento de pantalla
   */
  static show(screen) {
    if (!screen) return;
    screen.classList.remove('hidden');
  }

  /**
   * Oculta la pantalla
   * @param {HTMLElement} screen - Elemento de pantalla
   */
  static hide(screen) {
    if (!screen) return;
    screen.classList.add('hidden');
  }

  /**
   * Actualiza la información de cuenta actual
   * @param {HTMLElement} screen - Elemento de pantalla
   * @param {Object} account - Información de la cuenta
   */
  static updateAccountInfo(screen, account) {
    if (!screen) return;
    MailboxesPanel.updateAccountInfo(screen.querySelector('#mailboxesPanel'), account);
  }

  /**
   * Actualiza el título de la lista de mensajes
   * @param {HTMLElement} screen - Elemento de pantalla
   * @param {string} title - Nuevo título
   * @param {string} count - Nuevo contador
   */
  static updateMessageListHeader(screen, title, count) {
    if (!screen) return;
    MessageListPanel.updateHeader(screen.querySelector('#messageListPanel'), title, count);
  }

  /**
   * Actualiza el contenido del mensaje
   * @param {HTMLElement} screen - Elemento de pantalla
   * @param {Object} message - Datos del mensaje
   */
  static updateMessageContent(screen, message) {
    if (!screen) return;
    MessageDetailPanel.updateMessage(screen.querySelector('#messageDetailPanel'), message);
  }
}
