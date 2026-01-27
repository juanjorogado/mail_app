/**
 * Common Module Exports
 * Exporta todos los módulos comunes de la aplicación
 */

// Sistemas principales
const logger = require('./logger');
const storage = require('./storage');
const accounts = require('./accounts');
const validation = require('./validation');
const oauthHelper = require('./oauthHelper');
const config = require('./config');
const health = require('./health');

// Exportar todos los módulos
module.exports = {
  logger,
  storage,
  accounts,
  validation,
  oauthHelper,
  config,
  health
};

// Exportar individualmente para compatibilidad
module.exports.Logger = logger;
module.exports.Storage = storage;
module.exports.Accounts = accounts;
module.exports.Validation = validation;
module.exports.OAuthHelper = oauthHelper;
module.exports.Config = config;
module.exports.Health = health;