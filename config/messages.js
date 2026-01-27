/**
 * Application Messages
 * Centraliza todos los mensajes de la aplicación
 */

module.exports = {
  // Success Messages
  SUCCESS: {
    ACCOUNT_ADDED: 'Gmail account added successfully!',
    ACCOUNT_REMOVED: 'Account removed successfully',
    EMAIL_SENT: 'Email sent successfully!',
    TOKENS_REFRESHED: 'Tokens refreshed and saved'
  },

  // Error Messages
  ERROR: {
    ACCOUNT_NOT_FOUND: 'Account not found',
    TOKEN_MISSING: 'Token missing',
    ACCOUNT_ID_REQUIRED: 'Account ID is required',
    EMAIL_ID_REQUIRED: 'Email ID is required',
    PAYLOAD_REQUIRED: 'Payload is required',
    INVALID_EMAIL: 'Invalid email address',
    SUBJECT_REQUIRED: 'Subject is required',
    BODY_REQUIRED: 'Body is required',
    ACCOUNT_SELECTION_REQUIRED: 'Account selection is required',
    RECIPIENT_REQUIRED: 'Recipient email is required',
    SUBJECT_TOO_LONG: 'Subject must be 200 characters or less',
    BODY_TOO_LONG: 'Body must be 10,000 characters or less',
    FAILED_TO_LOAD_ACCOUNTS: 'Failed to load accounts',
    FAILED_TO_LOAD_EMAILS: 'Failed to load emails',
    FAILED_TO_LOAD_EMAIL_DETAILS: 'Failed to load email details',
    FAILED_TO_SEND_EMAIL: 'Failed to send email. Please try again.',
    FAILED_TO_ADD_ACCOUNT: 'Failed to add Gmail account',
    FAILED_TO_REMOVE_ACCOUNT: 'Failed to remove account',
    FAILED_TO_LOAD_ACCOUNT_DATA: 'Failed to load account data. Please try again.',
    AUTHENTICATION_ERROR: 'Authentication error. Please re-authenticate your account.',
    NETWORK_ERROR: 'Network error. Please check your connection.',
    MISSING_CREDENTIALS: 'Missing Google client credentials. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment.',
    UNKNOWN_ERROR: 'Unknown error'
  },

  // Validation Messages
  VALIDATION: {
    INVALID_EMAIL_FORMAT: 'Invalid email address(es) in "To" field',
    SUBJECT_REQUIRED: 'Subject is required',
    SUBJECT_TOO_LONG: 'Subject must be 200 characters or less',
    BODY_REQUIRED: 'Body is required',
    BODY_TOO_LONG: 'Body must be 10,000 characters or less',
    ACCOUNT_REQUIRED: 'Account selection is required'
  },

  // UI Messages
  UI: {
    NO_ACCOUNTS: 'No accounts',
    NO_EMAILS: 'No emails in this folder',
    LOADING: 'Loading...',
    ADDING: 'Adding...',
    SENDING: 'Sending...',
    NO_SUBJECT: 'No Subject',
    UNKNOWN: 'Unknown',
    NO_TITLE: 'No Title',
    NO_CONTENT: 'No content',
    AUTHENTICATION_COMPLETE: 'Authentication complete. You can close this window.',
    CONFIRM_DELETE_ACCOUNT: 'Are you sure you want to remove account'
  },

  // Button Labels
  BUTTONS: {
    COMPOSE: 'Compose',
    ADD_GMAIL: 'Add Gmail Account',
    SEND: 'Send',
    CLOSE: 'Close',
    VIEW: 'View',
    DELETE: '×'
  }
};
