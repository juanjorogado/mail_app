const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
// Ensure account and oauth modules exist
const Accounts = require("../common/accounts");
const GoogleOAuth = require("../api/googleOAuth");
const OAuthHelper = require("../common/oauthHelper");
const { loggers } = require("../common/logger");
const { GMAIL, FOLDERS, CALENDAR } = require("../config/constants");

// Importar servicios
const { gmailService } = require("../services");
const { cache } = require("../utils");

// Inicializar logger global
loggers.app.info('Application starting', { version: app.getVersion() });

// Inicializar monitoreo de salud
const HealthMonitor = require("../common/health");
HealthMonitor.startMonitoring();

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

 app.whenReady().then(createWindow);

// IPC: Accounts and Google OAuth
ipcMain.handle("list-accounts", async () => {
  try {
    loggers.app.info('Listing accounts');
    const accounts = Accounts.getAccounts();
    return { success: true, data: accounts };
  } catch (error) {
    loggers.accounts.error('list-accounts', error);
    return { success: false, error: error.message, data: [] };
  }
});

ipcMain.handle("add-gmail-account", async () => {
  try {
    loggers.app.info('Starting Gmail account addition flow');
    const acc = await GoogleOAuth.startFlow();
    loggers.accounts.created(acc.id, { email: acc.email });
    return { success: true, account: acc };
  } catch (e) {
    loggers.accounts.error('add-gmail-account', e);
    const errorMessage = e.message || "Failed to add Gmail account";
    return { 
      success: false, 
      error: errorMessage,
      account: null 
    };
  }
});

ipcMain.handle("remove-account", async (event, accountId) => {
  try {
    if (!accountId) {
      throw new Error("Account ID is required");
    }
    loggers.app.info('Removing account', { accountId });
    const removed = await Accounts.removeAccount(accountId);
    if (removed) {
      return { success: true, account: removed };
    } else {
      return { success: false, error: "Account not found", account: null };
    }
  } catch (e) {
    loggers.accounts.error('remove-account', e, { accountId });
    const errorMessage = e.message || "Failed to remove account";
    return { 
      success: false, 
      error: errorMessage,
      account: null 
    };
  }
});

// Fetch emails using Gmail API for a given account
ipcMain.handle("fetch-emails", async (event, accountId, folder = "INBOX", page = 1, pageSize = 20) => {
  const startTime = Date.now();
  
  try {
    loggers.performance.start('fetch-emails', { accountId, folder, page, pageSize });
    
    if (!accountId) {
      throw new Error("Account ID is required");
    }

    // Intentar obtener del caché primero
    const cacheKey = `emails_${accountId}_${folder}_${page}_${pageSize}`;
    const cachedResult = cache.get(cacheKey);
    
    if (cachedResult) {
      loggers.performance.end('fetch-emails', Date.now() - startTime, { 
        accountId, 
        folder, 
        page,
        cached: true,
        count: cachedResult.data.length 
      });
      return cachedResult;
    }

    // Usar el nuevo servicio de Gmail
    const result = await gmailService.fetchEmails(accountId, folder, pageSize);
    
    // Almacenar en caché
    cache.set(cacheKey, result, 5 * 60 * 1000); // 5 minutos
    
    const duration = Date.now() - startTime;
    loggers.performance.end('fetch-emails', duration, { 
      accountId, 
      folder, 
      page,
      count: result.data.length,
      cached: false 
    });
    
    return result;
  } catch (e) {
    const duration = Date.now() - startTime;
    loggers.api.error('GET', `/gmail/messages?folder=${folder}`, e, { accountId, folder });
    loggers.performance.end('fetch-emails', duration, { accountId, folder, error: e.message });
    
    return { 
      success: false, 
      error: e.message || "Unknown error",
      errorType: "api",
      data: [] 
    };
  }
});

