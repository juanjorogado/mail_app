/**
 * Calendar Service
 * Servicio para interactuar con la API de Google Calendar
 */

const { google } = require("googleapis");
const OAuthHelper = require("../common/oauthHelper");
const { CALENDAR, ERROR_TYPES } = require("../config/constants");

class CalendarService {
  /**
   * Obtiene eventos del calendario
   * @param {string} accountId - ID de la cuenta
   * @param {number} maxResults - Máximo de resultados
   * @returns {Promise<Object>} Resultado con eventos
   */
  static async fetchEvents(accountId, maxResults = CALENDAR.MAX_RESULTS) {
    try {
      if (!accountId) {
        throw new Error("Account ID is required");
      }

      const oauth2Client = await OAuthHelper.getOAuth2Client(accountId);
      const calendar = google.calendar({ 
        version: CALENDAR.API_VERSION, 
        auth: oauth2Client 
      });
      
      const res = await calendar.events.list({ 
        calendarId: CALENDAR.CALENDAR_ID,
        timeMin: new Date().toISOString(),
        maxResults,
        singleEvents: true,
        orderBy: CALENDAR.ORDER_BY
      });
      
      const events = (res.data.items || []).map((ev) => ({
        summary: ev.summary || "No Title",
        start: ev.start?.dateTime || ev.start?.date || "",
        end: ev.end?.dateTime || ev.end?.date || "",
        description: ev.description || ""
      }));
      
      return { success: true, data: events };
    } catch (e) {
      console.error("Fetch calendar error:", e);
      return this._handleError(e);
    }
  }

  /**
   * Maneja errores y retorna formato estándar
   * @private
   */
  static _handleError(e) {
    const errorMessage = e.message || "Unknown error";
    let errorType = ERROR_TYPES.UNKNOWN;
    
    if (errorMessage.includes("token") || errorMessage.includes("auth") || errorMessage.includes("credentials")) {
      errorType = ERROR_TYPES.AUTHENTICATION;
    } else if (errorMessage.includes("network") || errorMessage.includes("timeout")) {
      errorType = ERROR_TYPES.NETWORK;
    }
    
    return { 
      success: false, 
      error: errorMessage,
      errorType,
      data: [] 
    };
  }
}

module.exports = CalendarService;
