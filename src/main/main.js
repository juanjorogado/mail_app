const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

// Importar constantes centralizadas
const {
  WINDOW_CONFIG,
  PATHS,
  MESSAGES,
  ERROR_MESSAGES,
  LIMITS,
  COMPOSE_WINDOW,
  SECURITY,
  API_ENDPOINTS,
  HTTP_STATUS,
} = require("./constants");

// Load environment variables from .env file - use app.getAppPath() for Electron
const envPath = path.join(app.getAppPath(), PATHS.ENV_FILE);

if (fs.existsSync(envPath)) {
  require("dotenv").config({ path: envPath });
} else {
  loggers.app.warn(MESSAGES.ENV_NOT_FOUND, { envPath });
  // Try parent directories
  const parentEnvPath = path.join(__dirname, PATHS.PARENT_ENV_FILE);
  if (fs.existsSync(parentEnvPath)) {
    require("dotenv").config({ path: parentEnvPath });
    loggers.app.info(MESSAGES.ENV_LOADED_PARENT, { parentEnvPath });
  } else {
    loggers.app.error(MESSAGES.ENV_NOT_FOUND_ANY);
  }
}

// Ensure account and oauth modules exist
const Accounts = require("../common/accounts");
const GoogleOAuth = require("../api/googleOAuth");
const OAuthHelper = require("../common/oauthHelper");
const { loggers } = require("../common/logger");
const { GMAIL, FOLDERS, CALENDAR, GOOGLE } = require("../config/constants");

// Validate required configuration
function validateConfiguration() {
  const requiredConfig = [
    { key: "GOOGLE_CLIENT_ID", value: GOOGLE.CLIENT_ID },
    { key: "GOOGLE_CLIENT_SECRET", value: GOOGLE.CLIENT_SECRET },
  ];

  const missingConfig = requiredConfig.filter((config) => !config.value);

  if (missingConfig.length > 0) {
    const missingKeys = missingConfig.map((c) => c.key).join(", ");
    loggers.app.error(MESSAGES.CONFIG_MISSING, { missingKeys });

    // In development, warn but don't crash
    if (process.env.NODE_ENV !== "production") {
      loggers.app.warn(MESSAGES.CONFIG_MISSING_DEV);
      return true; // Allow startup for development
    }

    return false; // Block startup in production
  }

  return true;
}

// Check configuration before starting
if (!validateConfiguration()) {
  loggers.app.error(MESSAGES.APP_START_BLOCKED);
  process.exit(1);
}

// Importar servicios
const { gmailService } = require("../services");
const cache = require("../utils/cache");

// Inicializar logger global
loggers.app.info(MESSAGES.APP_STARTING, { version: app.getVersion() });

// Inicializar monitoreo de salud
const HealthMonitor = require("../common/health");
HealthMonitor.startMonitoring();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: WINDOW_CONFIG.DEFAULT_WIDTH,
    height: WINDOW_CONFIG.DEFAULT_HEIGHT,
    webPreferences: {
      preload: path.join(__dirname, PATHS.PRELOAD_SCRIPT),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // Allow loading local CSS files
    },
  });

  mainWindow.loadFile(path.join(__dirname, PATHS.RENDERER_INDEX));

  // Open DevTools for debugging only in development
  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

// IPC: Accounts and Google OAuth
ipcMain.handle("list-accounts", async () => {
  try {
    loggers.app.info("Listing accounts");
    const accounts = Accounts.getAccounts();
    return { success: true, data: accounts };
  } catch (error) {
    loggers.accounts.error("list-accounts", error);
    return { success: false, error: error.message, data: [] };
  }
});

