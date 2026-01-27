/**
 * Utils Module Exports
 * Exporta todas las utilidades de la aplicación
 */

// Utilidades principales
const cache = require('./cache');
const pagination = require('./pagination');

// Exportar todas las utilidades
module.exports = {
  cache,
  pagination
};

// Exportar individualmente para compatibilidad
module.exports.Cache = cache;
module.exports.Pagination = pagination;