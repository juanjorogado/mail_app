/**
 * Account Model
 * Modelo de datos para cuentas con validación y gestión de tokens
 */

const { loggers } = require('../common/logger');
const { VALIDATION } = require('../config/constants');

class Account {
  constructor(data = {}) {
    this.id = data.id || this.generateId();
    this.email = data.email || "";
    this.name = data.name || "";
    this.provider = data.provider || "gmail";
    this.tokens = data.tokens || null;
    this.scopes = data.scopes || [];
    this.isVerified = data.isVerified || false;
    this.lastSync = data.lastSync || null;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.status = data.status || "active";
    this.metadata = data.metadata || {};
  }

  /**
   * Genera un ID único para la cuenta
   * @private
   */
  generateId() {
    return `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Valida el modelo de cuenta
   * @returns {Object} Resultado de validación
   */
  validate() {
    const errors = [];
    const warnings = [];

    // Validar email
    if (!this.email || !this.isValidEmail(this.email)) {
      errors.push("Valid email is required");
    }

    // Validar nombre
    if (!this.name || this.name.trim().length === 0) {
      warnings.push("Account name is recommended");
    }

    // Validar provider
    const validProviders = ['gmail', 'outlook', 'yahoo'];
    if (!validProviders.includes(this.provider)) {
      errors.push(`Invalid provider: ${this.provider}. Must be one of: ${validProviders.join(', ')}`);
    }

    // Validar tokens
    if (this.tokens) {
      const tokenValidation = this.validateTokens();
      if (!tokenValidation.isValid) {
        errors.push(...tokenValidation.errors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Valida los tokens de OAuth
   * @private
   */
  validateTokens() {
    const errors = [];
    
    if (!this.tokens) {
      return { isValid: true, errors: [] };
    }

    const requiredFields = ['access_token', 'refresh_token', 'token_type', 'expires_in'];
    
    for (const field of requiredFields) {
      if (!this.tokens[field]) {
        errors.push(`Missing required token field: ${field}`);
      }
    }

    // Validar fecha de expiración
    if (this.tokens.expires_at && new Date(this.tokens.expires_at) <= new Date()) {
      errors.push("Token has expired");
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Verifica si el token está expirado
   * @returns {boolean} True si está expirado
   */
  isTokenExpired() {
    if (!this.tokens || !this.tokens.expires_at) {
      return true;
    }

    const now = new Date();
    const expiresAt = new Date(this.tokens.expires_at);
    
    return now >= expiresAt;
  }

  /**
   * Verifica si el token necesita renovación
   * @param {number} bufferMinutes - Minutos de buffer antes de la expiración
   * @returns {boolean} True si necesita renovación
   */
  needsTokenRefresh(bufferMinutes = 10) {
    if (!this.tokens || !this.tokens.expires_at) {
      return true;
    }

    const now = new Date();
    const expiresAt = new Date(this.tokens.expires_at);
    const bufferMs = bufferMinutes * 60 * 1000;
    
    return (expiresAt.getTime() - now.getTime()) <= bufferMs;
  }

  /**
   * Actualiza los tokens
   * @param {Object} newTokens - Nuevos tokens
   */
  updateTokens(newTokens) {
    this.tokens = {
      ...this.tokens,
      ...newTokens,
      updated_at: new Date().toISOString()
    };
    
    this.updatedAt = new Date().toISOString();
    loggers.accounts.updated(this.id, { 
      hasAccessToken: !!newTokens.access_token,
      hasRefreshToken: !!newTokens.refresh_token,
      expiresAt: newTokens.expires_at 
    });
    
    return this;
  }

  /**
   * Revoca los tokens
   */
  revokeTokens() {
    this.tokens = null;
    this.updatedAt = new Date().toISOString();
    loggers.accounts.revoked(this.id);
    return this;
  }

  /**
   * Obtiene el token de acceso
   * @returns {string|null} Token de acceso
   */
  getAccessToken() {
    if (!this.tokens || this.isTokenExpired()) {
      return null;
    }
    return this.tokens.access_token;
  }

  /**
   * Obtiene el token de actualización
   * @returns {string|null} Token de actualización
   */
  getRefreshToken() {
    return this.tokens ? this.tokens.refresh_token : null;
  }

  /**
   * Verifica si la cuenta está activa
   * @returns {boolean} True si está activa
   */
  isActive() {
    return this.status === 'active' && this.isVerified;
  }

  /**
   * Desactiva la cuenta
   */
  deactivate() {
    this.status = 'inactive';
    this.updatedAt = new Date().toISOString();
    loggers.accounts.deactivated(this.id);
    return this;
  }

  /**
   * Activa la cuenta
   */
  activate() {
    this.status = 'active';
    this.isVerified = true;
    this.updatedAt = new Date().toISOString();
    loggers.accounts.activated(this.id);
    return this;
  }

  /**
   * Actualiza la última sincronización
   * @param {Date} date - Fecha de sincronización
   */
  updateLastSync(date = new Date()) {
    this.lastSync = date.toISOString();
    this.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Agrega un scope
   * @param {string} scope - Scope a agregar
   */
  addScope(scope) {
    if (!this.scopes.includes(scope)) {
      this.scopes.push(scope);
      this.updatedAt = new Date().toISOString();
    }
    return this;
  }

  /**
   * Remueve un scope
   * @param {string} scope - Scope a remover
   */
  removeScope(scope) {
    this.scopes = this.scopes.filter(s => s !== scope);
    this.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Verifica si tiene un scope específico
   * @param {string} scope - Scope a verificar
   * @returns {boolean} True si tiene el scope
   */
  hasScope(scope) {
    return this.scopes.includes(scope);
  }

  /**
   * Obtiene estadísticas de la cuenta
   * @returns {Object} Estadísticas
   */
  getStats() {
    return {
      id: this.id,
      email: this.email,
      provider: this.provider,
      isVerified: this.isVerified,
      isActive: this.isActive(),
      hasTokens: !!this.tokens,
      tokenExpiresAt: this.tokens?.expires_at || null,
      scopesCount: this.scopes.length,
      lastSync: this.lastSync,
      age: this.getAge(),
      needsRefresh: this.needsTokenRefresh(),
      metadata: this.metadata
    };
  }

  /**
   * Calcula la antigüedad de la cuenta
   * @returns {string} Edad formateada
   */
  getAge() {
    const now = new Date();
    const createdAt = new Date(this.createdAt);
    const diffMs = now - createdAt;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays} day(s) ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour(s) ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute(s) ago`;
    } else {
      return 'Just now';
    }
  }

  /**
   * Verifica si un email es válido
   * @private
   */
  isValidEmail(email) {
    return VALIDATION.EMAIL_REGEX.test(email);
  }

  /**
   * Convierte a JSON
   * @returns {Object} Representación JSON
   */
  toJSON() {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      provider: this.provider,
      tokens: this.tokens,
      scopes: this.scopes,
      isVerified: this.isVerified,
      lastSync: this.lastSync,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      status: this.status,
      metadata: this.metadata
    };
  }

  /**
   * Crea una instancia desde JSON
   * @param {Object} json - Datos JSON
   * @returns {Account} Instancia de Account
   */
  static fromJSON(json) {
    return new Account(json);
  }

  /**
   * Crea una instancia desde datos OAuth
   * @param {Object} oauthData - Datos OAuth
   * @returns {Account} Instancia de Account
   */
  static fromOAuth(oauthData) {
    return new Account({
      email: oauthData.email,
      name: oauthData.name || oauthData.email.split('@')[0],
      provider: 'gmail',
      tokens: oauthData.tokens,
      scopes: oauthData.scopes || [],
      isVerified: true,
      status: 'active'
    });
  }
}

module.exports = Account;