ipcMain.handle("add-gmail-account", async () => {
  try {
    loggers.app.info("Starting Gmail account addition flow");
    const acc = await GoogleOAuth.startFlow();

    // Validar que la cuenta se obtuvo correctamente
    if (!acc || !acc.id) {
      throw new Error("Authentication failed: Invalid account data received");
    }

    loggers.accounts.created(acc.id, { email: acc.email });
    loggers.app.info("add-gmail-account returning success", { accountId: acc.id });
    return { success: true, account: acc };
  } catch (e) {
    const errorMessage = e.message || "Failed to add Gmail account";
    loggers.app.error("add-gmail-account error", { error: errorMessage, stack: e.stack });

    // No loguear como error cuando el usuario cierra la ventana - es comportamiento esperado
    if (
      errorMessage.includes("Authentication window was closed") ||
      errorMessage.includes("Authentication cancelled")
    ) {
      loggers.app.info("Authentication cancelled by user");
    } else {
      loggers.accounts.error("add-gmail-account", e);
    }

    return {
      success: false,
      error: errorMessage,
      account: null,
    };
  }
});

ipcMain.handle("remove-account", async (event, accountId) => {
  try {
    if (!accountId) {
      throw new Error("Account ID is required");
    }
    loggers.app.info("Removing account", { accountId });
    const removed = await Accounts.removeAccount(accountId);
    if (removed) {
      return { success: true, account: removed };
    } else {
      return { success: false, error: "Account not found", account: null };
    }
  } catch (e) {
    loggers.accounts.error("remove-account", e, { accountId });
    const errorMessage = e.message || "Failed to remove account";
    return {
      success: false,
      error: errorMessage,
      account: null,
    };
  }
});

// Fetch emails using Gmail API for a given account
ipcMain.handle(
  "fetch-emails",
  async (event, accountId, folder = "INBOX", page = 1, pageSize = 20) => {
    const startTime = Date.now();

    try {
      loggers.performance.start("fetch-emails", {
        accountId,
        folder,
        page,
        pageSize,
      });

      // Validación mejorada de parámetros
      if (!accountId || typeof accountId !== 'string') {
        throw new Error("Valid Account ID is required");
      }

      if (!folder || typeof folder !== 'string') {
        throw new Error("Valid folder is required");
      }

      if (page && (typeof page !== 'number' || page < 1)) {
        throw new Error("Page must be a positive number");
      }

      if (pageSize && (typeof pageSize !== 'number' || pageSize < 1 || pageSize > 100)) {
        throw new Error("Page size must be between 1 and 100");
      }

      // Validar que folder sea un valor permitido
      const validFolders = Object.values(GMAIL.FOLDERS);
      if (!validFolders.includes(folder) && !folder.startsWith('label:')) {
        loggers.app.warn("Invalid folder parameter", { folder, validFolders });
      }

      // Intentar obtener del caché primero
      const cacheKey = `emails_${accountId}_${folder}_${page}_${pageSize}`;
      const cachedResult = cache.get(cacheKey);

      if (cachedResult) {
        loggers.performance.end("fetch-emails", Date.now() - startTime, {
          accountId,
          folder,
          page,
          cached: true,
          count: cachedResult.data.length,
        });
        return cachedResult;
      }

      // Usar el nuevo servicio de Gmail
      const result = await gmailService.fetchEmails(
        accountId,
        folder,
        pageSize,
      );

      loggers.app.info("Emails fetched from service", {
        count: result.data.length,
        firstEmailId: result.data[0]?.id,
      });

      // Almacenar en caché
      cache.set(cacheKey, result, 5 * 60 * 1000); // 5 minutos

      const duration = Date.now() - startTime;
      loggers.performance.end("fetch-emails", duration, {
        accountId,
        folder,
        page,
        count: result.data.length,
        cached: false,
      });

      return result;
    } catch (e) {
      const duration = Date.now() - startTime;
      loggers.api.error("GET", `/gmail/messages?folder=${folder}`, e, {
        accountId,
        folder,
      });
      loggers.performance.end("fetch-emails", duration, {
        accountId,
        folder,
        error: e.message,
      });

      return {
        success: false,
        error: e.message || "Unknown error",
        errorType: "api",
        data: [],
      };
    }
  },
);

