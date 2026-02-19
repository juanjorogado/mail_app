/**
 * MailboxItemComponent - Componente para items de buzón
 * Maneja estado, conteos y selección de forma reutilizable
 */

import { IconComponent } from '../icons/IconComponent.js';

export class MailboxItemComponent {
  /**
   * Crea un item de buzón
   * @param {Object} config - Configuración del item
   * @returns {HTMLElement} Item de buzón creado
   */
  static create(config = {}) {
    const {
      id = '',
      type = '', // all, unread, today, flagged
      label = '',
      count = 0,
      active = false,
      onClick = null
    } = config;

    const item = document.createElement('div');
    item.className = 'mailbox-item';
    item.setAttribute('data-mailbox', type);
    item.setAttribute('data-id', id);

    if (active) {
      item.classList.add('active');
    }

    // Contenedor principal
    const container = document.createElement('div');
    container.className = 'mailbox-item-content';

    // Label del buzón
    const labelSpan = document.createElement('span');
    labelSpan.className = 'mailbox-label';
    labelSpan.textContent = label;
    container.appendChild(labelSpan);

    // Badge de contador
    const badgeSpan = document.createElement('span');
    badgeSpan.className = 'badge';
    badgeSpan.id = `count-${type}`;
    
    // Actualizar contador
    this.updateCount(badgeSpan, count);
    container.appendChild(badgeSpan);

    item.appendChild(container);

    // Event listener
    if (onClick && typeof onClick === 'function') {
      item.addEventListener('click', (event) => {
        // Remover active de otros items
        document.querySelectorAll('.mailbox-item').forEach(mb => {
          mb.classList.remove('active');
        });
        
        // Activar este item
        item.classList.add('active');
        
        onClick(event, { id, type, label, count });
      });
    }

    return item;
  }

  /**
   * Actualiza el contador de un item
   * @param {HTMLElement} badgeElement - Elemento badge
   * @param {number} count - Nuevo contador
   */
  static updateCount(badgeElement, count) {
    if (!badgeElement) return;

    const displayCount = count > 99 ? '99+' : count.toString();
    badgeElement.textContent = displayCount;
    badgeElement.style.display = count > 0 ? 'inline' : 'none';
  }

  /**
   * Establece estado activo
   * @param {HTMLElement} itemElement - Elemento item
   * @param {boolean} active - Estado activo
   */
  static setActive(itemElement, active = true) {
    if (!itemElement) return;

    if (active) {
      itemElement.classList.add('active');
    } else {
      itemElement.classList.remove('active');
    }
  }

  /**
   * Obtiene el tipo de buzón de un item
   * @param {HTMLElement} itemElement - Elemento item
   * @returns {string} Tipo de buzón
   */
  static getType(itemElement) {
    return itemElement?.getAttribute('data-mailbox') || '';
  }

  /**
   * Obtiene el ID de un item
   * @param {HTMLElement} itemElement - Elemento item
   * @returns {string} ID del item
   */
  static getId(itemElement) {
    return itemElement?.getAttribute('data-id') || '';
  }

  /**
   * Crea múltiples items de buzón
   * @param {Array} mailboxes - Array de configuraciones de mailboxes
   * @param {Function} onItemClick - Handler de clic
   * @returns {DocumentFragment} Fragmento con items
   */
  static createMultiple(mailboxes, onItemClick) {
    const fragment = document.createDocumentFragment();
    
    mailboxes.forEach(mailbox => {
      const item = this.create({
        ...mailbox,
        onClick: onItemClick
      });
      fragment.appendChild(item);
    });

    return fragment;
  }

  /**
   * Encuentra un item por tipo
   * @param {string} type - Tipo de buzón a buscar
   * @returns {HTMLElement|null} Item encontrado
   */
  static findByType(type) {
    return document.querySelector(`[data-mailbox="${type}"]`);
  }

  /**
   * Limpia todos los estados activos
   */
  static clearAllActive() {
    document.querySelectorAll('.mailbox-item.active').forEach(item => {
      item.classList.remove('active');
    });
  }

  /**
   * Actualiza todos los contadores
   * @param {Object} counts - Objeto con contadores por tipo
   */
  static updateAllCounts(counts) {
    Object.entries(counts).forEach(([type, count]) => {
      const badge = document.getElementById(`count-${type}`);
      if (badge) {
        this.updateCount(badge, count);
      }
    });
  }
}
