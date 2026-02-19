/**
 * Application Constants
 * Centraliza todas las constantes de la aplicación
 */

module.exports = {
  // Google OAuth Configuration
  // IMPORTANT: For production, set these in your .env file
  // Never commit real credentials to version control
  GOOGLE: {
    CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
    CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
    REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth2callback',
    SCOPES: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/userinfo.email'
    ]
  },

  // OAuth Configuration
  OAUTH: {
    OAUTH_CALLBACK_PATH: '/oauth2callback',
    OAUTH_HOST: '127.0.0.1',
    OAUTH_PORT: 0, // 0 = auto-assign
    ACCESS_TYPE: 'offline',
    PROMPT: 'consent'
  },

  // Gmail API Configuration
  GMAIL: {
    API_VERSION: 'v1',
    MAX_RESULTS: 10,
    DEFAULT_FOLDER: 'INBOX',
    FOLDERS: {
      INBOX: 'in:inbox',
      SENT: 'in:sent',
      DRAFTS: 'in:drafts',
      TRASH: 'in:trash',
      UNREAD: 'is:unread',
      TODAY: 'newer_than:1d',
      STARRED: 'is:starred'
    }
  },

  // Penpot API Configuration
  PENPOT: {
    API_BASE_URL: process.env.PENPOT_API_URL || 'https://penpot.app/api',
    DEFAULT_LIMIT: 20,
    EXPORT_FORMATS: ['svg', 'png', 'jpg', 'pdf'],
    SHARING_OPTIONS: {
      PUBLIC: 'public',
      PRIVATE: 'private',
      PASSWORD: 'password'
    }
  },

  // Calendar API Configuration
  CALENDAR: {
    API_VERSION: 'v3',
    CALENDAR_ID: 'primary',
    MAX_RESULTS: 10,
    ORDER_BY: 'startTime'
  },


  // Validation Limits
  VALIDATION: {
    SUBJECT_MAX_LENGTH: 200,
    BODY_MAX_LENGTH: 10000,
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },

  // Window Configuration
  WINDOWS: {
    MAIN: {
      WIDTH: 800,
      HEIGHT: 600,
      MIN_WIDTH: 600,
      MIN_HEIGHT: 400
    },
    COMPOSE: {
      WIDTH: 600,
      HEIGHT: 500,
      MIN_WIDTH: 500,
      MIN_HEIGHT: 400
    },
    OAUTH: {
      WIDTH: 800,
      HEIGHT: 900
    }
  },

  // Notification Configuration
  NOTIFICATIONS: {
    DEFAULT_DURATION: 3000,
    ERROR_DURATION: 5000,
    SUCCESS_DURATION: 3000,
    INFO_DURATION: 3000,
    WARNING_DURATION: 4000,
    POSITION: {
      TOP: 20,
      RIGHT: 20
    },
    Z_INDEX: 10000
  },

  // UI Configuration
  UI: {
    MODAL_Z_INDEX: 10000,
    CLOSE_DELAY: 1000, // Delay before closing compose window after send
    ANIMATION_DURATION: 300
  },

  // Error Types
  ERROR_TYPES: {
    AUTHENTICATION: 'authentication',
    NETWORK: 'network',
    ACCOUNT_NOT_FOUND: 'account_not_found',
    VALIDATION: 'validation',
    UNKNOWN: 'unknown'
  },

  // Messages
  MESSAGES: {
    ACCOUNT_ADDED: 'Gmail account added successfully!',
    ACCOUNT_REMOVED: 'Account removed successfully',
    EMAIL_SENT: 'Email sent successfully!',
    EMAIL_SENDING: 'Sending email...',
    LOADING: 'Loading...',
    ADDING: 'Adding...',
    NO_ACCOUNTS: 'No accounts',
    NO_EMAILS: 'No emails in this folder',
    CONFIRM_DELETE: (email) => `Are you sure you want to remove account "${email}"?`,
    AUTH_ERROR: 'Authentication error. Please re-authenticate your account.',
    NETWORK_ERROR: 'Network error. Please check your connection.',
    GENERIC_ERROR: 'An error occurred. Please try again.'
  }
};
