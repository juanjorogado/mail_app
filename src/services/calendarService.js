/**
 * Calendar Service
 * Servicio para interactuar con la API de Google Calendar
 * Implementa patrones de diseño y mejores prácticas
 */

const { google } = require("googleapis");
const OAuthHelper = require("../common/oauthHelper");
const { loggers } = require("../common/logger");
const { CALENDAR, VALIDATION, ERROR_TYPES } = require("../config/constants");

class CalendarService {
  constructor() {
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 segundo
  }

  /**
   * Obtiene eventos del calendario
   * @param {string} accountId - ID de la cuenta
   * @param {string} calendarId - ID del calendario
   * @param {Date} timeMin - Fecha mínima
   * @param {Date} timeMax - Fecha máxima
   * @param {number} maxResults - Máximo de resultados
   * @returns {Promise<Object>} Resultado con eventos
   */
  async fetchEvents(accountId, calendarId = CALENDAR.CALENDAR_ID, timeMin = new Date(), timeMax = null, maxResults = CALENDAR.MAX_RESULTS) {
    const startTime = Date.now();
    
    try {
      loggers.performance.start('calendar.fetchEvents', { accountId, calendarId, maxResults });
      
      if (!accountId) {
        throw new Error("Account ID is required");
      }

      const oauth2Client = await OAuthHelper.getOAuth2Client(accountId);
      const calendar = google.calendar({ version: CALENDAR.API_VERSION, auth: oauth2Client });
      
      const params = {
        calendarId,
        timeMin: timeMin.toISOString(),
        maxResults,
        singleEvents: true,
        orderBy: CALENDAR.ORDER_BY
      };
      
      if (timeMax) {
        params.timeMax = timeMax.toISOString();
      }
      
      const res = await this.retryOperation(async () => {
        return await calendar.events.list(params);
      });
      
      const events = res.data.items || [];
      const parsedEvents = events.map(event => this.parseEvent(event));
      
      const duration = Date.now() - startTime;
      loggers.performance.end('calendar.fetchEvents', duration, { 
        accountId, 
        calendarId, 
        count: parsedEvents.length,
        hasMore: !!res.data.nextPageToken 
      });
      
      return { 
        success: true, 
        data: parsedEvents,
        calendarId,
        nextPageToken: res.data.nextPageToken,
        total: res.data.items?.length || 0
      };
    } catch (e) {
      const duration = Date.now() - startTime;
      loggers.performance.end('calendar.fetchEvents', duration, { 
        accountId, 
        calendarId, 
        error: e.message 
      });
      
      loggers.api.error('GET', `/calendar/events`, e, { accountId, calendarId });
      return this.handleError(e);
    }
  }

  /**
   * Crea un nuevo evento
   * @param {string} accountId - ID de la cuenta
   * @param {Object} eventData - Datos del evento
   * @returns {Promise<Object>} Resultado de la creación
   */
  async createEvent(accountId, eventData) {
    const startTime = Date.now();
    
    try {
      loggers.performance.start('calendar.createEvent', { accountId });
      
      // Validar datos del evento
      this.validateEventData(eventData);

      const oauth2Client = await OAuthHelper.getOAuth2Client(accountId);
      const calendar = google.calendar({ version: CALENDAR.API_VERSION, auth: oauth2Client });
      
      const event = this.buildEventObject(eventData);
      
      const res = await this.retryOperation(async () => {
        return await calendar.events.insert({
          calendarId: eventData.calendarId || CALENDAR.CALENDAR_ID,
          requestBody: event
        });
      });
      
      const duration = Date.now() - startTime;
      loggers.performance.end('calendar.createEvent', duration, { 
        accountId, 
        summary: eventData.summary.substring(0, 50),
        success: true 
      });
      
      loggers.api.response('POST', '/calendar/events', 200, { 
        accountId, 
        summary: eventData.summary.substring(0, 50) 
      });
      
      return { 
        success: true, 
        data: this.parseEvent(res.data) 
      };
    } catch (e) {
      const duration = Date.now() - startTime;
      loggers.performance.end('calendar.createEvent', duration, { 
        accountId, 
        error: e.message 
      });
      
      loggers.api.error('POST', '/calendar/events', e, { accountId });
      return this.handleError(e);
    }
  }