// Fetch email details (full content)
ipcMain.handle("fetch-email-details", async (event, accountId, emailId) => {
  try {
    if (!accountId || !emailId) {
      throw new Error("Account ID and Email ID are required");
    }

    const { google } = require("googleapis");
    const oauth2Client = await OAuthHelper.getOAuth2Client(accountId);
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    
    const res = await gmail.users.messages.get({ 
      userId: "me", 
      id: emailId, 
      format: "full" 
    });
    
    const message = res.data;
    const payload = message.payload || {};
    const headers = payload.headers || [];
    
    // Extraer headers importantes
    const getHeader = (name) => {
      const header = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
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
      attachments: []
    };
    
    // Extraer contenido del email
    function extractBody(part) {
      if (part.body && part.body.data) {
        const data = Buffer.from(part.body.data, 'base64').toString('utf-8');
        if (part.mimeType === 'text/plain') {
          emailData.body = data;
        } else if (part.mimeType === 'text/html') {
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
    console.error("Fetch email details error:", e);
    const errorMessage = e.message || "Unknown error";
    let errorType = "unknown";
    
    if (errorMessage.includes("token") || errorMessage.includes("auth") || errorMessage.includes("credentials")) {
      errorType = "authentication";
    } else if (errorMessage.includes("network") || errorMessage.includes("timeout")) {
      errorType = "network";
    }
    
    return { 
      success: false, 
      error: errorMessage,
      errorType,
      data: null 
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
    const calendar = google.calendar({ version: CALENDAR.API_VERSION, auth: oauth2Client });
    const res = await calendar.events.list({
      calendarId: CALENDAR.CALENDAR_ID,
      timeMin: new Date().toISOString(),
      maxResults: CALENDAR.MAX_RESULTS,
      singleEvents: true,
      orderBy: CALENDAR.ORDER_BY
    });
    const events = (res.data.items || []).map((ev) => ({ summary: ev.summary, start: ev.start?.dateTime || ev.start?.date }));
    return { success: true, data: events };
  } catch (e) {
    console.error("Fetch calendar error:", e);
    const errorMessage = e.message || "Unknown error";
    let errorType = "unknown";
    
    if (errorMessage.includes("token") || errorMessage.includes("auth") || errorMessage.includes("credentials")) {
      errorType = "authentication";
    } else if (errorMessage.includes("network") || errorMessage.includes("timeout")) {
      errorType = "network";
    }
    
    return { 
      success: false, 
      error: errorMessage,
      errorType,
      data: [] 
    };
  }
});

// Send email via Gmail API using selected account
ipcMain.handle("send-email", async (event, payload) => {
  const startTime = Date.now();
  
  try {
    loggers.performance.start('send-email', { accountId: payload.accountId });
    
    // Validar payload
    const ValidationManager = require("../common/validation");
    const validation = ValidationManager.validateEmailPayload(payload);
    
    if (!validation.isValid) {
      loggers.security.validation_error('send-email-payload', payload, { errors: validation.errors });
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    const { accountId, to, subject, body } = validation.sanitizedPayload;
    
    // Buscar cuenta
    const account = Accounts.getAccounts().find((a) => a.email === accountId || a.id === accountId);
    if (!account || !account.tokens) {
      throw new Error("Account not found or token missing");
    }
    
    const { google } = require("googleapis");
    const oauth2Client = await OAuthHelper.getOAuth2Client(accountId);
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    
    // Construir mensaje
    const rawMessage = `From: ${account.email}\r\nTo: ${to}\r\nSubject: ${subject}\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=\"UTF-8\"\r\nContent-Transfer-Encoding: 7bit\r\n\r\n${body}`;
    const encoded = Buffer.from(rawMessage).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    
    // Enviar email
    const res = await gmail.users.messages.send({ userId: "me", requestBody: { raw: encoded } });
    
    const duration = Date.now() - startTime;
    loggers.performance.end('send-email', duration, { 
      accountId, 
      to, 
      subject: subject.substring(0, 50), 
      success: true 
    });
    
    loggers.api.response('POST', '/gmail/send', 200, { 
      accountId, 
      to, 
      subject: subject.substring(0, 50) 
    });
    
    return { id: res.data.id, threadId: res.data.threadId };
  } catch (e) {
    const duration = Date.now() - startTime;
    loggers.api.error('POST', '/gmail/send', e, { accountId: payload.accountId });
    loggers.performance.end('send-email', duration, { 
      accountId: payload.accountId, 
      error: e.message 
    });
    
    console.error("Send email error:", e);
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
ipcMain.on("open-compose", () => {
  try {
    loggers.app.info('Opening compose window');
    
    const composeWindow = new BrowserWindow({
      width: 600,
      height: 500,
      parent: mainWindow,
      modal: true,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    
    composeWindow.loadFile(path.join(__dirname, "../renderer/compose.html"));
    
    composeWindow.webContents.on("did-finish-load", () => {
      composeWindow.webContents.send("set-compose-account", null);
      loggers.app.info('Compose window loaded successfully');
    });
    
    composeWindow.on("closed", () => {
      loggers.app.info('Compose window closed');
      // no-op; window will be garbage collected
    });
  } catch (error) {
    loggers.app.error('Failed to open compose window', error);
  }
});

// Manejadores globales de errores
app.on('render-process-gone', (event, webContents, details) => {
  loggers.app.error('Render process gone', { 
    reason: details.reason, 
    exitCode: details.exitCode 
  });
});

app.on('child-process-gone', (event, details) => {
  loggers.app.error('Child process gone', { 
    type: details.type, 
    reason: details.reason, 
    exitCode: details.exitCode 
  });
});

// Inicializar manejadores de errores globales
const { setupGlobalErrorHandlers } = require("../common/logger");
setupGlobalErrorHandlers();

loggers.app.info('Application initialized successfully');
