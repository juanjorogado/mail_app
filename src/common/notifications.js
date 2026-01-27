/**
 * Notification System
 * Sistema de notificaciones visuales para feedback al usuario
 */

/**
 * Muestra una notificación toast en la UI
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duración en milisegundos (default: 3000)
 */
function showNotification(message, type = 'info', duration = 3000) {
  // Crear contenedor de notificaciones si no existe
  let container = document.getElementById('notification-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'notification-container';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
    `;
    document.body.appendChild(container);
  }

  // Crear notificación
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.style.cssText = `
    background-color: ${getColorForType(type)};
    color: white;
    padding: 15px 20px;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    min-width: 300px;
    max-width: 400px;
    animation: slideIn 0.3s ease-out;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 15px;
  `;

  const messageEl = document.createElement('span');
  messageEl.textContent = message;
  notification.appendChild(messageEl);

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.style.cssText = `
    background: none;
    border: none;
    color: white;
    font-size: 24px;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    line-height: 24px;
    opacity: 0.8;
  `;
  closeBtn.addEventListener('click', () => {
    removeNotification(notification);
  });
  notification.appendChild(closeBtn);

  container.appendChild(notification);

  // Auto-remover después de la duración
  if (duration > 0) {
    setTimeout(() => {
      removeNotification(notification);
    }, duration);
  }

  return notification;
}

function getColorForType(type) {
  const colors = {
    success: '#2ecc71',
    error: '#e74c3c',
    warning: '#f39c12',
    info: '#3498db'
  };
  return colors[type] || colors.info;
}

function removeNotification(notification) {
  notification.style.animation = 'slideOut 0.3s ease-out';
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 300);
}

// Agregar estilos de animación si no existen
if (!document.getElementById('notification-styles')) {
  const style = document.createElement('style');
  style.id = 'notification-styles';
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

// Exportar funciones globalmente
if (typeof window !== 'undefined') {
  window.showNotification = showNotification;
}