  /**
   * Actualiza un evento existente
   * @param {string} accountId - ID de la cuenta
   * @param {string} eventId - ID del evento
   * @param {Object} eventData - Datos actualizados del evento
   * @returns {Promise<Object>} Resultado de la actualización
   */
  async updateEvent(accountId, eventId, eventData) {
    const startTime = Date.now();
    
    try {
      loggers.performance.start('calendar.updateEvent', { accountId, eventId });
      
      if (!accountId || !eventId) {
        throw new Error("Account ID and Event ID are required");
      }

      const oauth2Client = await OAuthHelper.getOAuth2Client(accountId);
      const calendar = google.calendar({ version: CALENDAR.API_VERSION, auth: oauth2Client });
      
      const event = this.buildEventObject(eventData);
      
      const res = await this.retryOperation(async () => {
        return await calendar.events.update({
          calendarId: eventData.calendarId || CALENDAR.CALENDAR_ID,
          eventId,
          requestBody: event
        });
      });
      
      const duration = Date.now() - startTime;
      loggers.performance.end('calendar.updateEvent', duration, { 
        accountId, 
        eventId,
        summary: eventData.summary?.substring(0, 50),
        success: true 
      });
      
      return { 
        success: true, 
        data: this.parseEvent(res.data) 
      };
    } catch (e) {
      const duration = Date.now() - startTime;
      loggers.performance.end('calendar.updateEvent', duration, { 
        accountId, 
        eventId, 
        error: e.message 
      });
      
      loggers.api.error('PUT', `/calendar/events/${eventId}`, e, { accountId, eventId });
      return this.handleError(e);
    }
  }

  /**
   * Elimina un evento
   * @param {string} accountId - ID de la cuenta
   * @param {string} eventId - ID del evento
   * @param {string} calendarId - ID del calendario
   * @returns {Promise<Object>} Resultado de la eliminación
   */
  async deleteEvent(accountId, eventId, calendarId = CALENDAR.CALENDAR_ID) {
    const startTime = Date.now();
    
    try {
      loggers.performance.start('calendar.deleteEvent', { accountId, eventId });
      
      if (!accountId || !eventId) {
        throw new Error("Account ID and Event ID are required");
      }

      const oauth2Client = await OAuthHelper.getOAuth2Client(accountId);
      const calendar = google.calendar({ version: CALENDAR.API_VERSION, auth: oauth2Client });
      
      const res = await this.retryOperation(async () => {
        return await calendar.events.delete({
          calendarId,
          eventId
        });
      });
      
      const duration = Date.now() - startTime;
      loggers.performance.end('calendar.deleteEvent', duration, { 
        accountId, 
        eventId,
        success: true 
      });
      
      return { success: true, data: res.data };
    } catch (e) {
      const duration = Date.now() - startTime;
      loggers.performance.end('calendar.deleteEvent', duration, { 
        accountId, 
        eventId, 
        error: e.message 
      });
      
      loggers.api.error('DELETE', `/calendar/events/${eventId}`, e, { accountId, eventId });
      return this.handleError(e);
    }
  }

  /**
   * Obtiene detalles de un evento específico
   * @param {string} accountId - ID de la cuenta
   * @param {string} eventId - ID del evento
   * @param {string} calendarId - ID del calendario
   * @returns {Promise<Object>} Detalles del evento
   */
  async getEventDetails(accountId, eventId, calendarId = CALENDAR.CALENDAR_ID) {
    const startTime = Date.now();
    
    try {
      loggers.performance.start('calendar.getEventDetails', { accountId, eventId });
      
      if (!accountId || !eventId) {
        throw new Error("Account ID and Event ID are required");
      }

      const oauth2Client = await OAuthHelper.getOAuth2Client(accountId);
      const calendar = google.calendar({ version: CALENDAR.API_VERSION, auth: oauth2Client });
      
      const res = await this.retryOperation(async () => {
        return await calendar.events.get({
          calendarId,
          eventId
        });
      });
      
      const event = this.parseEvent(res.data);
      
      const duration = Date.now() - startTime;
      loggers.performance.end('calendar.getEventDetails', duration, { 
        accountId, 
        eventId,
        attendees: event.attendees?.length || 0
      });
      
      return { success: true, data: event };
    } catch (e) {
      const duration = Date.now() - startTime;
      loggers.performance.end('calendar.getEventDetails', duration, { 
        accountId, 
        eventId, 
        error: e.message 
      });
      
      loggers.api.error('GET', `/calendar/events/${eventId}`, e, { accountId, eventId });
      return this.handleError(e, null);
    }
  }

