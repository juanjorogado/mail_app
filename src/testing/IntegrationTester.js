/**
 * Integration Tester
 * Sistema de testing de integración con soporte para pruebas de extremo a extremo
 */

const { loggers } = require('../common/logger');
const EventBus = require('../events/EventBus');
const NotificationManager = require('../events/notifications');
const UnitTester = require('./UnitTester');

class IntegrationTester {
  constructor() {
    this.tests = new Map();
    this.scenarios = new Map();
    this.fixtures = new Map();
    this.mocks = new Map();
    this.results = [];
    this.stats = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0
    };
    
    this.setupDefaultFixtures();
    
    loggers.app.info('Integration tester initialized');
  }

  /**
   * Configura fixtures por defecto para pruebas de integración
   * @private
   */
  setupDefaultFixtures() {
    // Fixture para flujo completo de Gmail
    this.addFixture('gmailIntegrationFlow', {
      account: {
        id: 'integration-test-account',
        email: 'integration@example.com',
        provider: 'gmail',
        tokens: {
          access_token: 'integration-access-token',
          refresh_token: 'integration-refresh-token',
          expires_in: 3600
        }
      },
      email: {
        to: 'recipient@example.com',
        subject: 'Integration Test Email',
        body: 'This is an integration test email body.'
      },
      expected: {
        accountCreated: true,
        emailSent: true,
        emailReceived: true
      }
    });

    // Fixture para flujo completo de Calendar
    this.addFixture('calendarIntegrationFlow', {
      account: {
        id: 'integration-test-account',
        email: 'integration@example.com',
        provider: 'gmail',
        tokens: {
          access_token: 'integration-access-token',
          refresh_token: 'integration-refresh-token',
          expires_in: 3600
        }
      },
      event: {
        summary: 'Integration Test Event',
        description: 'This is an integration test event',
        start: {
          dateTime: new Date(Date.now() + 3600000).toISOString()
        },
        end: {
          dateTime: new Date(Date.now() + 7200000).toISOString()
        }
      },
      expected: {
        accountCreated: true,
        eventCreated: true,
        eventRetrieved: true
      }
    });
  }

  /**
   * Agrega un fixture
   * @param {string} name - Nombre del fixture
   * @param {Object} data - Datos del fixture
   */
  addFixture(name, data) {
    this.fixtures.set(name, {
      name,
      data,
      createdAt: new Date().toISOString()
    });

    loggers.testing.fixture_added(name);
  }

  /**
   * Obtiene un fixture
   * @param {string} name - Nombre del fixture
   * @param {Object} overrides - Sobrescrituras de datos
   * @returns {Object} Datos del fixture
   */
  getFixture(name, overrides = {}) {
    const fixture = this.fixtures.get(name);
    if (!fixture) {
      throw new Error(`Fixture '${name}' not found`);
    }

    return {
      ...JSON.parse(JSON.stringify(fixture.data)), // Deep clone
      ...overrides
    };
  }

  /**
   * Agrega un mock
   * @param {string} name - Nombre del mock
   * @param {Object} mock - Objeto mock
   */
  addMock(name, mock) {
    this.mocks.set(name, {
      name,
      mock,
      calls: [],
      createdAt: new Date().toISOString()
    });

    loggers.testing.mock_added(name);
  }

  /**
   * Obtiene un mock
   * @param {string} name - Nombre del mock
   * @returns {Object} Mock
   */
  getMock(name) {
    const mock = this.mocks.get(name);
    if (!mock) {
      throw new Error(`Mock '${name}' not found`);
    }

    return mock.mock;
  }

  /**
   * Registra una prueba de integración
   * @param {string} name - Nombre de la prueba
   * @param {Function} testFn - Función de prueba
   * @param {Object} options - Opciones de la prueba
   */
  test(name, testFn, options = {}) {
    this.tests.set(name, {
      name,
      testFn,
      options,
      createdAt: new Date().toISOString()
    });

    loggers.testing.integration_test_registered(name);
  }

  /**
   * Registra un escenario de integración
   * @param {string} name - Nombre del escenario
   * @param {Array} steps - Pasos del escenario
   * @param {Object} options - Opciones del escenario
   */
  scenario(name, steps, options = {}) {
    this.scenarios.set(name, {
      name,
      steps,
      options,
      createdAt: new Date().toISOString()
    });

    loggers.testing.integration_scenario_registered(name);
  }

  /**
   * Ejecuta una prueba de integración
   * @param {string} testName - Nombre de la prueba
   * @param {Object} context - Contexto de la prueba
   * @returns {Promise<Object>} Resultado de la prueba
   */
  async runTest(testName, context = {}) {
    const test = this.tests.get(testName);
    if (!test) {
      throw new Error(`Integration test '${testName}' not found`);
    }

    const startTime = Date.now();
    let result = {
      name: testName,
      type: 'integration',
      passed: false,
      error: null,
      duration: 0,
      context,
      timestamp: new Date().toISOString()
    };

    try {
      // Ejecutar la prueba con UnitTester para soporte de mocks y fixtures
      await UnitTester.runTest(testName, context);
      result.passed = true;
      
    } catch (error) {
      result.error = {
        message: error.message,
        stack: error.stack,
        name: error.name
      };
      
      loggers.testing.integration_test_failed(testName, error);
    }

    result.duration = Date.now() - startTime;
    this.results.push(result);
    
    // Actualizar estadísticas
    this.updateStats(result);
    
    // Notificar resultado
    await this.notifyTestResult(result);
    
    return result;
  }

  /**
   * Ejecuta un escenario de integración
   * @param {string} scenarioName - Nombre del escenario
   * @param {Object} context - Contexto del escenario
   * @returns {Promise<Object>} Resultado del escenario
   */
  async runScenario(scenarioName, context = {}) {
    const scenario = this.scenarios.get(scenarioName);
    if (!scenario) {
      throw new Error(`Integration scenario '${scenarioName}' not found`);
    }

    const startTime = Date.now();
    let result = {
      name: scenarioName,
      type: 'scenario',
      passed: false,
      error: null,
      duration: 0,
      steps: [],
      context,
      timestamp: new Date().toISOString()
    };

    try {
      for (let i = 0; i < scenario.steps.length; i++) {
        const step = scenario.steps[i];
        const stepStartTime = Date.now();
        
        try {
          await step(this, context);
          
          result.steps.push({
            name: `Step ${i + 1}`,
            passed: true,
            duration: Date.now() - stepStartTime,
            timestamp: new Date().toISOString()
          });
          
        } catch (stepError) {
          result.steps.push({
            name: `Step ${i + 1}`,
            passed: false,
            error: {
              message: stepError.message,
              stack: stepError.stack,
              name: stepError.name
            },
            duration: Date.now() - stepStartTime,
            timestamp: new Date().toISOString()
          });
          
          // Detener ejecución en primer error si no es tolerante a fallos
          if (!scenario.options.tolerant) {
            throw stepError;
          }
        }
      }
      
      result.passed = result.steps.every(step => step.passed);
      
    } catch (error) {
      result.error = {
        message: error.message,
        stack: error.stack,
        name: error.name
      };
      
      loggers.testing.integration_scenario_failed(scenarioName, error);
    }

    result.duration = Date.now() - startTime;
    this.results.push(result);
    
    // Actualizar estadísticas
    this.updateStats(result);
    
    // Notificar resultado
    await this.notifyTestResult(result);
    
    return result;
  }

  /**
   * Ejecuta todas las pruebas de integración
   * @param {Object} context - Contexto de las pruebas
   * @returns {Promise<Object>} Resultados de todas las pruebas
   */
  async runAllTests(context = {}) {
    const startTime = Date.now();
    const results = [];
    
    loggers.testing.integration_test_suite_started(this.tests.size);

    // Ejecutar pruebas individuales
    for (const [testName, test] of this.tests) {
      try {
        const result = await this.runTest(testName, context);
        results.push(result);
      } catch (error) {
        loggers.testing.integration_test_suite_error(testName, error);
        results.push({
          name: testName,
          type: 'integration',
          passed: false,
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name
          },
          duration: 0,
          context,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Ejecutar escenarios
    for (const [scenarioName, scenario] of this.scenarios) {
      try {
        const result = await this.runScenario(scenarioName, context);
        results.push(result);
      } catch (error) {
        loggers.testing.integration_test_suite_error(scenarioName, error);
        results.push({
          name: scenarioName,
          type: 'scenario',
          passed: false,
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name
          },
          duration: 0,
          context,
          timestamp: new Date().toISOString()
        });
      }
    }

    const duration = Date.now() - startTime;
    const suiteResult = {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      duration,
      results,
      timestamp: new Date().toISOString()
    };

    loggers.testing.integration_test_suite_completed(suiteResult);
    await this.notifyTestSuiteResult(suiteResult);

    return suiteResult;
  }

  /**
   * Crea un mock para una API externa
   * @param {string} name - Nombre del mock
   * @param {Object} endpoints - Endpoints mockeados
   * @returns {Object} Mock de API
   */
  createApiMock(name, endpoints) {
    const mock = {
      name,
      endpoints: new Map(),
      calls: [],
      callCount: 0
    };

    // Configurar endpoints
    for (const [path, config] of Object.entries(endpoints)) {
      mock.endpoints.set(path, {
        method: config.method || 'GET',
        response: config.response,
        delay: config.delay || 0,
        error: config.error,
        callCount: 0
      });
    }

    // Crear función mock
    mock.fn = async function(path, options = {}) {
      mock.calls.push({
        path,
        options,
        timestamp: new Date().toISOString()
      });
      mock.callCount++;

      const endpoint = mock.endpoints.get(path);
      if (!endpoint) {
        throw new Error(`Mock endpoint not found: ${path}`);
      }

      endpoint.callCount++;

      // Simular delay
      if (endpoint.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, endpoint.delay));
      }

      // Simular error
      if (endpoint.error) {
        throw endpoint.error;
      }

      return endpoint.response;
    };

    this.addMock(name, mock);
    return mock;
  }

  /**
   * Crea un mock para una base de datos
   * @param {string} name - Nombre del mock
   * @param {Object} collections - Colecciones mockeadas
   * @returns {Object} Mock de base de datos
   */
  createDatabaseMock(name, collections) {
    const mock = {
      name,
      collections: new Map(),
      calls: [],
      callCount: 0
    };

    // Configurar colecciones
    for (const [collectionName, data] of Object.entries(collections)) {
      mock.collections.set(collectionName, {
        data: Array.isArray(data) ? data : [],
        operations: []
      });
    }

    // Crear funciones CRUD
    mock.fn = {
      find: async (collectionName, query = {}) => {
        mock.calls.push({
          operation: 'find',
          collection: collectionName,
          query,
          timestamp: new Date().toISOString()
        });
        mock.callCount++;

        const collection = mock.collections.get(collectionName);
        if (!collection) {
          throw new Error(`Collection not found: ${collectionName}`);
        }

        return collection.data.filter(item => {
          return Object.keys(query).every(key => item[key] === query[key]);
        });
      },

      insert: async (collectionName, data) => {
        mock.calls.push({
          operation: 'insert',
          collection: collectionName,
          data,
          timestamp: new Date().toISOString()
        });
        mock.callCount++;

        const collection = mock.collections.get(collectionName);
        if (!collection) {
          throw new Error(`Collection not found: ${collectionName}`);
        }

        const id = `mock-id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const item = { id, ...data };
        collection.data.push(item);
        return item;
      },

      update: async (collectionName, id, data) => {
        mock.calls.push({
          operation: 'update',
          collection: collectionName,
          id,
          data,
          timestamp: new Date().toISOString()
        });
        mock.callCount++;

        const collection = mock.collections.get(collectionName);
        if (!collection) {
          throw new Error(`Collection not found: ${collectionName}`);
        }

        const index = collection.data.findIndex(item => item.id === id);
        if (index === -1) {
          throw new Error(`Item not found: ${id}`);
        }

        collection.data[index] = { ...collection.data[index], ...data };
        return collection.data[index];
      },

      delete: async (collectionName, id) => {
        mock.calls.push({
          operation: 'delete',
          collection: collectionName,
          id,
          timestamp: new Date().toISOString()
        });
        mock.callCount++;

        const collection = mock.collections.get(collectionName);
        if (!collection) {
          throw new Error(`Collection not found: ${collectionName}`);
        }

        const index = collection.data.findIndex(item => item.id === id);
        if (index === -1) {
          throw new Error(`Item not found: ${id}`);
        }

        return collection.data.splice(index, 1)[0];
      }
    };

    this.addMock(name, mock);
    return mock;
  }

  /**
   * Actualiza estadísticas
   * @private
   */
  updateStats(result) {
    this.stats.total++;
    if (result.passed) {
      this.stats.passed++;
    } else {
      this.stats.failed++;
    }
  }

  /**
   * Notifica resultado de prueba
   * @private
   */
  async notifyTestResult(result) {
    try {
      await NotificationManager.send(result.passed ? 'integration_test_passed' : 'integration_test_failed', {
        testName: result.name,
        type: result.type,
        duration: result.duration,
        error: result.error ? result.error.message : null,
        steps: result.steps ? result.steps.length : 0
      }, {
        source: 'integration_tester',
        testResult: result
      });

      await EventBus.emit('integration_test_result', result, {
        source: 'integration_tester'
      });

    } catch (error) {
      loggers.testing.notification_failed(error);
    }
  }

  /**
   * Notifica resultado de suite de pruebas
   * @private
   */
  async notifyTestSuiteResult(suiteResult) {
    try {
      await NotificationManager.send('integration_test_suite_completed', {
        total: suiteResult.total,
        passed: suiteResult.passed,
        failed: suiteResult.failed,
        duration: suiteResult.duration
      }, {
        source: 'integration_tester',
        suiteResult
      });

      await EventBus.emit('integration_test_suite_result', suiteResult, {
        source: 'integration_tester'
      });

    } catch (error) {
      loggers.testing.notification_failed(error);
    }
  }

  /**
   * Obtiene estadísticas de pruebas
   * @returns {Object} Estadísticas
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.total > 0 ? (this.stats.passed / this.stats.total) * 100 : 0,
      results: this.results.slice(-10) // Últimas 10 pruebas
    };
  }

  /**
   * Obtiene resultados de pruebas
   * @param {number} limit - Límite de resultados
   * @returns {Array} Array de resultados
   */
  getResults(limit = 50) {
    const end = Math.max(0, this.results.length - limit);
    return this.results.slice(end);
  }

  /**
   * Limpia resultados de pruebas
   * @param {number} keep - Cantidad a mantener
   */
  clearResults(keep = 0) {
    if (keep === 0) {
      this.results = [];
    } else {
      this.results = this.results.slice(-keep);
    }
    
    // Resetear estadísticas
    this.stats = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0
    };

    loggers.testing.results_cleared(keep);
  }

  /**
   * Genera reporte de pruebas de integración
   * @returns {Object} Reporte de pruebas
   */
  generateReport() {
    const stats = this.getStats();
    
    return {
      summary: {
        total: stats.total,
        passed: stats.passed,
        failed: stats.failed,
        successRate: stats.successRate.toFixed(2) + '%',
        duration: stats.results.reduce((sum, r) => sum + r.duration, 0)
      },
      details: stats.results.map(result => ({
        name: result.name,
        type: result.type,
        passed: result.passed,
        duration: result.duration,
        error: result.error ? result.error.message : null,
        steps: result.steps ? result.steps.length : 0
      })),
      scenarios: Array.from(this.scenarios.keys()),
      timestamp: new Date().toISOString()
    };
  }
}

// Exportar instancia única (Singleton)
module.exports = new IntegrationTester();