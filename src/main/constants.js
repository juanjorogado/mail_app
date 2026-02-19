/**
 * Main Process Constants - Constantes centralizadas para main.js
 * Extrae todo el código hardcodeado del proceso principal
 */

// Window Configuration
const WINDOW_CONFIG = {
  DEFAULT_WIDTH: 800,
  DEFAULT_HEIGHT: 600,
  MIN_WIDTH: 600,
  MIN_HEIGHT: 400,
  MAX_WIDTH: 1600,
  MAX_HEIGHT: 1200,
};

// Paths
const PATHS = {
  RENDERER_INDEX: "../renderer/index.html",
  COMPOSE_HTML: "../renderer/pages/compose.html",
  PRELOAD_SCRIPT: "preload.js",
  ENV_FILE: ".env",
  PARENT_ENV_FILE: "../../.env",
};

// Messages and Strings
const MESSAGES = {
  APP_STARTING: "Application starting",
  CONFIG_MISSING: "Missing required configuration",
  CONFIG_MISSING_DEV: "Application running with missing credentials. Configure .env file for full functionality.",
  APP_START_BLOCKED: "Application cannot start without proper configuration",
  ENV_NOT_FOUND: "Environment file not found, trying parent directories...",
  ENV_LOADED_PARENT: "Environment file loaded from parent directory",
  ENV_NOT_FOUND_ANY: "No environment file found in any location",
  COMPOSE_OPEN: "Opening compose window",
  COMPOSE_LOADED: "Compose window loaded successfully",
  COMPOSE_CLOSED: "Compose window closed",
  EMAIL_DELETION_REQUESTED: "Email deletion requested",
  CACHE_SET: "Almacenar en caché",
  CACHE_HIT: "Obtener del caché",
  VALIDATION_FAILED: "Validation failed",
};

// Error Messages
const ERROR_MESSAGES = {
  ACCOUNT_NOT_FOUND: "Account not found or token missing",
  EMAIL_ID_INVALID: "Invalid Email ID format",
  FOLDER_REQUIRED: "Valid folder is required",
  ACCOUNT_ID_REQUIRED: "Valid Account ID is required",
  EMAIL_ID_REQUIRED: "Valid Email ID is required",
  PAGE_INVALID: "Page must be a positive number",
  PAGE_SIZE_INVALID: "Page size must be between 1 and 100",
  QUERY_REQUIRED: "Valid search query is required",
  QUERY_TOO_SHORT: "Search query must be at least 2 characters long",
  QUERY_TOO_LONG: "Search query too long (max 200 characters)",
  INVALID_CHARACTERS: "Invalid characters in search query",
  NETWORK_ERROR: "Error de comunicación. Verifica tu conexión a internet.",
  NO_INTERNET: "Sin conexión a internet. Por favor verifica tu conexión.",
  TIMEOUT_ERROR: "La solicitud tardó demasiado. Por favor intenta de nuevo.",
  AUTH_ERROR: "Sesión expirada. Por favor vuelve a iniciar sesión.",
  UNKNOWN_ERROR: "Unknown error",
  CRITICAL_INIT_ERROR: "Error al Inicializar la Aplicación",
  CRITICAL_INIT_DESC: "No se pudo inicializar la aplicación de correo. Por favor, recarga la página o contacta al soporte técnico.",
  CRITICAL_ERROR_DETAILS: "Ver detalles del error",
  CRITICAL_ERROR_UNKNOWN: "Error desconocido",
  CRITICAL_ERROR_TITLE: "Error Crítico",
  CRITICAL_ERROR_DESC: "No se pudo iniciar la aplicación.",
  RETRY_BUTTON: "Recargar Aplicación",
  RETRY_BUTTON_SHORT: "Reintentar",
};

// Limits and Timeouts
const LIMITS = {
  SEARCH_QUERY_MIN: 2,
  SEARCH_QUERY_MAX: 200,
  EMAIL_PAGE_SIZE_MIN: 1,
  EMAIL_PAGE_SIZE_MAX: 100,
  CACHE_TTL_SHORT: 5 * 60 * 1000, // 5 minutes
  CACHE_TTL_MEDIUM: 10 * 60 * 1000, // 10 minutes
  CACHE_TTL_LONG: 30 * 60 * 1000, // 30 minutes
  MAX_COUNT_DISPLAY: 99,
  NOTIFICATION_DEFAULT: 3000,
  NOTIFICATION_LONG: 5000,
  NOTIFICATION_SHORT: 2000,
};

// Window Settings
const COMPOSE_WINDOW = {
  WIDTH: 600,
  HEIGHT: 550,
  PARENT_MODAL: true,
  SHOW_DEVTOOLS: false,
};

// Performance Monitoring
const PERFORMANCE = {
  ENABLE_LOGGING: true,
  LOG_LEVEL: "info",
  METRICS_INTERVAL: 30000, // 30 seconds
};

// Security
const SECURITY = {
  VALIDATION_ERROR_PREFIX: "Validation failed",
  DANGEROUS_CHARS: /[<>'"&]/,
  LOG_VALIDATION_ERRORS: true,
  LOG_SECURITY_EVENTS: true,
};

// API Endpoints (for logging purposes)
const API_ENDPOINTS = {
  GMAIL_MESSAGES: "/gmail/messages",
  GMAIL_SEND: "/gmail/send",
  GMAIL_SEARCH: "/gmail/search",
  GMAIL_MODIFY: "/gmail/messages/{id}/modify",
  GMAIL_DELETE: "/gmail/messages/{id}",
  CALENDAR_EVENTS: "/calendar/events",
};

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
};

// Exportar como CommonJS
module.exports = {
  WINDOW_CONFIG,
  PATHS,
  MESSAGES,
  ERROR_MESSAGES,
  LIMITS,
  COMPOSE_WINDOW,
  PERFORMANCE,
  SECURITY,
  API_ENDPOINTS,
  HTTP_STATUS,
};
