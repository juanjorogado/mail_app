/**
 * Google OAuth Service
 * Componente atómico para manejar autenticación OAuth con Google
 */

const { BrowserWindow } = require("electron");
const { google } = require("googleapis");
const http = require("http");
const url = require("url");
const jwt = require("jsonwebtoken");
const { GOOGLE } = require("../config/constants");
const Accounts = require("../common/accounts");
const { loggers } = require("../common/logger");

class GoogleOAuthService {
  constructor() {
    this.localServer = null;
    this.authWindow = null;
    this.authHandled = false;
    this.resolvePromise = null;
    this.rejectPromise = null;
    this.authMutex = false; // Prevenir múltiples autenticaciones simultáneas
  }

  /**
   * Inicia el flujo de autenticación OAuth
   * @returns {Promise<Object>} Cuenta autenticada
   */
  async startFlow() {
    // Prevenir múltiples autenticaciones simultáneas
    if (this.authMutex) {
      throw new Error("Authentication already in progress. Please wait.");
    }
    
    this.authMutex = true;
    
    try {
      await this.startCallbackServer();
      this.setupOAuthClient();
      this.createAuthWindow();
      loggers.app.info("OAuth flow started");
      return this.handleAuthResponse();
    } catch (error) {
      this.cleanup();
      throw error;
    }
  }

  /**
   * Inicia el servidor de callback local
   * @private
   */
  startCallbackServer() {
    return new Promise((resolve, reject) => {
      this.localServer = http.createServer((req, res) => {
        this.handleCallback(req, res);
      });

      // Usar puerto dinámico (0) para evitar conflictos
      this.localServer.listen(0, () => {
        const port = this.localServer.address().port;
        this.oauthPort = port;
        loggers.app.info(`OAuth callback server started on dynamic port ${port}`);
        resolve();
      });

      this.localServer.on("error", (err) => {
        loggers.app.error("Failed to start callback server", err);
        reject(err);
      });
    });
  }

