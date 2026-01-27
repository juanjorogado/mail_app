/**
 * Testing Module Exports
 * Exporta todos los sistemas de testing
 */

// Sistemas principales
const UnitTester = require('./UnitTester');
const IntegrationTester = require('./IntegrationTester');

// Exportar todos los sistemas
module.exports = {
  UnitTester,
  IntegrationTester
};

// Exportar individualmente para compatibilidad
module.exports.unitTester = UnitTester;
module.exports.integrationTester = IntegrationTester;