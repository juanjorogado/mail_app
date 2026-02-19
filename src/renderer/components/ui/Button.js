/**
 * ButtonComponent - Componente de botón reutilizable
 * Soporta diferentes tipos, estilos y estados
 */

import { IconComponent } from '../icons/IconComponent.js';

export class ButtonComponent {
  /**
   * Crea un botón con configuración flexible
   * @param {Object} config - Configuración del botón
   * @returns {HTMLButtonElement} Botón creado
   */
  static create(config = {}) {
    const {
      text = '',
      icon = null,
      variant = 'primary', // primary, secondary, danger, ghost
      size = 'medium', // small, medium, large
      disabled = false,
      loading = false,
      title = '',
      className = '',
      onClick = null,
      attributes = {}
    } = config;

    const button = document.createElement('button');
    
    // Clases base
    const baseClasses = ['button'];
    baseClasses.push(`button-${variant}`);
    baseClasses.push(`button-${size}`);
    
    if (disabled) baseClasses.push('button-disabled');
    if (loading) baseClasses.push('button-loading');
    if (className) baseClasses.push(...className.split(' '));
    
    button.className = baseClasses.join(' ');
    button.disabled = disabled || loading;
    
    if (title) button.setAttribute('title', title);

    // Contenido del botón
    if (loading) {
      const loadingIcon = IconComponent.create('LOADING', { 
        className: 'button-loading-icon' 
      });
      IconComponent.animate(loadingIcon, 'spin');
      button.appendChild(loadingIcon);
      
      if (text) {
        const span = document.createElement('span');
        span.textContent = text;
        span.className = 'button-text';
        button.appendChild(span);
      }
    } else {
      // Icono (si existe)
      if (icon) {
        const iconElement = typeof icon === 'string' 
          ? IconComponent.create(icon, { className: 'button-icon' })
          : icon;
        button.appendChild(iconElement);
      }

      // Texto (si existe)
      if (text) {
        const span = document.createElement('span');
        span.textContent = text;
        span.className = 'button-text';
        button.appendChild(span);
      }
    }

    // Event listeners
    if (onClick && typeof onClick === 'function') {
      button.addEventListener('click', onClick);
    }

    // Atributos adicionales
    Object.entries(attributes).forEach(([key, value]) => {
      button.setAttribute(key, value);
    });

    return button;
  }

  /**
   * Crea un botón primario
   */
  static primary(config = {}) {
    return this.create({ ...config, variant: 'primary' });
  }

  /**
   * Crea un botón secundario
   */
  static secondary(config = {}) {
    return this.create({ ...config, variant: 'secondary' });
  }

  /**
   * Crea un botón de peligro
   */
  static danger(config = {}) {
    return this.create({ ...config, variant: 'danger' });
  }

  /**
   * Crea un botón fantasma (solo borde)
   */
  static ghost(config = {}) {
    return this.create({ ...config, variant: 'ghost' });
  }

  /**
   * Crea un botón con icono
   */
  static withIcon(iconName, text, options = {}) {
    return this.create({
      icon: iconName,
      text,
      ...options
    });
  }

  /**
   * Crea un botón de solo icono
   */
  static iconOnly(iconName, options = {}) {
    return this.create({
      icon: iconName,
      ...options
    });
  }

  /**
   * Establece estado de loading
   * @param {HTMLButtonElement} button - Botón a modificar
   * @param {boolean} loading - Estado de loading
   */
  static setLoading(button, loading = true) {
    if (loading) {
      button.disabled = true;
      button.classList.add('button-loading');
      
      // Agregar icono de loading si no existe
      if (!button.querySelector('.button-loading-icon')) {
        const loadingIcon = IconComponent.create('LOADING', { 
          className: 'button-loading-icon' 
        });
        IconComponent.animate(loadingIcon, 'spin');
        
        // Insertar al principio
        if (button.firstChild) {
          button.insertBefore(loadingIcon, button.firstChild);
        } else {
          button.appendChild(loadingIcon);
        }
      }
    } else {
      button.disabled = false;
      button.classList.remove('button-loading');
      
      // Remover icono de loading
      const loadingIcon = button.querySelector('.button-loading-icon');
      if (loadingIcon) {
        IconComponent.stopAnimation(loadingIcon);
        loadingIcon.remove();
      }
    }
  }

  /**
   * Establece estado disabled
   * @param {HTMLButtonElement} button - Botón a modificar
   * @param {boolean} disabled - Estado disabled
   */
  static setDisabled(button, disabled = true) {
    button.disabled = disabled;
    if (disabled) {
      button.classList.add('button-disabled');
    } else {
      button.classList.remove('button-disabled');
    }
  }
}
