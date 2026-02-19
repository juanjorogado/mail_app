/**
 * Client-side Notification System
 * Provides toast-style notifications for the renderer process
 */

const NotificationSystem = {
  container: null,

  /**
   * Initialize the notification container
   */
  init() {
    if (this.container) return;

    this.container = document.createElement('div');
    this.container.id = 'notification-container';
    this.container.className = 'notification-container';
    document.body.appendChild(this.container);

    // CSS is now imported via styles.css, no need to inject here
  },

  /**
   * Show a notification
   * @param {string} message - The message to display
   * @param {string} type - Type: success, error, warning, info, loading
   * @param {number} duration - Duration in ms (0 for persistent)
   * @returns {HTMLElement} The notification element
   */
  show(message, type = 'info', duration = 3000) {
    this.init();

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;

    // Icon based on type
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ',
      loading: '⏳'
    };

    const icon = document.createElement('span');
    icon.className = 'notification-icon';
    icon.textContent = icons[type] || icons.info;

    const messageEl = document.createElement('span');
    messageEl.className = 'notification-message';
    messageEl.textContent = message;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'notification-close';
    closeBtn.innerHTML = '×';
    closeBtn.onclick = () => this.remove(notification);

    notification.appendChild(icon);
    notification.appendChild(messageEl);
    notification.appendChild(closeBtn);
    this.container.appendChild(notification);

    // Auto-remove for non-loading notifications
    if (duration > 0 && type !== 'loading') {
      setTimeout(() => this.remove(notification), duration);
    }

    return notification;
  },

  /**
   * Remove a notification with animation
   * @param {HTMLElement} notification - The notification to remove
   */
  remove(notification) {
    if (!notification || !notification.parentNode) return;

    notification.style.animation = 'slideOut 0.3s ease-out forwards';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  },

  /**
   * Show a success notification
   * @param {string} message - The message
   * @param {number} duration - Duration in ms
   */
  success(message, duration = 3000) {
    return this.show(message, 'success', duration);
  },

  /**
   * Show an error notification
   * @param {string} message - The message
   * @param {number} duration - Duration in ms
   */
  error(message, duration = 5000) {
    return this.show(message, 'error', duration);
  },

  /**
   * Show a warning notification
   * @param {string} message - The message
   * @param {number} duration - Duration in ms
   */
  warning(message, duration = 4000) {
    return this.show(message, 'warning', duration);
  },

  /**
   * Show an info notification
   * @param {string} message - The message
   * @param {number} duration - Duration in ms
   */
  info(message, duration = 3000) {
    return this.show(message, 'info', duration);
  },

  /**
   * Show a loading notification (persistent until removed)
   * @param {string} message - The message
   */
  loading(message) {
    return this.show(message, 'loading', 0);
  },

  /**
   * Remove all notifications
   */
  removeAll() {
    if (!this.container) return;
    const notifications = this.container.querySelectorAll('.notification');
    notifications.forEach(n => this.remove(n));
  }
};

// Expose to window
window.showNotification = (message, type = 'info', duration = 3000) => {
  return NotificationSystem.show(message, type, duration);
};
window.removeNotification = (notification) => {
  NotificationSystem.remove(notification);
};
