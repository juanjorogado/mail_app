// config/constants.js
// Constantes de configuración para la aplicación Electron

exports.GOOGLE = {
    CLIENT_ID: '1051441499325-flr3l22s52u8056g054r0ct6i4q49i01.apps.googleusercontent.com', // Reemplaza con tu Client ID
    CLIENT_SECRET: 'YOUR_GOOGLE_CLIENT_SECRET', // ¡REEMPLAZA CON TU CLIENT SECRET!
    REDIRECT_URI: 'http://localhost:8080', // Debe coincidir con tu configuración de Google Cloud Console
    SCOPES: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.compose',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/calendar.readonly' // Si usas la API de Calendar
    ].join(' '),
    MAX_RESULTS: 10 // Número máximo de resultados para la API de Gmail
};

exports.FOLDERS = {
    INBOX: 'in:inbox',
    UNREAD: 'in:inbox is:unread',
    STARRED: 'in:inbox is:starred',
    TODAY: 'in:inbox after:-1d before:+1d', // Consulta para mensajes de hoy (últimas 24h)
    SENT: 'in:sent',
    DRAFT: 'in:draft',
    TRASH: 'in:trash'
};

exports.CALENDAR = {
    API_VERSION: 'v3',
    CALENDAR_ID: 'primary',
    MAX_RESULTS: 10,
    ORDER_BY: 'startTime'
};
