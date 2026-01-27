/**
 * Unit Tester
 * Sistema de testing unitario con soporte para mocks, stubs y fixtures
 */

const { loggers } = require('../common/logger');
const EventBus = require('../events/EventBus');
const NotificationManager = require('../events/notifications');

class UnitTester {
  constructor() {
    this.tests = new Map();
    this.fixtures = new Map();
    this.mocks = new Map();
    this.stubs = new Map();
    this.results = [];
    this.stats = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0
    };
    
    this.setupDefaultFixtures();
    
    loggers.app.info('Unit tester initialized');
  }

  /**
   * Configura fixtures por defecto
   * @private
   */
  setupDefaultFixtures() {
    // Fixture para cuentas de Gmail
    this.addFixture('gmailAccount', {
      id: 'test-account-1',
      email: 'test@example.com',
      provider: 'gmail',
      tokens: {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600
      },
      createdAt: new Date().toISOString(),
      lastSync: null
    });

    // Fixture para emails
    this.addFixture('email', {
      id: 'test-email-1',
      threadId: 'test-thread-1',
      subject: 'Test Email',
      from: 'sender@example.com',
      to: 'recipient@example.com',
      date: new Date().toISOString(),
      snippet: 'This is a test email',
      body: 'Hello, this is a test email body.',
      htmlBody: '<p>Hello, this is a test email body.</p>',
      attachments: []
    });

    // Fixture para eventos de calendario
    this.addFixture('calendarEvent', {
      id: 'test-event-1',
      summary: 'Test Event',
      description: 'This is a test event',
      start: {
        dateTime: new Date(Date.now() + 3600000).toISOString()
      },
      end: {
        dateTime: new Date(Date.now() + 7200000).toISOString()
      },
      attendees: [
        { email: 'attendee1@example.com' },
        { email: 'attendee2@example.com' }
      ]
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
   * Agrega un stub
   * @param {string} name - Nombre del stub
   * @param {Function} stub - Función stub
   */
  addStub(name, stub) {
    this.stubs.set(name, {
      name,
      stub,
      calls: [],
      createdAt: new Date().toISOString()
    });

    loggers.testing.stub_added(name);
  }

  /**
   * Obtiene un stub
   * @param {string} name - Nombre del stub
   * @returns {Function} Stub
   */
  getStub(name) {
    const stub = this.stubs.get(name);
    if (!stub) {
      throw new Error(`Stub '${name}' not found`);
    }

    return stub.stub;
  }

  /**
   * Registra una prueba
   * @param {string} name - Nombre de la prueba
   * @param {Function} testFn - Función de prueba
   */
  test(name, testFn) {
    this.tests.set(name, {
      name,
      testFn,
      createdAt: new Date().toISOString()
    });

    loggers.testing.test_registered(name);
  }

  /**
   * Ejecuta una prueba
   * @param {string} testName - Nombre de la prueba
   * @param {Object} context - Contexto de la prueba
   * @returns {Promise<Object>} Resultado de la prueba
   */
  async runTest(testName, context = {}) {
    const test = this.tests.get(testName);
    if (!test) {
      throw new Error(`Test '${testName}' not found`);
    }

    const startTime = Date.now();
    let result = {
      name: testName,
      passed: false,
      error: null,
      duration: 0,
      context,
      timestamp: new Date().toISOString()
    };

    try {
      // Ejecutar la prueba
      await test.testFn(this, context);
      result.passed = true;
      
    } catch (error) {
      result.error = {
        message: error.message,
        stack: error.stack,
        name: error.name
      };
      
      loggers.testing.test_failed(testName, error);
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
   * Ejecuta todas las pruebas
   * @param {Object} context - Contexto de las pruebas
   * @returns {Promise<Object>} Resultados de todas las pruebas
   */
  async runAllTests(context = {}) {
    const startTime = Date.now();
    const results = [];
    
    loggers.testing.test_suite_started(this.tests.size);

    for (const [testName, test] of this.tests) {
      try {
        const result = await this.runTest(testName, context);
        results.push(result);
      } catch (error) {
        loggers.testing.test_suite_error(testName, error);
        results.push({
          name: testName,
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

    loggers.testing.test_suite_completed(suiteResult);
    await this.notifyTestSuiteResult(suiteResult);

    return suiteResult;
  }

  /**
   * Crea un mock para una función
   * @param {Function} fn - Función a mockear
   * @param {Object} options - Opciones del mock
   * @returns {Object} Mock
   */
  createMock(fn, options = {}) {
    const mock = {
      calls: [],
      returnValue: options.returnValue,
      throwValue: options.throwValue,
      implementation: options.implementation,
      callCount: 0
    };

    const mockFn = function(...args) {
      mock.calls.push({
        args,
        timestamp: new Date().toISOString()
      });
      mock.callCount++;

      if (mock.throwValue) {
        throw mock.throwValue;
      }

      if (mock.implementation) {
        return mock.implementation.apply(this, args);
      }

      return mock.returnValue;
    };

    mock.fn = mockFn;
    return mock;
  }

  /**
   * Crea un stub para una función
   * @param {Function} fn - Función a stubear
   * @param {Object} options - Opciones del stub
   * @returns {Object} Stub
   */
  createStub(fn, options = {}) {
    const stub = {
      calls: [],
      returnValue: options.returnValue,
      throwValue: options.throwValue,
      implementation: options.implementation,
      callCount: 0
    };

    const stubFn = function(...args) {
      stub.calls.push({
        args,
        timestamp: new Date().toISOString()
      });
      stub.callCount++;

      if (stub.throwValue) {
        throw stub.throwValue;
      }

      if (stub.implementation) {
        return stub.implementation.apply(this, args);
      }

      return stub.returnValue;
    };

    stub.fn = stubFn;
    return stub;
  }

  /**
   * Realiza aserciones
   * @param {*} actual - Valor actual
   * @param {*} expected - Valor esperado
   * @param {string} message - Mensaje de error
   */
  assert(actual, expected, message = 'Assertion failed') {
    if (actual !== expected) {
      throw new Error(`${message}: expected ${expected}, got ${actual}`);
    }
  }

  /**
   * Realiza aserciones deep equal
   * @param {*} actual - Valor actual
   * @param {*} expected - Valor esperado
   * @param {string} message - Mensaje de error
   */
  assertDeepEqual(actual, expected, message = 'Deep equal assertion failed') {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  }

  /**
   * Realiza aserciones de tipo
   * @param {*} value - Valor a comprobar
   * @param {string} type - Tipo esperado
   * @param {string} message - Mensaje de error
   */
  assertType(value, type, message = 'Type assertion failed') {
    if (typeof value !== type) {
      throw new Error(`${message}: expected ${type}, got ${typeof value}`);
    }
  }

  /**
   * Realiza aserciones de throws
   * @param {Function} fn - Función que debe lanzar error
   * @param {string} expectedError - Mensaje de error esperado
   * @param {string} message - Mensaje de error
   */
  assertThrows(fn, expectedError, message = 'Throws assertion failed') {
    try {
      fn();
      throw new Error(`${message}: expected function to throw`);
    } catch (error) {
      if (expectedError && !error.message.includes(expectedError)) {
        throw new Error(`${message}: expected error message to include '${expectedError}', got '${error.message}'`);
      }
    }
  }

  /**
   * Realiza aserciones de llamadas
   * @param {Object} mock - Mock a comprobar
   * @param {number} expectedCalls - Número de llamadas esperado
   * @param {string} message - Mensaje de error
   */
  assertCallCount(mock, expectedCalls, message = 'Call count assertion failed') {
    if (mock.callCount !== expectedCalls) {
      throw new Error(`${message}: expected ${expectedCalls} calls, got ${mock.callCount}`);
    }
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
      await NotificationManager.send(result.passed ? 'test_passed' : 'test_failed', {
        testName: result.name,
        duration: result.duration,
        error: result.error ? result.error.message : null
      }, {
        source: 'unit_tester',
        testResult: result
      });

      await EventBus.emit('test_result', result, {
        source: 'unit_tester'
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
      await NotificationManager.send('test_suite_completed', {
        total: suiteResult.total,
        passed: suiteResult.passed,
        failed: suiteResult.failed,
        duration: suiteResult.duration
      }, {
        source: 'unit_tester',
        suiteResult
      });

      await EventBus.emit('test_suite_result', suiteResult, {
        source: 'unit_tester'
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
   * Genera reporte de pruebas
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
        passed: result.passed,
        duration: result.duration,
        error: result.error ? result.error.message : null
      })),
      timestamp: new Date().toISOString()
    };
  }
}

// Exportar instancia única (Singleton)
module.exports = new UnitTester();