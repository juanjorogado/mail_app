#!/usr/bin/env node

/**
 * Health Check Script
 * 
 * Este script realiza una verificación completa de salud del sistema
 * y genera un reporte detallado de todos los componentes.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Importar módulos del sistema
const HealthMonitor = require('../src/common/health');
const { loggers } = require('../src/common/logger');
const { cache } = require('../src/utils/cache');
const PerformanceMonitor = require('../src/utils/performance');

class HealthCheck {
  constructor() {
    this.results = {
      system: {},
      application: {},
      services: {},
      dependencies: {},
      files: {},
      performance: {}
    };
  }

  async run() {
    console.log('🔍 Iniciando verificación de salud del sistema...\n');

    try {
      // Verificar sistema
      await this.checkSystem();
      
      // Verificar aplicación
      await this.checkApplication();
      
      // Verificar servicios
      await this.checkServices();
      
      // Verificar dependencias
      await this.checkDependencies();
      
      // Verificar archivos críticos
      await this.checkFiles();
      
      // Verificar performance
      await this.checkPerformance();

      // Generar reporte
      this.generateReport();

      console.log('✅ Verificación de salud completada exitosamente');
      return true;

    } catch (error) {
      console.error('❌ Error durante la verificación de salud:', error.message);
      return false;
    }
  }

  async checkSystem() {
    console.log('📋 Verificando sistema...');

    try {
      // Verificar Node.js
      this.results.system.node = {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
        memory: process.memoryUsage()
      };

      // Verificar entorno
      this.results.system.environment = {
        nodeEnv: process.env.NODE_ENV || 'development',
        homeDir: process.env.HOME,
        cwd: process.cwd()
      };

      // Verificar recursos del sistema
      const os = require('os');
      this.results.system.resources = {
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        cpuCount: os.cpus().length,
        loadAverage: os.loadavg()
      };

      console.log('   ✅ Sistema verificado');
    } catch (error) {
      this.results.system.error = error.message;
      console.log('   ❌ Error verificando sistema:', error.message);
    }
  }

  async checkApplication() {
    console.log('🏗️ Verificando aplicación...');

    try {
      // Verificar configuración
      const config = require('../src/common/config');
      this.results.application.config = {
        version: config.get('app.version'),
        environment: config.get('app.environment'),
        debug: config.get('app.debug'),
        logLevel: config.get('app.logLevel')
      };

      // Verificar estado del logger
      this.results.application.logger = {
        status: 'active',
        levels: Object.keys(loggers)
      };

      // Verificar estado del monitor de salud
      const healthStatus = HealthMonitor.getStatus();
      this.results.application.health = healthStatus;

      console.log('   ✅ Aplicación verificada');
    } catch (error) {
      this.results.application.error = error.message;
      console.log('   ❌ Error verificando aplicación:', error.message);
    }
  }

  async checkServices() {
    console.log('🔧 Verificando servicios...');

    try {
      // Verificar Gmail Service
      const { gmailService } = require('../src/services');
      this.results.services.gmail = {
        status: 'available',
        methods: Object.getOwnPropertyNames(gmailService).filter(name => 
          typeof gmailService[name] === 'function'
        )
      };

      // Verificar Calendar Service
      const { calendarService } = require('../src/services');
      this.results.services.calendar = {
        status: 'available',
        methods: Object.getOwnPropertyNames(calendarService).filter(name => 
          typeof calendarService[name] === 'function'
        )
      };

      // Verificar Cache
      this.results.services.cache = {
        status: 'available',
        stats: cache.getStats(),
        size: cache.getSize()
      };

      console.log('   ✅ Servicios verificados');
    } catch (error) {
      this.results.services.error = error.message;
      console.log('   ❌ Error verificando servicios:', error.message);
    }
  }

  async checkDependencies() {
    console.log('📦 Verificando dependencias...');

    try {
      // Verificar package.json
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      this.results.dependencies.package = {
        name: packageJson.name,
        version: packageJson.version,
        dependencies: Object.keys(packageJson.dependencies || {}),
        devDependencies: Object.keys(packageJson.devDependencies || {})
      };

      // Verificar dependencias instaladas
      const nodeModulesPath = path.join(process.cwd(), 'node_modules');
      if (fs.existsSync(nodeModulesPath)) {
        const modules = fs.readdirSync(nodeModulesPath);
        this.results.dependencies.installed = modules.length;
      } else {
        this.results.dependencies.installed = 0;
      }

      // Verificar dependencias críticas
      const criticalDeps = ['electron', 'googleapis', 'winston'];
      this.results.dependencies.critical = {};
      
      for (const dep of criticalDeps) {
        try {
          require.resolve(dep);
          this.results.dependencies.critical[dep] = 'installed';
        } catch {
          this.results.dependencies.critical[dep] = 'missing';
        }
      }

      console.log('   ✅ Dependencias verificadas');
    } catch (error) {
      this.results.dependencies.error = error.message;
      console.log('   ❌ Error verificando dependencias:', error.message);
    }
  }

  async checkFiles() {
    console.log('📁 Verificando archivos críticos...');

    try {
      // Archivos críticos que deben existir
      const criticalFiles = [
        'src/main/main.js',
        'src/common/logger.js',
        'src/common/config.js',
        'src/common/health.js',
        'src/services/gmailService.js',
        'src/services/calendarService.js',
        'src/utils/cache.js',
        'src/utils/pagination.js',
        'src/models/Email.js',
        'src/models/Account.js'
      ];

      this.results.files.critical = {};
      
      for (const file of criticalFiles) {
        const filePath = path.join(process.cwd(), file);
        this.results.files.critical[file] = {
          exists: fs.existsSync(filePath),
          size: fs.existsSync(filePath) ? fs.statSync(filePath).size : 0
        };
      }

      // Verificar directorios
      const criticalDirs = [
        'src',
        'src/common',
        'src/services',
        'src/utils',
        'src/models',
        'src/events',
        'src/errors',
        'src/testing',
        'docs',
        'config'
      ];

      this.results.files.directories = {};
      
      for (const dir of criticalDirs) {
        const dirPath = path.join(process.cwd(), dir);
        this.results.files.directories[dir] = {
          exists: fs.existsSync(dirPath),
          isDirectory: fs.existsSync(dirPath) ? fs.statSync(dirPath).isDirectory() : false
        };
      }

      console.log('   ✅ Archivos verificados');
    } catch (error) {
      this.results.files.error = error.message;
      console.log('   ❌ Error verificando archivos:', error.message);
    }
  }

  async checkPerformance() {
    console.log('⚡ Verificando performance...');

    try {
      // Verificar métricas de performance
      const performanceMetrics = PerformanceMonitor.getStats();
      this.results.performance.metrics = performanceMetrics;

      // Verificar métricas de caché
      const cacheStats = cache.getStats();
      this.results.performance.cache = cacheStats;

      // Verificar métricas de paginación
      const { pagination } = require('../src/utils');
      const paginationStats = pagination.getStats();
      this.results.performance.pagination = paginationStats;

      // Verificar métricas de memoria
      this.results.performance.memory = {
        usage: process.memoryUsage(),
        heapUsed: process.memoryUsage().heapUsed,
        heapTotal: process.memoryUsage().heapTotal,
        external: process.memoryUsage().external
      };

      console.log('   ✅ Performance verificada');
    } catch (error) {
      this.results.performance.error = error.message;
      console.log('   ❌ Error verificando performance:', error.message);
    }
  }

  generateReport() {
    console.log('\n📊 Generando reporte de salud...\n');

    // Imprimir resumen
    console.log('=== RESUMEN DE SALUD DEL SISTEMA ===\n');

    // Sistema
    console.log('🖥️ Sistema:');
    console.log(`   Node.js: ${this.results.system.node?.version || 'Desconocido'}`);
    console.log(`   Plataforma: ${this.results.system.node?.platform || 'Desconocido'}`);
    console.log(`   Arquitectura: ${this.results.system.node?.arch || 'Desconocido'}`);
    console.log(`   Memoria total: ${(this.results.system.resources?.totalMemory / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Memoria libre: ${(this.results.system.resources?.freeMemory / 1024 / 1024).toFixed(2)} MB\n`);

    // Aplicación
    console.log('🏗️ Aplicación:');
    console.log(`   Versión: ${this.results.application.config?.version || 'Desconocido'}`);
    console.log(`   Entorno: ${this.results.application.config?.environment || 'Desconocido'}`);
    console.log(`   Debug: ${this.results.application.config?.debug ? 'Habilitado' : 'Deshabilitado'}`);
    console.log(`   Estado de salud: ${this.results.application.health?.overall || 'Desconocido'}\n`);

    // Servicios
    console.log('🔧 Servicios:');
    console.log(`   Gmail: ${this.results.services.gmail?.status || 'Desconocido'}`);
    console.log(`   Calendar: ${this.results.services.calendar?.status || 'Desconocido'}`);
    console.log(`   Cache: ${this.results.services.cache?.status || 'Desconocido'}`);
    console.log(`   Tamaño del caché: ${(this.results.services.cache?.size / 1024 / 1024).toFixed(2)} MB\n`);

    // Dependencias
    console.log('📦 Dependencias:');
    console.log(`   Instaladas: ${this.results.dependencies.installed || 0}`);
    console.log(`   Críticas: ${Object.values(this.results.dependencies.critical || {}).filter(v => v === 'installed').length}/${Object.keys(this.results.dependencies.critical || {}).length}\n`);

    // Archivos
    console.log('📁 Archivos:');
    const criticalFilesOk = Object.values(this.results.files.critical || {}).filter(f => f.exists).length;
    const totalCriticalFiles = Object.keys(this.results.files.critical || {}).length;
    console.log(`   Archivos críticos: ${criticalFilesOk}/${totalCriticalFiles}`);
    const dirsOk = Object.values(this.results.files.directories || {}).filter(d => d.exists && d.isDirectory).length;
    const totalDirs = Object.keys(this.results.files.directories || {}).length;
    console.log(`   Directorios: ${dirsOk}/${totalDirs}\n`);

    // Performance
    console.log('⚡ Performance:');
    console.log(`   Métricas registradas: ${this.results.performance.metrics?.totalMetrics || 0}`);
    console.log(`   Cache hits: ${this.results.performance.cache?.hits || 0}`);
    console.log(`   Cache misses: ${this.results.performance.cache?.misses || 0}`);
    console.log(`   Uso de heap: ${(this.results.performance.memory?.heapUsed / 1024 / 1024).toFixed(2)} MB\n`);

    // Estado general
    const hasErrors = Object.values(this.results).some(result => result.error);
    const overallStatus = hasErrors ? '❌ CON PROBLEMAS' : '✅ SALUDABLE';
    
    console.log(`=== ESTADO GENERAL: ${overallStatus} ===\n`);

    // Guardar reporte
    const reportPath = path.join(process.cwd(), 'health-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`📄 Reporte guardado en: ${reportPath}`);
  }
}

// Ejecutar verificación
if (require.main === module) {
  const healthCheck = new HealthCheck();
  healthCheck.run().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = HealthCheck;