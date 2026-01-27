/**
 * Application Constants
 * Centraliza todas las constantes de la aplicación
 */

module.exports = {
  // Google OAuth Configuration
  GOOGLE: {
    CLIENT_ID: "30387474326-a17tkpngohmibqdllm9t1c2erme98g66.apps.googleusercontent.com",
    CLIENT_SECRET: "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",
    REDIRECT_URI: "urn:ietf:wg:oauth:2.0:oob",
    SCOPES: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/userinfo.email"
    ]
  },

  // OAuth Configuration
  OAUTH: {
    OAUTH_CALLBACK_PATH: "/oauth2callback",
    OAUTH_HOST: "127.0.0.1",
    OAUTH_PORT: 0, // 0 = auto-assign
    ACCESS_TYPE: "offline",
    PROMPT: "consent"
  },

  // Gmail API Configuration
  GMAIL: {
    API_VERSION: "v1",
    MAX_RESULTS: 10,
    DEFAULT_FOLDER: "INBOX",
    FOLDERS: {
      INBOX: "in:inbox",
      SENT: "in:sent",
      DRAFTS: "in:drafts",
      TRASH: "in:trash"
    }
  },

  // Calendar API Configuration
  CALENDAR: {
    API_VERSION: "v3",
    CALENDAR_ID: "primary",
    MAX_RESULTS: 10,
    ORDER_BY: "startTime"
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
    AUTHENTICATION: "authentication",
    NETWORK: "network",
    ACCOUNT_NOT_FOUND: "account_not_found",
    VALIDATION: "validation",
    UNKNOWN: "unknown"
  },

  // Messages
  MESSAGES: {
    ACCOUNT_ADDED: "Gmail account added successfully!",
    ACCOUNT_REMOVED: "Account removed successfully",
    EMAIL_SENT: "Email sent successfully!",
    EMAIL_SENDING: "Sending email...",
    LOADING: "Loading...",
    ADDING: "Adding...",
    NO_ACCOUNTS: "No accounts",
    NO_EMAILS: "No emails in this folder",
    CONFIRM_DELETE: (email) => `Are you sure you want to remove account "${email}"?`,
    AUTH_ERROR: "Authentication error. Please re-authenticate your account.",
    NETWORK_ERROR: "Network error. Please check your connection.",
    GENERIC_ERROR: "An error occurred. Please try again."
  }
};