  /**
   * Busca eventos por query
   * @param {string} accountId - ID de la cuenta
   * @param {string} query - Query de búsqueda
   * @param {string} calendarId - ID del calendario
   * @returns {Promise<Object>} Resultado de búsqueda
   */
  async searchEvents(accountId, query, calendarId = CALENDAR.CALENDAR_ID) {
    const startTime = Date.now();
    
    try {
      loggers.performance.start('calendar.searchEvents', { accountId, queryLength: query.length });
      
      if (!accountId || !query) {
        throw new Error("Account ID and query are required");
      }

      const oauth2Client = await OAuthHelper.getOAuth2Client(accountId);
      const calendar = google.calendar({ version: CALENDAR.API_VERSION, auth: oauth2Client });
      
      const res = await this.retryOperation(async () => {
        return await calendar.events.list({
          calendarId,
          q: query,
          maxResults: 100,
          singleEvents: true,
          orderBy: CALENDAR.ORDER_BY
        });
      });
      
      const events = res.data.items || [];
      const parsedEvents = events.map(event => this.parseEvent(event));
      
      const duration = Date.now() - startTime;
      loggers.performance.end('calendar.searchEvents', duration, { 
        accountId, 
        queryLength: query.length,
        count: parsedEvents.length 
      });
      
      return { 
        success: true, 
        data: parsedEvents,
        query,
        total: events.length
      };
    } catch (e) {
      const duration = Date.now() - startTime;
      loggers.performance.end('calendar.searchEvents', duration, { 
        accountId, 
        queryLength: query?.length || 0, 
        error: e.message 
      });
      
      loggers.api.error('GET', '/calendar/search', e, { accountId, query });
      return this.handleError(e);
    }
  }

  /**
   * Obtiene calendarios de la cuenta
   * @param {string} accountId - ID de la cuenta
   * @returns {Promise<Object>} Lista de calendarios
   */
  async getCalendars(accountId) {
    const startTime = Date.now();
    
    try {
      loggers.performance.start('calendar.getCalendars', { accountId });
      
      if (!accountId) {
        throw new Error("Account ID is required");
      }

      const oauth2Client = await OAuthHelper.getOAuth2Client(accountId);
      const calendar = google.calendar({ version: CALENDAR.API_VERSION, auth: oauth2Client });
      
      const res = await this.retryOperation(async () => {
        return await calendar.calendarList.list();
      });
      
      const calendars = res.data.items || [];
      const parsedCalendars = calendars.map(cal => this.parseCalendar(cal));
      
      const duration = Date.now() - startTime;
      loggers.performance.end('calendar.getCalendars', duration, { 
        accountId, 
        count: parsedCalendars.length 
      });
      
      return { success: true, data: parsedCalendars };
    } catch (e) {
      const duration = Date.now() - startTime;
      loggers.performance.end('calendar.getCalendars', duration, { 
        accountId, 
        error: e.message 
      });
      
      loggers.api.error('GET', '/calendar/list', e, { accountId });
      return this.handleError(e);
    }
  }

