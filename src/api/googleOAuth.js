// googleOAuth.js
// Google OAuth con servidor local para manejar callbacks

const { BrowserWindow } = require("electron");
const { google } = require("googleapis");
const http = require("http");
const url = require("url");
const { GOOGLE } = require("../config/constants");
const Accounts = require("../common/accounts");
const { loggers } = require("../common/logger");

let localServer = null;

exports.startFlow = async () => {
  return new Promise((resolve, reject) => {
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE.CLIENT_ID,
      GOOGLE.CLIENT_SECRET,
      GOOGLE.REDIRECT_URI
    );

    const authWindow = new BrowserWindow({
      width: 800,
      height: 600,
      show: false,
      "node-integration": false,
      "web-security": false,
    });

    let authHandled = false;

    const dispose = () => {
      if (!authWindow.isDestroyed()) {
        authWindow.destroy();
      }
      if (localServer) {
        localServer.close();
        localServer = null;
      }
    };

    // Crear servidor local para manejar el callback
    localServer = http.createServer(async (req, res) => {
      const parsedUrl = url.parse(req.url, true);
      const code = parsedUrl.query.code;
      const error = parsedUrl.query.error;

      if (code && !authHandled) {
        authHandled = true;
        try {
          loggers.app.info('OAuth callback received with code');
          const { tokens } = await oauth2Client.getToken(code);
          oauth2Client.setCredentials(tokens);
          
          const account = {
            id: tokens.id_token
              ? JSON.parse(
                  Buffer.from(
                    tokens.id_token.split(".")[1],
                    "base64",
                  ).toString(),
                ).sub
              : "unknown",
            email: tokens.id_token
              ? JSON.parse(
                  Buffer.from(
                    tokens.id_token.split(".")[1],
                    "base64",
                  ).toString(),
                ).email
              : "unknown",
            tokens: tokens,
          };
          
          Accounts.addAccount(account);
          loggers.accounts.created(account.id, { email: account.email });
          
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
          
          dispose();
          resolve(account);
        } catch (err) {
          loggers.app.error('OAuth token error', err);
          res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
          res.end(`<html><body><h1>Error de autenticación</h1><p>${err.message}</p></body></html>`);
          dispose();
          reject(new Error("Error al obtener tokens de Google"));
        }
      } else if (error && !authHandled) {
        authHandled = true;
        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`<html><body><h1>Error de autenticación</h1><p>${error}</p></body></html>`);
        dispose();
        reject(new Error(`OAuth error: ${error}`));
      }
    });

    // Iniciar servidor en puerto 3000
    localServer.listen(3000, () => {
      loggers.app.info('OAuth callback server started on port 3000');
      
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: GOOGLE.SCOPES,
        prompt: "consent",
      });

      authWindow.loadURL(authUrl);
      authWindow.show();
    });
  });
};
