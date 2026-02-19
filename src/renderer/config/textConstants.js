/**
 * Constantes de texto y mensajes centralizados
 * Elimina texto hardcodeado del código
 */

export const MESSAGES = {
  // UI Messages
  NO_MESSAGES: 'No hay mensajes en este buzón.',
  SELECT_MESSAGE: 'Selecciona un mensaje',
  MESSAGE_CONTENT_PLACEHOLDER: 'Contenido del mensaje seleccionado aparecerá aquí.',
  NO_SUBJECT: 'Sin asunto',
  UNKNOWN_SENDER: 'Unknown',
  NO_CONTENT: 'No se pudo cargar el cuerpo del mensaje.',
  
  // Message Labels
  MESSAGE_LABELS: {
    FROM: 'De:',
    TO: 'Para:',
    DATE: 'Fecha:'
  },
  
  // Onboarding
  ONBOARDING_TITLE: 'para empezar, conecta una cuenta de Gmail',
  
  // Mailbox Names
  MAILBOX_NAMES: {
    all: 'Recibidos',
    unread: 'No leídos', 
    today: 'Hoy',
    flagged: 'Destacados'
  },
  
  // Notifications
  NOTIFICATIONS: {
    ACCOUNT_CONNECTED: 'Cuenta de Gmail conectada exitosamente',
    ACCOUNT_CONNECT_ERROR: 'Error al conectar la cuenta de Google',
    EMAIL_LOADING: 'Cargando mensajes...',
    EMAIL_LOAD_ERROR: 'Error al cargar los mensajes',
    EMAIL_SENT: 'Email enviado exitosamente',
    EMAIL_DELETE_SUCCESS: 'Mensaje eliminado correctamente.',
    EMAIL_DELETE_ERROR: 'Error al eliminar el mensaje.',
    SEARCH_LOADING: 'Buscando...',
    SEARCH_RESULTS: (count) => `Encontrados ${count} mensajes.`,
    SEARCH_ERROR: 'Error en la búsqueda',
    NETWORK_ERROR: 'Error de comunicación. Verifica tu conexión a internet.',
    NO_INTERNET: 'Sin conexión a internet. Por favor verifica tu conexión.',
    TIMEOUT_ERROR: 'La solicitud tardó demasiado. Por favor intenta de nuevo.',
    AUTH_ERROR: 'Sesión expirada. Por favor vuelve a iniciar sesión.',
    NO_ACCOUNT: 'Por favor, conecta una cuenta primero.',
    NO_ACCOUNT_SEARCH: 'Conecta una cuenta primero para buscar.',
    NO_ACCOUNT_COMPOSE: 'Conecta una cuenta primero para escribir un mensaje.',
    NO_MESSAGE_SELECTED: 'Selecciona un mensaje para eliminar.',
    NO_MESSAGE_REPLY: 'No hay ningún mensaje seleccionado.',
    LOGOUT_CONFIRM: '¿Estás seguro de que deseas cerrar sesión? Se eliminará la cuenta de este dispositivo.',
    LOGOUT_SUCCESS: 'Sesión cerrada exitosamente',
    LOGOUT_ERROR: 'Error al cerrar sesión',
    COMING_SOON: 'Funcionalidad coming soon.',
    VALIDATION_ERROR: 'Error de validación',
  },
  
  // Counters
  COUNTER_LABELS: {
    messages: 'mensajes',
    search_results: (query) => `Resultados de búsqueda: "${query}"`
  },
  
  // Placeholders
  PLACEHOLDERS: {
    SEARCH_INPUT: 'Buscar mensajes...',
    COMPOSE_TO: 'Para',
    COMPOSE_SUBJECT: 'Asunto',
    COMPOSE_BODY: 'Escribe tu mensaje aquí...'
  },
  
  // Button Texts
  BUTTONS: {
    CONNECT: 'Conectar cuenta',
    COMPOSE: 'Redactar',
    REPLY: 'Responder',
    FORWARD: 'Reenviar', 
    DELETE: 'Eliminar',
    LOGOUT: 'Cerrar sesión',
    EDIT_MAILBOXES: 'Editar buzones',
    CANCEL: 'Cancelar',
    SEND: 'Enviar'
  }
};

export const TIMEOUTS = {
  NOTIFICATION_DEFAULT: 3000,
  NOTIFICATION_LONG: 5000,
  NOTIFICATION_SHORT: 2000,
  SEARCH_DEBOUNCE: 300,
  AUTO_SAVE: 5000
};

export const LIMITS = {
  SEARCH_QUERY_MIN: 2,
  SEARCH_QUERY_MAX: 200,
  EMAIL_SUBJECT_MAX: 200,
  EMAIL_BODY_MAX: 10000,
  SNIPPET_LENGTH: 50,
  MAX_COUNT_DISPLAY: 99
};