  /**
   * Obtiene estadísticas del calendario
   * @param {string} accountId - ID de la cuenta
   * @param {string} calendarId - ID del calendario
   * @returns {Promise<Object>} Estadísticas del calendario
   */
  async getCalendarStats(accountId, calendarId = CALENDAR.CALENDAR_ID) {
    const startTime = Date.now();
    
    try {
      loggers.performance.start('calendar.getCalendarStats', { accountId, calendarId });
      
      const oauth2Client = await OAuthHelper.getOAuth2Client(accountId);
      const calendar = google.calendar({ version: CALENDAR.API_VERSION, auth: oauth2Client });
      
      // Obtener perfil del calendario
      const calendarRes = await this.retryOperation(async () => {
        return await calendar.calendars.get({ calendarId });
      });
      
      // Obtener eventos del mes actual
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const eventsRes = await this.retryOperation(async () => {
        return await calendar.events.list({
          calendarId,
          timeMin: startOfMonth.toISOString(),
          timeMax: endOfMonth.toISOString(),
          maxResults: 2500,
          singleEvents: true
        });
      });
      
      const events = eventsRes.data.items || [];
      
      // Calcular estadísticas
      const stats = {
        id: calendarRes.data.id,
        summary: calendarRes.data.summary,
        description: calendarRes.data.description,
        timeZone: calendarRes.data.timeZone,
        accessRole: calendarRes.data.accessRole,
        eventsThisMonth: events.length,
        eventsByType: this.categorizeEvents(events),
        busyHours: this.calculateBusyHours(events),
        lastSyncTime: new Date().toISOString()
      };
      
      const duration = Date.now() - startTime;
      loggers.performance.end('calendar.getCalendarStats', duration, { 
        accountId, 
        calendarId, 
        stats 
      });
      
      return { success: true, data: stats };
    } catch (e) {
      const duration = Date.now() - startTime;
      loggers.performance.end('calendar.getCalendarStats', duration, { 
        accountId, 
        calendarId, 
        error: e.message 
      });
      
      loggers.api.error('GET', '/calendar/stats', e, { accountId, calendarId });
      return this.handleError(e);
    }
  }