// Fetch email details (full content)
ipcMain.handle("fetch-email-details", async (event, accountId, emailId) => {
  try {
    // Validación mejorada de parámetros
    if (!accountId || typeof accountId !== 'string') {
      throw new Error("Valid Account ID is required");
    }

    if (!emailId || typeof emailId !== 'string') {
      throw new Error("Valid Email ID is required");
    }

    // Validar formato del email ID (debe ser un string alfanumérico)
    if (!/^[a-zA-Z0-9_-]+$/.test(emailId)) {
      throw new Error("Invalid Email ID format");
    }

    const { google } = require("googleapis");
    const oauth2Client = await OAuthHelper.getOAuth2Client(accountId);
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const res = await gmail.users.messages.get({
      userId: "me",
      id: emailId,
      format: "full",
    });

    const message = res.data;
    const payload = message.payload || {};
    const headers = payload.headers || [];

    // Extraer headers importantes
    const getHeader = (name) => {
      const header = headers.find(
        (h) => h.name.toLowerCase() === name.toLowerCase(),
      );
      return header ? header.value : "";
    };

    const emailData = {
      id: message.id,
      threadId: message.threadId,
      subject: getHeader("subject"),
      from: getHeader("from"),
      to: getHeader("to"),
      date: getHeader("date"),
      cc: getHeader("cc"),
      bcc: getHeader("bcc"),
      snippet: message.snippet || "",
      body: "",
      htmlBody: "",
      attachments: [],
    };

    // Extraer contenido del email
    function extractBody(part) {
      if (part.body && part.body.data) {
        const data = Buffer.from(part.body.data, "base64").toString("utf-8");
        if (part.mimeType === "text/plain") {
          emailData.body = data;
        } else if (part.mimeType === "text/html") {
          emailData.htmlBody = data;
        }
      }

      if (part.parts) {
        part.parts.forEach(extractBody);
      }
    }

    extractBody(payload);

    // Si no hay body pero hay htmlBody, usar htmlBody como body
    if (!emailData.body && emailData.htmlBody) {
      emailData.body = emailData.htmlBody;
    }

    return { success: true, data: emailData };
  } catch (e) {
    loggers.app.error("Fetch email details error", e, { emailId, accountId });
    const errorMessage = e.message || "Unknown error";
    let errorType = "unknown";

    if (
      errorMessage.includes("token") ||
      errorMessage.includes("auth") ||
      errorMessage.includes("credentials")
    ) {
      errorType = "authentication";
    } else if (
      errorMessage.includes("network") ||
      errorMessage.includes("timeout")
    ) {
      errorType = "network";
    }

    return {
      success: false,
      error: errorMessage,
      errorType,
      data: null,
    };
  }
});

ipcMain.handle("fetch-calendar", async (event, accountId) => {
  try {
    if (!accountId) {
      throw new Error("Account ID is required");
    }

    const { google } = require("googleapis");
    const oauth2Client = await OAuthHelper.getOAuth2Client(accountId);
    const calendar = google.calendar({
      version: CALENDAR.API_VERSION,
      auth: oauth2Client,
    });
    const res = await calendar.events.list({
      calendarId: CALENDAR.CALENDAR_ID,
      timeMin: new Date().toISOString(),
      maxResults: CALENDAR.MAX_RESULTS,
      singleEvents: true,
      orderBy: CALENDAR.ORDER_BY,
    });
    const events = (res.data.items || []).map((ev) => ({
      summary: ev.summary,
      start: ev.start?.dateTime || ev.start?.date,
    }));
    return { success: true, data: events };
  } catch (e) {
    loggers.app.error("Fetch calendar error", e, { accountId });
    const errorMessage = e.message || "Unknown error";
    let errorType = "unknown";

    if (
      errorMessage.includes("token") ||
      errorMessage.includes("auth") ||
      errorMessage.includes("credentials")
    ) {
      errorType = "authentication";
    } else if (
      errorMessage.includes("network") ||
      errorMessage.includes("timeout")
    ) {
      errorType = "network";
    }

    return {
      success: false,
      error: errorMessage,
      errorType,
      data: [],
    };
  }
});

