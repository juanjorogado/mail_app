/**
 * Models Module Exports
 * Exporta todos los modelos de datos de la aplicación
 */

// Modelos principales
const Email = require('./Email');
const Account = require('./Account');

// Exportar todos los modelos
module.exports = {
  Email,
  Account
};

// Exportar individualmente para compatibilidad
module.exports.EmailModel = Email;
module.exports.AccountModel = Account;