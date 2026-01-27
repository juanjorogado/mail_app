// googleOAuth.js
// Simulación de módulo de autenticación de Google OAuth

const { BrowserWindow } = require("electron");
const { google } = require("googleapis");
const path = require("path");
const { GOOGLE } = require("../config/constants");
const Accounts = require("../common/accounts");

exports.startFlow = async () => {
  return new Promise((resolve, reject) => {
    const authWindow = new BrowserWindow({
      width: 800,
      height: 600,
      show: false, // Ocultar hasta que esté lista
      "node-integration": false, // Importante por seguridad
      "web-security": false,
    });

    const oauth2Client = new google.auth.OAuth2(
      GOOGLE.CLIENT_ID,
      GOOGLE.CLIENT_SECRET,
      "urn:ietf:wg:oauth:2.0:oob",
    );

    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: GOOGLE.SCOPES,
      prompt: "consent",
    });

    authWindow.loadURL(url);
    authWindow.show();

    let authHandled = false; // Bandera para indicar si la autenticación fue resuelta o rechazada

    // Función para limpiar y destruir la ventana
    const dispose = () => {
      if (!authWindow.isDestroyed()) {
        authWindow.destroy();
      }
    };

    authWindow.webContents.on("will-redirect", async (event, newUrl) => {
      const parsedUrl = new URL(newUrl);
      const code = parsedUrl.searchParams.get("code");

      if (code && !authHandled) {
        authHandled = true;
        try {
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
          resolve(account);
        } catch (err) {
          console.error("Error al obtener tokens:", err);
          reject(new Error("Error al obtener tokens de Google"));
        } finally {
          dispose(); // Asegurarse de cerrar la ventana
        }
      } else if (parsedUrl.searchParams.get("error") && !authHandled) {
        authHandled = true;
        reject(new Error(parsedUrl.searchParams.get("error")));
        dispose(); // Asegurarse de cerrar la ventana
      }
    });
  });
};