// Send email via Gmail API using selected account
ipcMain.handle("send-email", async (event, payload) => {
  const startTime = Date.now();

  try {
    loggers.performance.start("send-email", { accountId: payload.accountId });

    // Validar payload
    const ValidationManager = require("../common/validation");
    const validation = ValidationManager.validateEmailPayload(payload);

    if (!validation.isValid) {
      loggers.security.validation_error("send-email-payload", payload, {
        errors: validation.errors,
      });
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    const { accountId, to, subject, body } = validation.sanitizedPayload;

    // Buscar cuenta de forma eficiente
    const account = Accounts.findAccount(accountId);
    if (!account || !account.tokens) {
      throw new Error("Account not found or token missing");
    }

    const { google } = require("googleapis");
    const oauth2Client = await OAuthHelper.getOAuth2Client(accountId);
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // Construir mensaje
    const rawMessage = `From: ${account.email}\r\nTo: ${to}\r\nSubject: ${subject}\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=\"UTF-8\"\r\nContent-Transfer-Encoding: 7bit\r\n\r\n${body}`;
    const encoded = Buffer.from(rawMessage)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    // Enviar email
    const res = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: encoded },
    });

    const duration = Date.now() - startTime;
    loggers.performance.end("send-email", duration, {
      accountId,
      to,
      subject: subject.substring(0, 50),
      success: true,
    });

    loggers.api.response("POST", API_ENDPOINTS.GMAIL_SEND, HTTP_STATUS.OK, {
      accountId,
      to,
      subject: subject.substring(0, 50),
    });

    return { id: res.data.id, threadId: res.data.threadId };
  } catch (e) {
    const duration = Date.now() - startTime;
    loggers.api.error("POST", API_ENDPOINTS.GMAIL_SEND, e, {
      accountId: payload.accountId,
    });
    loggers.performance.end("send-email", duration, {
      accountId: payload.accountId,
      error: e.message,
    });

    loggers.app.error("Send email error", e, { accountId: payload.accountId });
    throw e;
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Open Compose window via IPC to ensure it runs in an Electron BrowserWindow
ipcMain.on("open-compose", (event, options = {}) => {
  try {
    const { mode = "new", emailData = null } = options;
    loggers.app.info(MESSAGES.COMPOSE_OPEN, {
      mode,
      hasEmailData: !!emailData,
    });

    const composeWindow = new BrowserWindow({
      width: COMPOSE_WINDOW.WIDTH,
      height: COMPOSE_WINDOW.HEIGHT,
      parent: mainWindow,
      modal: COMPOSE_WINDOW.PARENT_MODAL,
      webPreferences: {
        preload: path.join(__dirname, PATHS.PRELOAD_SCRIPT),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    composeWindow.loadFile(path.join(__dirname, "../renderer/pages/compose.html"));

    composeWindow.webContents.on("did-finish-load", () => {
    });
  } catch (error) {
    loggers.app.error("Failed to open compose window", error);
  }
});

app.on("render-process-gone", (event, webContents, details) => {
  loggers.app.error("Render process gone", {
    reason: details.reason,
    exitCode: details.exitCode,
  });
});

app.on("child-process-gone", (event, details) => {
  loggers.app.error("Child process gone", {
    type: details.type,
    reason: details.reason,
    exitCode: details.exitCode,
  });
});

// Search emails handler
ipcMain.handle("search-emails", async (event, accountId, query) => {
  const startTime = Date.now();

  try {
    loggers.performance.start("search-emails", {
      accountId,
      queryLength: query?.length || 0,
    });

    // Validación mejorada de parámetros
    if (!accountId || typeof accountId !== 'string') {
      throw new Error(ERROR_MESSAGES.ACCOUNT_ID_REQUIRED);
    }

    if (!query || typeof query !== 'string') {
      throw new Error(ERROR_MESSAGES.QUERY_REQUIRED);
    }

    // Validar longitud de la consulta
    if (query.length < LIMITS.SEARCH_QUERY_MIN) {
      throw new Error(ERROR_MESSAGES.QUERY_TOO_SHORT);
    }

    if (query.length > LIMITS.SEARCH_QUERY_MAX) {
      throw new Error(ERROR_MESSAGES.QUERY_TOO_LONG);
    }

    // Validar caracteres peligrosos
    if (SECURITY.DANGEROUS_CHARS.test(query)) {
      loggers.security.warn(MESSAGES.SECURITY_VALIDATION_ERROR, { query, accountId });
      throw new Error(ERROR_MESSAGES.INVALID_CHARACTERS);
    }

    const result = await gmailService.searchEmails(accountId, query);

    const duration = Date.now() - startTime;
    loggers.performance.end("search-emails", duration, {
      accountId,
      queryLength: query.length,
      count: result.data?.length || 0,
    });

    return result;
  } catch (e) {
    const duration = Date.now() - startTime;
    loggers.performance.end("search-emails", duration, {
      accountId,
      error: e.message,
    });

    loggers.api.error("GET", "/gmail/search", e, { accountId, query });

    return {
      success: false,
      error: e.message || "Unknown error",
      data: [],
    };
  }
});

// Delete email handler
ipcMain.handle("delete-email", async (event, accountId, emailId) => {
  const startTime = Date.now();

  try {
    loggers.performance.start("delete-email", { accountId, emailId });

    // Validación mejorada de parámetros
    if (!accountId || typeof accountId !== 'string') {
      throw new Error(ERROR_MESSAGES.ACCOUNT_ID_REQUIRED);
    }

    if (!emailId || typeof emailId !== 'string') {
      throw new Error(ERROR_MESSAGES.EMAIL_ID_REQUIRED);
    }

    // Validar formato del email ID
    if (!/^[a-zA-Z0-9_-]+$/.test(emailId)) {
      throw new Error(ERROR_MESSAGES.EMAIL_ID_INVALID);
    }

    // Log de seguridad para operaciones de eliminación
    loggers.security.info(MESSAGES.EMAIL_DELETION_REQUESTED, { accountId, emailId });

    const result = await gmailService.deleteEmail(accountId, emailId);

    const duration = Date.now() - startTime;
    loggers.performance.end("delete-email", duration, {
      accountId,
      emailId,
      success: true,
    });

    loggers.api.response("DELETE", `/gmail/messages/${emailId}`, 200, {
      accountId,
    });

    return result;
  } catch (e) {
    const duration = Date.now() - startTime;
    loggers.performance.end("delete-email", duration, {
      accountId,
      emailId,
      error: e.message,
    });

    loggers.api.error("DELETE", `/gmail/messages/${emailId}`, e, {
      accountId,
      emailId,
    });

    return {
      success: false,
      error: e.message || "Unknown error",
      errorType: "api",
    };
  }
});

// Mark as read handler
ipcMain.handle(
  "mark-as-read",
  async (event, accountId, emailId, read = true) => {
    const startTime = Date.now();

    try {
      loggers.performance.start("mark-as-read", { accountId, emailId, read });

      // Validación mejorada de parámetros
      if (!accountId || typeof accountId !== 'string') {
        throw new Error("Valid Account ID is required");
      }

      if (!emailId || typeof emailId !== 'string') {
        throw new Error("Valid Email ID is required");
      }

      // Validar formato del email ID
      if (!/^[a-zA-Z0-9_-]+$/.test(emailId)) {
        throw new Error("Invalid Email ID format");
      }

      // Validar tipo del parámetro read
      if (typeof read !== 'boolean') {
        throw new Error("Read parameter must be a boolean");
      }

      const result = await gmailService.markAsRead(accountId, emailId, read);

      const duration = Date.now() - startTime;
      loggers.performance.end("mark-as-read", duration, {
        accountId,
        emailId,
        read,
        success: true,
      });

      return result;
    } catch (e) {
      const duration = Date.now() - startTime;
      loggers.performance.end("mark-as-read", duration, {
        accountId,
        emailId,
        read,
        error: e.message,
      });

      loggers.api.error("POST", `/gmail/messages/${emailId}/modify`, e, {
        accountId,
        emailId,
      });

      return {
        success: false,
        error: e.message || "Unknown error",
        errorType: "api",
      };
    }
  },
);

// Inicializar manejadores de errores globales
const { setupGlobalErrorHandlers } = require("../common/logger");
setupGlobalErrorHandlers();

loggers.app.info("Application initialized successfully");
