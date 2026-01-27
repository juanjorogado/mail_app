/**
 * Performance Utils
 * Utilidades avanzadas de performance y optimización
 */

const { loggers } = require('../common/logger');
const EventBus = require('../events/EventBus');
const NotificationManager = require('../events/notifications');

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.profiles = new Map();
    this.memorySnapshots = [];
    this.maxSnapshots = 100;
    
    this.setupMemoryMonitoring();
    
    loggers.app.info('Performance monitor initialized');
  }

  /**
   * Configura monitoreo de memoria
   * @private
   */
  setupMemoryMonitoring() {
    // Monitorear uso de memoria cada 30 segundos
    setInterval(() => {
      this.takeMemorySnapshot();
    }, 30000);

    // Monitorear eventos de garbage collection si está disponible
    if (global.gc) {
      setInterval(() => {
        const beforeGC = process.memoryUsage();
        global.gc();
        const afterGC = process.memoryUsage();
        
        this.recordMemoryGC(beforeGC, afterGC);
      }, 300000); // Cada 5 minutos
    }
  }

  /**
   * Mide el tiempo de ejecución de una función
   * @param {string} name - Nombre de la métrica
   * @param {Function} fn - Función a medir
   * @param {Object} context - Contexto de la medición
   * @returns {Promise} Resultado de la función
   */
  async measure(name, fn, context = {}) {
    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage();
    
    try {
      const result = await fn();
      
      const endTime = process.hrtime.bigint();
      const endMemory = process.memoryUsage();
      
      const duration = Number(endTime - startTime) / 1000000; // Convertir a milisegundos
      const memoryDelta = {
        rss: endMemory.rss - startMemory.rss,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        external: endMemory.external - startMemory.external
      };

      this.recordMetric(name, duration, memoryDelta, context, true);
      
      return result;
      
    } catch (error) {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000;
      
      this.recordMetric(name, duration, null, context, false, error);
      
      throw error;
    }
  }

  /**
   * Inicia un perfil de performance
   * @param {string} name - Nombre del perfil
   * @returns {Object} Perfil de performance
   */
  startProfile(name) {
    const profile = {
      name,
      startTime: process.hrtime.bigint(),
      startMemory: process.memoryUsage(),
      operations: [],
      endTime: null,
      endMemory: null,
      duration: null,
      memoryDelta: null
    };

    this.profiles.set(name, profile);
    
    loggers.performance.profile_started(name);
    
    return profile;
  }

  /**
   * Registra una operación en un perfil
   * @param {string} profileName - Nombre del perfil
   * @param {string} operation - Nombre de la operación
   * @param {Object} data - Datos de la operación
   */
  recordOperation(profileName, operation, data = {}) {
    const profile = this.profiles.get(profileName);
    if (!profile) {
      throw new Error(`Profile '${profileName}' not found`);
    }

    profile.operations.push({
      operation,
      data,
      timestamp: process.hrtime.bigint(),
      memory: process.memoryUsage()
    });
  }

  /**
   * Finaliza un perfil de performance
   * @param {string} name - Nombre del perfil
   * @returns {Object} Resultado del perfil
   */
  endProfile(name) {
    const profile = this.profiles.get(name);
    if (!profile) {
      throw new Error(`Profile '${name}' not found`);
    }

    profile.endTime = process.hrtime.bigint();
    profile.endMemory = process.memoryUsage();
    
    profile.duration = Number(profile.endTime - profile.startTime) / 1000000;
    profile.memoryDelta = {
      rss: profile.endMemory.rss - profile.startMemory.rss,
      heapTotal: profile.endMemory.heapTotal - profile.startMemory.heapTotal,
      heapUsed: profile.endMemory.heapUsed - profile.startMemory.heapUsed,
      external: profile.endMemory.external - profile.startMemory.external
    };

    this.analyzeProfile(profile);
    
    loggers.performance.profile_completed(name, profile.duration);
    
    return profile;
  }

  /**
   * Analiza un perfil de performance
   * @private
   */
  analyzeProfile(profile) {
    const analysis = {
      name: profile.name,
      duration: profile.duration,
      memoryDelta: profile.memoryDelta,
      operationsCount: profile.operations.length,
      avgOperationTime: 0,
      slowestOperation: null,
      memoryLeaks: [],
      recommendations: []
    };

    // Analizar operaciones
    if (profile.operations.length > 0) {
      let totalTime = 0;
      let slowestTime = 0;
      
      for (let i = 1; i < profile.operations.length; i++) {
        const prevOp = profile.operations[i - 1];
        const currOp = profile.operations[i];
        
        const opTime = Number(currOp.timestamp - prevOp.timestamp) / 1000000;
        totalTime += opTime;
        
        if (opTime > slowestTime) {
          slowestTime = opTime;
          analysis.slowestOperation = {
            operation: currOp.operation,
            duration: opTime
          };
        }
      }
      
      analysis.avgOperationTime = totalTime / (profile.operations.length - 1);
    }

    // Detectar posibles memory leaks
    if (profile.memoryDelta.heapUsed > 50 * 1024 * 1024) { // Más de 50MB
      analysis.memoryLeaks.push({
        type: 'high_memory_usage',
        amount: profile.memoryDelta.heapUsed,
        recommendation: 'Considerar usar streams o procesamiento por lotes'
      });
    }

    // Generar recomendaciones
    if (analysis.duration > 5000) { // Más de 5 segundos
      analysis.recommendations.push('Considerar optimizar algoritmo o usar caching');
    }
    
    if (analysis.avgOperationTime > 100) { // Más de 100ms por operación
      analysis.recommendations.push('Optimizar operaciones individuales');
    }

    profile.analysis = analysis;
    
    // Notificar análisis
    this.notifyProfileAnalysis(analysis);
  }

  /**
   * Toma una captura de memoria
   * @private
   */
  takeMemorySnapshot() {
    const snapshot = {
      timestamp: new Date().toISOString(),
      memory: process.memoryUsage(),
      heapUsedPercent: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100
    };

    this.memorySnapshots.push(snapshot);

    // Mantener solo las últimas capturas
    if (this.memorySnapshots.length > this.maxSnapshots) {
      this.memorySnapshots.shift();
    }

    // Detectar memory leaks
    this.detectMemoryLeaks(snapshot);
  }

  /**
   * Detecta memory leaks
   * @private
   */
  detectMemoryLeaks(snapshot) {
    if (this.memorySnapshots.length < 10) return;

    const recentSnapshots = this.memorySnapshots.slice(-10);
    const heapUsedTrend = this.calculateTrend(recentSnapshots.map(s => s.memory.heapUsed));
    
    if (heapUsedTrend > 1024 * 1024) { // Aumento de más de 1MB en las últimas 10 capturas
      const leak = {
        type: 'memory_leak_detected',
        trend: heapUsedTrend,
        currentUsage: snapshot.memory.heapUsed,
        timestamp: snapshot.timestamp
      };

      this.handleMemoryLeak(leak);
    }
  }

  /**
   * Calcula la tendencia de una serie de valores
   * @private
   */
  calculateTrend(values) {
    if (values.length < 2) return 0;

    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + (index * val), 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    return slope * (n - 1); // Tendencia en la última medición
  }

  /**
   * Maneja un memory leak detectado
   * @private
   */
  async handleMemoryLeak(leak) {
    loggers.performance.memory_leak(leak);
    
    // Notificar sobre el memory leak
    await NotificationManager.send('security_alert', {
      message: `Memory leak detected: ${leak.trend} bytes increase`,
      leakType: leak.type,
      currentUsage: leak.currentUsage
    }, {
      source: 'performance_monitor',
      leak
    });

    // Emitir evento
    await EventBus.emit('memory_leak', leak, {
      source: 'performance_monitor'
    });
  }

  /**
   * Registra una métrica de performance
   * @private
   */
  recordMetric(name, duration, memoryDelta, context, success, error = null) {
    const metric = {
      name,
      duration,
      memoryDelta,
      context,
      success,
      error: error ? {
        message: error.message,
        name: error.name
      } : null,
      timestamp: new Date().toISOString()
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    this.metrics.get(name).push(metric);

    // Mantener solo las últimas 100 métricas por nombre
    const metrics = this.metrics.get(name);
    if (metrics.length > 100) {
      metrics.shift();
    }

    // Analizar métrica
    this.analyzeMetric(name, metric);
  }

  /**
   * Analiza una métrica de performance
   * @private
   */
  analyzeMetric(name, metric) {
    const metrics = this.metrics.get(name);
    if (metrics.length < 5) return; // Necesitamos al menos 5 métricas para analizar

    const durations = metrics.map(m => m.duration);
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);

    // Detectar degradación de performance
    const recentAvg = durations.slice(-5).reduce((sum, d) => sum + d, 0) / 5;
    const historicalAvg = durations.slice(0, -5).reduce((sum, d) => sum + d, 0) / Math.max(1, durations.length - 5);
    
    if (recentAvg > historicalAvg * 1.5) { // 50% más lento que el promedio histórico
      this.handlePerformanceDegradation(name, recentAvg, historicalAvg);
    }

    // Registrar estadísticas
    const stats = {
      name,
      count: metrics.length,
      avgDuration,
      maxDuration,
      minDuration,
      recentAvg,
      historicalAvg,
      timestamp: new Date().toISOString()
    };

    loggers.performance.metric_analyzed(name, stats);
  }

  /**
   * Maneja degradación de performance
   * @private
   */
  async handlePerformanceDegradation(name, recentAvg, historicalAvg) {
    const degradation = {
      name,
      recentAvg,
      historicalAvg,
      degradationPercent: ((recentAvg - historicalAvg) / historicalAvg) * 100,
      timestamp: new Date().toISOString()
    };

    loggers.performance.degradation_detected(name, degradation);
    
    // Notificar sobre la degradación
    await NotificationManager.send('performance_alert', {
      message: `Performance degradation detected for ${name}: ${degradation.degradationPercent.toFixed(2)}% slower`,
      degradationPercent: degradation.degradationPercent,
      recentAvg,
      historicalAvg
    }, {
      source: 'performance_monitor',
      degradation
    });

    // Emitir evento
    await EventBus.emit('performance_degradation', degradation, {
      source: 'performance_monitor'
    });
  }

  /**
   * Registra métricas de GC
   * @private
   */
  recordMemoryGC(beforeGC, afterGC) {
    const gcMetrics = {
      before: beforeGC,
      after: afterGC,
      freed: {
        rss: beforeGC.rss - afterGC.rss,
        heapTotal: beforeGC.heapTotal - afterGC.heapTotal,
        heapUsed: beforeGC.heapUsed - afterGC.heapUsed,
        external: beforeGC.external - afterGC.external
      },
      timestamp: new Date().toISOString()
    };

    loggers.performance.gc_metrics(gcMetrics);
  }

  /**
   * Obtiene estadísticas de performance
   * @returns {Object} Estadísticas de performance
   */
  getStats() {
    const stats = {
      metricsCount: this.metrics.size,
      profilesCount: this.profiles.size,
      memorySnapshotsCount: this.memorySnapshots.length,
      totalMetrics: 0,
      avgDuration: 0,
      maxDuration: 0,
      minDuration: Infinity,
      memoryUsage: process.memoryUsage(),
      heapUsedPercent: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100
    };

    // Calcular estadísticas de métricas
    let totalDuration = 0;
    for (const [name, metrics] of this.metrics) {
      stats.totalMetrics += metrics.length;
      
      for (const metric of metrics) {
        totalDuration += metric.duration;
        stats.maxDuration = Math.max(stats.maxDuration, metric.duration);
        stats.minDuration = Math.min(stats.minDuration, metric.duration);
      }
    }

    stats.avgDuration = stats.totalMetrics > 0 ? totalDuration / stats.totalMetrics : 0;
    stats.minDuration = stats.minDuration === Infinity ? 0 : stats.minDuration;

    return stats;
  }

  /**
   * Obtiene métricas por nombre
   * @param {string} name - Nombre de la métrica
   * @param {number} limit - Límite de resultados
   * @returns {Array} Array de métricas
   */
  getMetrics(name, limit = 50) {
    const metrics = this.metrics.get(name) || [];
    const end = Math.max(0, metrics.length - limit);
    return metrics.slice(end);
  }

  /**
   * Obtiene perfiles por nombre
   * @param {string} name - Nombre del perfil
   * @returns {Object} Perfil
   */
  getProfile(name) {
    return this.profiles.get(name);
  }

  /**
   * Obtiene capturas de memoria
   * @param {number} limit - Límite de resultados
   * @returns {Array} Array de capturas
   */
  getMemorySnapshots(limit = 50) {
    const end = Math.max(0, this.memorySnapshots.length - limit);
    return this.memorySnapshots.slice(end);
  }

  /**
   * Limpia métricas y perfiles
   * @param {string} type - Tipo de datos a limpiar (metrics, profiles, snapshots, all)
   */
  clearData(type = 'all') {
    switch (type) {
      case 'metrics':
        this.metrics.clear();
        break;
      case 'profiles':
        this.profiles.clear();
        break;
      case 'snapshots':
        this.memorySnapshots = [];
        break;
      case 'all':
      default:
        this.metrics.clear();
        this.profiles.clear();
        this.memorySnapshots = [];
        break;
    }

    loggers.performance.data_cleared(type);
  }

  /**
   * Genera reporte de performance
   * @returns {Object} Reporte de performance
   */
  generateReport() {
    const stats = this.getStats();
    
    return {
      summary: {
        totalMetrics: stats.totalMetrics,
        avgDuration: stats.avgDuration,
        maxDuration: stats.maxDuration,
        minDuration: stats.minDuration,
        memoryUsage: stats.memoryUsage,
        heapUsedPercent: stats.heapUsedPercent
      },
      metrics: Array.from(this.metrics.keys()).map(name => {
        const metrics = this.getMetrics(name, 10);
        return {
          name,
          count: metrics.length,
          avgDuration: metrics.reduce((sum, m) => sum + m.duration, 0) / Math.max(1, metrics.length),
          successRate: (metrics.filter(m => m.success).length / Math.max(1, metrics.length)) * 100
        };
      }),
      profiles: Array.from(this.profiles.values()).map(profile => ({
        name: profile.name,
        duration: profile.duration,
        operationsCount: profile.operations.length,
        memoryDelta: profile.memoryDelta
      })),
      memoryTrend: this.memorySnapshots.slice(-20).map(snapshot => ({
        timestamp: snapshot.timestamp,
        heapUsed: snapshot.memory.heapUsed,
        heapUsedPercent: snapshot.heapUsedPercent
      })),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Optimiza el uso de memoria
   */
  optimizeMemory() {
    // Forzar garbage collection si está disponible
    if (global.gc) {
      global.gc();
      loggers.performance.memory_optimized();
    }

    // Limpiar métricas antiguas
    for (const [name, metrics] of this.metrics) {
      if (metrics.length > 50) {
        this.metrics.set(name, metrics.slice(-50));
      }
    }

    // Limpiar perfiles antiguos
    for (const [name, profile] of this.profiles) {
      if (profile.endTime && Date.now() - new Date(profile.endTime).getTime() > 300000) { // 5 minutos
        this.profiles.delete(name);
      }
    }
  }
}

// Exportar instancia única (Singleton)
module.exports = new PerformanceMonitor();