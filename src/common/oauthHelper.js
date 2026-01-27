/**
 * Sistema de Gestión OAuth Mejorado
 * Gestiona clientes OAuth con refresh automático y persistencia
 */

const { google } = require('googleapis');
const Accounts = require('./accounts');
const { loggers } = require('./logger');
const { GOOGLE } = require("../config/constants");

class OAuthHelper {
  constructor() {
    this.clients = new Map();
  }

  /**
   * Obtiene o crea un cliente OAuth2 para una cuenta
   */
  async getOAuth2Client(accountId) {
    try {
      if (!accountId) {
        throw new Error('Account ID is required');
      }

      // Buscar cuenta
      const account = Accounts.getAccounts().find(acc => acc.id === accountId || acc.email === accountId);
      if (!account || !account.tokens) {
        loggers.auth.failure(accountId, 'Account not found or missing tokens');
        throw new Error('Account not found or tokens missing');
      }

      // Verificar si ya existe un cliente para esta cuenta
      if (this.clients.has(accountId)) {
        const existingClient = this.clients.get(accountId);
        if (!existingClient.isTokenExpiring()) {
          loggers.auth.success(account.email, { accountId, type: 'existing_client' });
          return existingClient;
        }
      }

      // Crear nuevo cliente OAuth2
      const oauth2Client = new google.auth.OAuth2(
        GOOGLE.CLIENT_ID,
        GOOGLE.CLIENT_SECRET,
        GOOGLE.REDIRECT_URI
      );

      // Configurar credenciales
      oauth2Client.setCredentials(account.tokens);

      // Configurar listener para refresh automático de tokens
      oauth2Client.on('tokens', async (tokens) => {
        await this.handleTokenRefresh(accountId, tokens);
      });

      // Guardar cliente en caché
      this.clients.set(accountId, oauth2Client);

      // Verificar si el token está expirado y refrescar
      if (oauth2Client.isTokenExpiring()) {
        loggers.auth.token_refresh(accountId, { reason: 'token_expiring' });
        await this.refreshTokens(oauth2Client, accountId);
      }

      loggers.auth.success(account.email, { accountId, type: 'new_client' });
      return oauth2Client;
    } catch (error) {
      loggers.auth.failure(accountId, error.message);
      throw error;
    }
  }

  /**
   * Refresca tokens manualmente
   */
  async refreshTokens(oauth2Client, accountId) {
    try {
      const newTokens = await oauth2Client.refreshAccessToken();
      await this.handleTokenRefresh(accountId, newTokens.credentials);
      return newTokens.credentials;
    } catch (error) {
      loggers.accounts.error('refreshTokens', error, { accountId });
      throw new Error(`Failed to refresh tokens: ${error.message}`);
    }
  }

  /**
   * Maneja el refresh de tokens y persistencia
   */
  async handleTokenRefresh(accountId, newTokens) {
    try {
      // Preservar el refresh_token si no viene en los nuevos tokens
      const account = Accounts.getAccounts().find(acc => acc.id === accountId);
      if (account && account.tokens && account.tokens.refresh_token && !newTokens.refresh_token) {
        newTokens.refresh_token = account.tokens.refresh_token;
      }

      // Actualizar tokens en la cuenta
      await Accounts.updateAccountTokens(accountId, newTokens);

      loggers.auth.token_refresh(accountId, { 
        hasRefreshToken: !!newTokens.refresh_token,
        scope: newTokens.scope,
        expiryDate: newTokens.expiry_date
      });

      return true;
    } catch (error) {
      loggers.accounts.error('handleTokenRefresh', error, { accountId });
      throw error;
    }
  }

  /**
   * Verifica validez de tokens
   */
  async validateTokens(accountId) {
    try {
      const oauth2Client = await this.getOAuth2Client(accountId);
      
      // Verificar si el token está expirado
      if (oauth2Client.isTokenExpiring()) {
        loggers.auth.failure(accountId, 'Token is expiring');
        return false;
      }

      // Intentar hacer una llamada de prueba a la API
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      await gmail.users.getProfile({ userId: 'me' });

      return true;
    } catch (error) {
      loggers.auth.failure(accountId, `Token validation failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Revoca tokens de una cuenta
   */
  async revokeTokens(accountId) {
    try {
      const oauth2Client = await this.getOAuth2Client(accountId);
      
      if (oauth2Client.credentials && oauth2Client.credentials.access_token) {
        await oauth2Client.revokeToken(oauth2Client.credentials.access_token);
      }

      // Limpiar tokens de la cuenta
      await Accounts.updateAccountTokens(accountId, null);

      // Eliminar cliente de la caché
      this.clients.delete(accountId);

      loggers.auth.failure(accountId, 'Tokens revoked');
      return true;
    } catch (error) {
      loggers.accounts.error('revokeTokens', error, { accountId });
      return false;
    }
  }

  /**
   * Limpia clientes OAuth2 de la caché
   */
  clearClients() {
    this.clients.clear();
    loggers.app.info('OAuth2 clients cache cleared');
  }

  /**
   * Obtiene información de estado de un cliente
   */
  getClientStatus(accountId) {
    const client = this.clients.get(accountId);
    if (!client) {
      return { exists: false };
    }

    return {
      exists: true,
      isExpiring: client.isTokenExpiring(),
      hasCredentials: !!client.credentials,
      expiryDate: client.credentials?.expiry_date
    };
  }

  /**
   * Obtiene todos los clientes activos
   */
  getActiveClients() {
    return Array.from(this.clients.keys());
  }
}

// Exportar instancia única
module.exports = new OAuthHelper();