  /**
   * Maneja la respuesta de autenticación
   * @private
   */
  handleAuthResponse() {
    return new Promise((resolve, reject) => {
      this.resolvePromise = resolve;
      this.rejectPromise = reject;

      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: GOOGLE.SCOPES,
        prompt: "consent",
      });

      loggers.app.info("Opening auth window", {
        authUrl: authUrl.substring(0, 100) + "...",
      });

      this.authWindow.loadURL(authUrl);
      this.authWindow.show();

      // Manejar cierre de ventana
      this.authWindow.on("closed", () => {
        if (!this.authHandled) {
          this.cleanup();
          reject(new Error("Authentication window was closed"));
        }
      });
    });
  }

  /**
   * Configura el cliente OAuth2
   * @private
   */
  setupOAuthClient() {
    // Usar el puerto dinámico asignado
    const redirectUri = `http://127.0.0.1:${this.oauthPort || 0}/oauth2callback`;
    
    this.oauth2Client = new google.auth.OAuth2(
      GOOGLE.CLIENT_ID,
      GOOGLE.CLIENT_SECRET,
      redirectUri,
    );
  }

  /**
   * Crea la ventana de autenticación
   * @private
   */
  createAuthWindow() {
    this.authWindow = new BrowserWindow({
      width: 800,
      height: 600,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });
  }

  /**
   * Maneja el callback de autenticación
   * @private
   */
  async handleCallback(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const code = parsedUrl.query.code;
    const error = parsedUrl.query.error;

    // Usar mutex para prevenir race conditions
    if (this.authHandled) {
      loggers.app.warn("Ignoring duplicate callback", { url: req.url });
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("Authentication already processed");
      return;
    }

    if (code) {
      await this.handleAuthCode(code, res);
    } else if (error) {
      this.handleAuthError(error, res);
    }
  }

  /**
   * Maneja el código de autorización
   * @private
   */
  async handleAuthCode(code, res) {
    this.authHandled = true;

    try {
      loggers.app.info("OAuth callback received with code");
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);

      const account = this.createAccountFromTokens(tokens);
      await this.saveOrUpdateAccount(account);

      this.sendSuccessResponse(res, account);
      this.cleanup();

      // Resolve the promise with the account
      if (this.resolvePromise) {
        this.resolvePromise(account);
      }
    } catch (err) {
      loggers.app.error("OAuth token error", err);
      this.sendErrorResponse(res, err.message);
      this.cleanup();

      // Reject the promise with the error
      if (this.rejectPromise) {
        this.rejectPromise(err);
      }
    }
  }

  /**
   * Maneja errores de autenticación
   * @private
   */
  handleAuthError(error, res) {
    this.authHandled = true;
    loggers.app.error("OAuth authentication error", { error });

    this.sendErrorResponse(res, `OAuth error: ${error}`);
    this.cleanup();

    // Reject the promise with the error
    if (this.rejectPromise) {
      this.rejectPromise(new Error(`OAuth error: ${error}`));
    }
  }

  /**
   * Crea una cuenta a partir de los tokens
   * @private
   */
  createAccountFromTokens(tokens) {
    const idToken = tokens.id_token;
    let id = "unknown";
    let email = "unknown";

    if (idToken) {
      try {
        // Validar y decodificar el ID token de forma segura
        const decoded = jwt.decode(idToken, { complete: true });
        
        if (decoded && decoded.payload) {
          const payload = decoded.payload;
          id = payload.sub || "unknown";
          email = payload.email || "unknown";
          
          // Validación básica del payload
          if (!payload.iss || !payload.aud) {
            throw new Error("Invalid token issuer or audience");
          }
          
          // Verificar que el token sea para nuestra aplicación
          if (payload.aud !== GOOGLE.CLIENT_ID) {
            throw new Error("Token audience mismatch");
          }
        }
      } catch (error) {
        loggers.app.warn("Failed to validate ID token", error);
        // En caso de error, continuar con valores por defecto
      }
    }

    // Determinar el proveedor basado en el email
    const provider = this.detectProviderFromEmail(email);

    // Generar alias basado en el proveedor
    const alias = this.generateAliasFromProvider(provider);

    return {
      id,
      email,
      provider,
      alias,
      tokens,
    };
  }

  /**
   * Detecta el proveedor basado en el email
   * @private
   */
  detectProviderFromEmail(email) {
    if (!email || email === "unknown") {
      return "gmail";
    }
    const domain = email.split("@")[1];
    if (!domain) return "gmail";

    if (domain.includes("gmail.com") || domain.includes("googlemail.com")) {
      return "gmail";
    } else if (
      domain.includes("outlook.com") ||
      domain.includes("hotmail.com") ||
      domain.includes("live.com")
    ) {
      return "outlook";
    } else if (domain.includes("yahoo.com")) {
      return "yahoo";
    }
    return "gmail"; // Default
  }

  /**
   * Genera un alias basado en el proveedor
   * @private
   */
  generateAliasFromProvider(provider) {
    const aliases = {
      gmail: "gmail",
      outlook: "outlook",
      yahoo: "yahoo",
    };
    return aliases[provider] || provider;
  }

  /**
   * Guarda o actualiza una cuenta
   * @private
   */
  async saveOrUpdateAccount(account) {
    try {
      await Accounts.addAccount(account);
    } catch (addError) {
      if (addError.message === "Account already exists") {
        loggers.app.info("Account already exists, updating tokens", {
          email: account.email,
        });
        await Accounts.updateAccountTokens(account.id, account.tokens);
      } else {
        throw addError;
      }
    }
  }

  /**
   * Envía respuesta de éxito
   * @private
   */
  sendSuccessResponse(res, account) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`
      <html>
        <head><title>Autenticación exitosa</title></head>
        <body style="font-family: Arial; text-align: center; margin-top: 50px;">
          <h1>✓ Autenticación completada</h1>
          <p>Puedes cerrar esta ventana y volver a la aplicación.</p>
        </body>
      </html>
    `);
  }

  /**
   * Envía respuesta de error
   * @private
   */
  sendErrorResponse(res, errorMessage) {
    res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`
      <html>
        <head><title>Error de autenticación</title></head>
        <body style="font-family: Arial; text-align: center; margin-top: 50px;">
          <h1>✗ Error de autenticación</h1>
          <p>${errorMessage}</p>
        </body>
      </html>
    `);
  }

  /**
   * Limpia recursos
   * @private
   */
  cleanup() {
    if (this.authWindow && !this.authWindow.isDestroyed()) {
      this.authWindow.destroy();
    }
    if (this.localServer) {
      this.localServer.close();
      this.localServer = null;
    }
    this.authHandled = false;
    this.authMutex = false; // Liberar mutex
    this.resolvePromise = null;
    this.rejectPromise = null;
  }
}

// Exportar instancia única (Singleton)
module.exports = new GoogleOAuthService();
