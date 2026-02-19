/**
 * OnboardingScreen - Componente de pantalla de bienvenida
 * Maneja la pantalla inicial de conexión de cuenta
 */

import { ButtonComponent } from '../ui/Button.js';
import { IconComponent } from '../icons/IconComponent.js';
import { MESSAGES } from '../../config/textConstants.js';

export class OnboardingScreen {
  /**
   * Crea la pantalla de onboarding
   * @param {Object} options - Opciones de configuración
   * @returns {HTMLElement} Pantalla creada
   */
  static create(options = {}) {
    const {
      onConnectAccount = null,
      title = MESSAGES.ONBOARDING_TITLE || 'para empezar, conecta una cuenta de Gmail',
      buttonText = MESSAGES.BUTTONS.CONNECT || 'Conectar con Google'
    } = options;

    const screen = document.createElement('div');
    screen.id = 'onboarding-screen';
    screen.className = 'onboarding-screen';

    // Logo
    const logoContainer = this.createLogo();
    screen.appendChild(logoContainer);

    // Contenedor de texto y botón
    const textButtonContainer = this.createTextButtonContainer(title, buttonText, onConnectAccount);
    screen.appendChild(textButtonContainer);

    return screen;
  }

  /**
   * Crea el contenedor del logo
   * @returns {HTMLElement} Contenedor del logo
   */
  static createLogo() {
    const logoContainer = document.createElement('div');
    logoContainer.className = 'logo';

    const logo = document.createElement('img');
    logo.src = './assets/logo.svg';
    logo.alt = 'Mail App Logo';
    logo.onerror = () => {
      // Fallback si el logo no carga
      logo.style.display = 'none';
      const fallbackText = document.createElement('h1');
      fallbackText.textContent = 'Mail App';
      fallbackText.className = 'logo-fallback';
      logoContainer.appendChild(fallbackText);
    };

    logoContainer.appendChild(logo);
    return logoContainer;
  }

  /**
   * Crea el contenedor con texto y botón
   * @param {string} title - Título de la pantalla
   * @param {string} buttonText - Texto del botón
   * @param {Function} onConnect - Handler de conexión
   * @returns {HTMLElement} Contenedor creado
   */
  static createTextButtonContainer(title, buttonText, onConnect) {
    const container = document.createElement('div');
    container.className = 'onboarding-text-button-container';

    // Título
    const titleElement = document.createElement('h1');
    titleElement.textContent = title;
    container.appendChild(titleElement);

    // Botón de conexión
    const connectButton = ButtonComponent.withIcon('GOOGLE', buttonText, {
      className: 'connect-button',
      onClick: onConnect,
      title: 'Conectar cuenta de Gmail'
    });
    connectButton.id = 'connect-account-button';
    container.appendChild(connectButton);

    return container;
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
   * Establece estado de loading en el botón
   * @param {HTMLElement} screen - Elemento de pantalla
   * @param {boolean} loading - Estado de loading
   */
  static setLoading(screen, loading = true) {
    if (!screen) return;

    const button = screen.querySelector('#connect-account-button');
    if (button) {
      ButtonComponent.setLoading(button, loading);
    }
  }

  /**
   * Actualiza el mensaje de error
   * @param {HTMLElement} screen - Elemento de pantalla
   * @param {string} error - Mensaje de error
   */
  static showError(screen, error) {
    if (!screen) return;

    // Remover error anterior si existe
    const existingError = screen.querySelector('.onboarding-error');
    if (existingError) {
      existingError.remove();
    }

    // Crear nuevo mensaje de error
    const errorElement = document.createElement('div');
    errorElement.className = 'onboarding-error';
    errorElement.textContent = error;

    // Insertar después del botón
    const button = screen.querySelector('#connect-account-button');
    if (button && button.parentNode) {
      button.parentNode.insertBefore(errorElement, button.nextSibling);
    }
  }

  /**
   * Limpia mensajes de error
   * @param {HTMLElement} screen - Elemento de pantalla
   */
  static clearError(screen) {
    if (!screen) return;

    const errorElement = screen.querySelector('.onboarding-error');
    if (errorElement) {
      errorElement.remove();
    }
  }

  /**
   * Obtiene el botón de conexión
   * @param {HTMLElement} screen - Elemento de pantalla
   * @returns {HTMLButtonElement|null} Botón de conexión
   */
  static getConnectButton(screen) {
    return screen ? screen.querySelector('#connect-account-button') : null;
  }
}
