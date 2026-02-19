/**
 * ErrorScreen - Componente para mostrar errores críticos de inicialización
 * Reemplaza el código hardcodeado en main.js
 */

import { MESSAGES } from '../../config/textConstants.js';

export class ErrorScreen {
  /**
   * Muestra pantalla de error crítico
   * @param {Error} error - Error que causó el problema
   * @param {string} title - Título del error (opcional)
   * @param {string} message - Mensaje del error (opcional)
   */
  static show(error, title = null, message = null) {
    if (!document.body) return;

    const errorData = {
      title: title || MESSAGES.ERROR_CRITICAL_TITLE || 'Error Crítico',
      message: message || MESSAGES.ERROR_CRITICAL_DESC || 'No se pudo iniciar la aplicación.',
      details: error.stack || error.message || MESSAGES.ERROR_CRITICAL_UNKNOWN,
      buttonText: MESSAGES.ERROR_CRITICAL_BUTTON || 'Recargar Aplicación'
    };

    document.body.innerHTML = this.createErrorHTML(errorData);
  }

  /**
   * Crea el HTML para la pantalla de error usando DOM API
   * @param {Object} errorData - Datos del error
   * @returns {string} HTML de la pantalla de error
   */
  static createErrorHTML(errorData) {
    // Crear elementos DOM en lugar de usar template strings
    const screen = document.createElement('div');
    screen.className = 'error-screen';

    const container = document.createElement('div');
    container.className = 'error-container';

    const title = document.createElement('h1');
    title.className = 'error-title';
    title.textContent = errorData.title;

    const message = document.createElement('p');
    message.className = 'error-message';
    message.textContent = errorData.message;

    const details = document.createElement('details');
    details.className = 'error-details';

    const summary = document.createElement('summary');
    summary.className = 'error-details-toggle';
    summary.textContent = MESSAGES.ERROR_CRITICAL_DETAILS || 'Ver detalles del error';

    const stack = document.createElement('pre');
    stack.className = 'error-stack';
    stack.textContent = errorData.details;

    const button = document.createElement('button');
    button.className = 'error-reload-btn';
    button.textContent = errorData.buttonText;
    button.onclick = () => window.location.reload();

    // Ensamblar estructura
    details.appendChild(summary);
    details.appendChild(stack);

    container.appendChild(title);
    container.appendChild(message);
    container.appendChild(details);
    container.appendChild(button);

    screen.appendChild(container);

    return screen.outerHTML;
  }

  /**
   * Oculta la pantalla de error (si existe)
   */
  static hide() {
    const errorScreen = document.querySelector('.error-screen');
    if (errorScreen) {
      errorScreen.remove();
    }
  }
}