  /**
   * Operación con reintentos
   * @private
   */
  async retryOperation(operation, retries = this.maxRetries) {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0 && this.isRetryableError(error)) {
        loggers.app.warn('Retrying Calendar operation', { 
          error: error.message, 
          retriesLeft: retries 
        });
        
        await this.delay(this.retryDelay);
        return this.retryOperation(operation, retries - 1);
      }
      throw error;
    }
  }

  /**
   * Verifica si el error es reintentable
   * @private
   */
  isRetryableError(error) {
    const retryableCodes = [429, 500, 502, 503, 504];
    const retryableMessages = [
      'ECONNRESET',
      'ENOTFOUND',
      'ETIMEDOUT',
      'socket hang up'
    ];
    
    return retryableCodes.includes(error.code) || 
           retryableMessages.some(msg => error.message.includes(msg));
  }

  /**
   * Delay utility
   * @private
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Parsea un evento de Google Calendar
   * @private
   */
  parseEvent(event) {
    return {
      id: event.id,
      summary: event.summary || "No Title",
      description: event.description || "",
      location: event.location || "",
      start: {
        dateTime: event.start?.dateTime || event.start?.date,
        timeZone: event.start?.timeZone
      },
      end: {
        dateTime: event.end?.dateTime || event.end?.date,
        timeZone: event.end?.timeZone
      },
      attendees: event.attendees || [],
      organizer: event.organizer || {},
      creator: event.creator || {},
      status: event.status || "confirmed",
      transparency: event.transparency || "opaque",
      visibility: event.visibility || "default",
      reminders: event.reminders || {},
      recurrence: event.recurrence || [],
      hangoutLink: event.hangoutLink || "",
      conferenceData: event.conferenceData || null,
      htmlLink: event.htmlLink || "",
      created: event.created || "",
      updated: event.updated || "",
      iCalUID: event.iCalUID || ""
    };
  }

  /**
   * Parsea un calendario de Google Calendar
   * @private
   */
  parseCalendar(calendar) {
    return {
      id: calendar.id,
      summary: calendar.summary,
      description: calendar.description || "",
      location: calendar.location || "",
      timeZone: calendar.timeZone,
      summaryOverride: calendar.summaryOverride || "",
      colorId: calendar.colorId || "",
      backgroundColor: calendar.backgroundColor || "",
      foregroundColor: calendar.foregroundColor || "",
      selected: calendar.selected || false,
      primary: calendar.primary || false,
      deleted: calendar.deleted || false,
      accessRole: calendar.accessRole || "reader",
      defaultReminders: calendar.defaultReminders || [],
      notificationSettings: calendar.notificationSettings || {},
      conferenceProperties: calendar.conferenceProperties || {}
    };
  }

  /**
   * Construye objeto de evento para Google Calendar API
   * @private
   */
  buildEventObject(eventData) {
    const event = {
      summary: eventData.summary,
      description: eventData.description || "",
      location: eventData.location || "",
      start: {
        dateTime: eventData.start.dateTime,
        timeZone: eventData.start.timeZone || "UTC"
      },
      end: {
        dateTime: eventData.end.dateTime,
        timeZone: eventData.end.timeZone || "UTC"
      }
    };

    if (eventData.attendees && eventData.attendees.length > 0) {
      event.attendees = eventData.attendees.map(attendee => ({
        email: attendee.email,
        displayName: attendee.displayName || "",
        responseStatus: attendee.responseStatus || "needsAction"
      }));
    }

    if (eventData.reminders) {
      event.reminders = eventData.reminders;
    }

    if (eventData.recurrence && eventData.recurrence.length > 0) {
      event.recurrence = eventData.recurrence;
    }

    return event;
  }

  /**
   * Valida datos del evento
   * @private
   */
  validateEventData(eventData) {
    if (!eventData.summary || typeof eventData.summary !== 'string' || eventData.summary.trim().length === 0) {
      throw new Error("Event summary is required");
    }

    if (!eventData.start || !eventData.start.dateTime) {
      throw new Error("Event start time is required");
    }

    if (!eventData.end || !eventData.end.dateTime) {
      throw new Error("Event end time is required");
    }

    const start = new Date(eventData.start.dateTime);
    const end = new Date(eventData.end.dateTime);

    if (start >= end) {
      throw new Error("Event end time must be after start time");
    }

    if (eventData.summary.length > VALIDATION.EVENT_SUMMARY_MAX_LENGTH) {
      throw new Error(`Event summary must be ${VALIDATION.EVENT_SUMMARY_MAX_LENGTH} characters or less`);
    }

    if (eventData.description && eventData.description.length > VALIDATION.EVENT_DESCRIPTION_MAX_LENGTH) {
      throw new Error(`Event description must be ${VALIDATION.EVENT_DESCRIPTION_MAX_LENGTH} characters or less`);
    }
  }

  /**
   * Categoriza eventos por tipo
   * @private
   */
  categorizeEvents(events) {
    const categories = {
      allDay: 0,
      withAttendees: 0,
      withLocation: 0,
      recurring: 0,
      videoConference: 0
    };

    events.forEach(event => {
      if (event.start.date) {
        categories.allDay++;
      }
      if (event.attendees && event.attendees.length > 0) {
        categories.withAttendees++;
      }
      if (event.location) {
        categories.withLocation++;
      }
      if (event.recurrence && event.recurrence.length > 0) {
        categories.recurring++;
      }
      if (event.hangoutLink || event.conferenceData) {
        categories.videoConference++;
      }
    });

    return categories;
  }

  /**
   * Calcula horas ocupadas
   * @private
   */
  calculateBusyHours(events) {
    const busyHours = new Set();
    
    events.forEach(event => {
      if (event.start.dateTime && event.end.dateTime) {
        const start = new Date(event.start.dateTime);
        const end = new Date(event.end.dateTime);
        
        // Redondear a la hora más cercana
        const startHour = new Date(start.getFullYear(), start.getMonth(), start.getDate(), start.getHours());
        const endHour = new Date(end.getFullYear(), end.getMonth(), end.getDate(), end.getHours());
        
        for (let hour = startHour; hour <= endHour; hour.setHours(hour.getHours() + 1)) {
          busyHours.add(hour.toISOString());
        }
      }
    });

    return Array.from(busyHours).sort();
  }

  /**
   * Maneja errores y retorna formato estándar
   * @private
   */
  handleError(e, defaultData = []) {
    const errorMessage = e.message || "Unknown error";
    let errorType = ERROR_TYPES.UNKNOWN;
    
    if (errorMessage.includes("token") || errorMessage.includes("auth") || errorMessage.includes("credentials")) {
      errorType = ERROR_TYPES.AUTHENTICATION;
    } else if (errorMessage.includes("network") || errorMessage.includes("timeout") || errorMessage.includes("ECONNREFUSED")) {
      errorType = ERROR_TYPES.NETWORK;
    } else if (errorMessage.includes("Account not found")) {
      errorType = ERROR_TYPES.ACCOUNT_NOT_FOUND;
    }
    
    return { 
      success: false, 
      error: errorMessage,
      errorType,
      data: defaultData 
    };
  }
}

// Exportar instancia única (Singleton)
module.exports = new CalendarService();