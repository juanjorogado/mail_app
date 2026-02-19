/**
 * IconComponent - Componente reutilizable para iconos SVG
 * Renderiza iconos dinámicamente desde definiciones centralizadas
 */

import { ICONS } from './icons.js';

export class IconComponent {
  /**
   * Crea un elemento SVG para un icono específico
   * @param {string} iconName - Nombre del icono en ICONS
   * @param {Object} options - Opciones adicionales
   * @returns {SVGElement} Elemento SVG creado
   */
  static create(iconName, options = {}) {
    const icon = ICONS[iconName];
    if (!icon) {
      console.warn(`Icon "${iconName}" not found`);
      return this.createFallbackIcon();
    }

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    
    // Atributos base del SVG
    svg.setAttribute('viewBox', icon.viewBox);
    svg.setAttribute('fill', icon.fill || 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', options.strokeWidth || '2');
    svg.setAttribute('stroke-linecap', options.strokeLinecap || 'round');
    svg.setAttribute('stroke-linejoin', options.strokeLinejoin || 'round');
    
    // Clases CSS
    const defaultClasses = ['icon'];
    if (options.className) {
      defaultClasses.push(...options.className.split(' '));
    }
    svg.setAttribute('class', defaultClasses.join(' '));

    // Crear elementos del SVG
    icon.elements.forEach(element => {
      const svgElement = this.createSVGElement(element);
      svg.appendChild(svgElement);
    });

    return svg;
  }

  /**
   * Crea un elemento SVG individual
   * @param {Object} element - Definición del elemento
   * @returns {SVGElement} Elemento SVG creado
   */
  static createSVGElement(element) {
    const { type, attrs } = element;
    
    let svgElement;
    
    switch (type) {
      case 'circle':
        svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        break;
      case 'line':
        svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        break;
      case 'path':
        svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        break;
      case 'polyline':
        svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        break;
      default:
        console.warn(`Unsupported SVG element type: ${type}`);
        return null;
    }

    // Aplicar atributos
    Object.entries(attrs).forEach(([key, value]) => {
      svgElement.setAttribute(key, value);
    });

    return svgElement;
  }

  /**
   * Crea un icono de fallback simple
   * @returns {SVGElement} Icono de fallback
   */
  static createFallbackIcon() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('class', 'icon icon-fallback');

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '12');
    circle.setAttribute('cy', '12');
    circle.setAttribute('r', '10');
    circle.setAttribute('stroke-dasharray', '2 2');

    svg.appendChild(circle);
    return svg;
  }

  /**
   * Crea un botón con icono
   * @param {string} iconName - Nombre del icono
   * @param {string} text - Texto del botón
   * @param {Object} options - Opciones del botón
   * @returns {HTMLButtonElement} Botón con icono
   */
  static createButton(iconName, text, options = {}) {
    const button = document.createElement('button');
    button.className = options.buttonClass || 'button';
    button.setAttribute('title', options.title || text);

    if (iconName) {
      const icon = this.create(iconName, { className: options.iconClass || 'icon-outline' });
      button.appendChild(icon);
    }

    if (text) {
      const span = document.createElement('span');
      span.textContent = text;
      button.appendChild(span);
    }

    // Event listeners
    if (options.onClick) {
      button.addEventListener('click', options.onClick);
    }

    return button;
  }

  /**
   * Crea un enlace con icono
   * @param {string} iconName - Nombre del icono
   * @param {string} text - Texto del enlace
   * @param {Object} options - Opciones del enlace
   * @returns {HTMLAnchorElement} Enlace con icono
   */
  static createLink(iconName, text, options = {}) {
    const link = document.createElement('a');
    link.href = options.href || '#';
    link.className = options.linkClass || 'link-button';
    link.setAttribute('title', options.title || text);

    if (iconName) {
      const icon = this.create(iconName, { className: options.iconClass || 'icon-outline' });
      link.appendChild(icon);
    }

    if (text) {
      const span = document.createElement('span');
      span.textContent = text;
      link.appendChild(span);
    }

    // Event listeners
    if (options.onClick) {
      link.addEventListener('click', options.onClick);
    }

    return link;
  }

  /**
   * Obtiene todos los nombres de iconos disponibles
   * @returns {Array} Lista de nombres de iconos
   */
  static getAvailableIcons() {
    return Object.keys(ICONS);
  }

  /**
   * Verifica si un icono existe
   * @param {string} iconName - Nombre del icono a verificar
   * @returns {boolean} True si el icono existe
   */
  static hasIcon(iconName) {
    return iconName in ICONS;
  }

  /**
   * Registra un nuevo icono dinámicamente
   * @param {string} name - Nombre del icono
   * @param {Object} definition - Definición del icono
   */
  static registerIcon(name, definition) {
    ICONS[name] = definition;
    console.log(`Icon "${name}" registered successfully`);
  }

  /**
   * Aplica animación a un icono
   * @param {SVGElement} iconElement - Elemento del icono
   * @param {string} animationType - Tipo de animación
   */
  static animate(iconElement, animationType) {
    switch (animationType) {
      case 'spin':
        iconElement.style.animation = 'spin 1s linear infinite';
        break;
      case 'pulse':
        iconElement.style.animation = 'pulse 2s ease-in-out infinite';
        break;
      case 'bounce':
        iconElement.style.animation = 'bounce 1s ease-in-out';
        break;
      default:
        console.warn(`Unknown animation type: ${animationType}`);
    }
  }

  /**
   * Detiene animaciones de un icono
   * @param {SVGElement} iconElement - Elemento del icono
   */
  static stopAnimation(iconElement) {
    iconElement.style.animation = '';
  }
}
