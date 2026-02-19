#!/usr/bin/env node

/**
 * Cache Cleanup Script
 * 
 * Este script limpia el caché de la aplicación y realiza
 * tareas de mantenimiento de recursos.
 */

const fs = require('fs');
const path = require('path');

class CacheCleaner {
  constructor() {
    this.cacheDir = path.join(process.cwd(), 'cache');
    this.logDir = path.join(process.cwd(), 'logs');
    this.tempDir = path.join(process.cwd(), 'temp');
  }

  async run() {
    console.log('🧹 Iniciando limpieza de caché...\n');

    try {
      // Limpiar caché de la aplicación
      await this.cleanAppCache();
      
      // Limpiar logs antiguos
      await this.cleanOldLogs();
      
      // Limpiar archivos temporales
      await this.cleanTempFiles();
      
      // Limpiar caché del sistema
      await this.cleanSystemCache();

      console.log('✅ Limpieza de caché completada exitosamente');
      return true;

    } catch (error) {
      console.error('❌ Error durante la limpieza de caché:', error.message);
      return false;
    }
  }

  async cleanAppCache() {
    console.log('📦 Limpiando caché de la aplicación...');

    try {
      if (fs.existsSync(this.cacheDir)) {
        const files = fs.readdirSync(this.cacheDir);
        let cleaned = 0;

        for (const file of files) {
          const filePath = path.join(this.cacheDir, file);
          const stats = fs.statSync(filePath);
          
          // Eliminar archivos con más de 7 días
          if (Date.now() - stats.mtime.getTime() > 7 * 24 * 60 * 60 * 1000) {
            fs.unlinkSync(filePath);
            cleaned++;
          }
        }

        console.log(`   ✅ ${cleaned} archivos de caché eliminados`);
      } else {
        console.log('   ℹ️  Directorio de caché no existe');
      }
    } catch (error) {
      console.log(`   ❌ Error limpiando caché: ${error.message}`);
    }
  }

  async cleanOldLogs() {
    console.log('📄 Limpiando logs antiguos...');

    try {
      if (fs.existsSync(this.logDir)) {
        const files = fs.readdirSync(this.logDir);
        let cleaned = 0;

        for (const file of files) {
          if (file.endsWith('.log')) {
            const filePath = path.join(this.logDir, file);
            const stats = fs.statSync(filePath);
            
            // Eliminar logs con más de 30 días
            if (Date.now() - stats.mtime.getTime() > 30 * 24 * 60 * 60 * 1000) {
              fs.unlinkSync(filePath);
              cleaned++;
            }
          }
        }

        console.log(`   ✅ ${cleaned} archivos de log eliminados`);
      } else {
        console.log('   ℹ️  Directorio de logs no existe');
      }
    } catch (error) {
      console.log(`   ❌ Error limpiando logs: ${error.message}`);
    }
  }

  async cleanTempFiles() {
    console.log('🗑️ Limpiando archivos temporales...');

    try {
      if (fs.existsSync(this.tempDir)) {
        const files = fs.readdirSync(this.tempDir);
        let cleaned = 0;

        for (const file of files) {
          const filePath = path.join(this.tempDir, file);
          const stats = fs.statSync(filePath);
          
          // Eliminar archivos temporales con más de 1 día
          if (Date.now() - stats.mtime.getTime() > 24 * 60 * 60 * 1000) {
            fs.unlinkSync(filePath);
            cleaned++;
          }
        }

        console.log(`   ✅ ${cleaned} archivos temporales eliminados`);
      } else {
        console.log('   ℹ️  Directorio temporal no existe');
      }
    } catch (error) {
      console.log(`   ❌ Error limpiando archivos temporales: ${error.message}`);
    }
  }

  async cleanSystemCache() {
    console.log('💻 Limpiando caché del sistema...');

    try {
      // Limpiar caché de Node.js
      const nodeCacheDir = path.join(process.cwd(), 'node_modules/.cache');
      if (fs.existsSync(nodeCacheDir)) {
        const files = fs.readdirSync(nodeCacheDir);
        let cleaned = 0;

        for (const file of files) {
          const filePath = path.join(nodeCacheDir, file);
          try {
            fs.rmSync(filePath, { recursive: true, force: true });
            cleaned++;
          } catch (error) {
            // Ignorar errores al eliminar
          }
        }

        console.log(`   ✅ ${cleaned} archivos de caché de Node.js eliminados`);
      }

      // Forzar garbage collection si está disponible
      if (global.gc) {
        console.log('   🧹 Forzando garbage collection...');
        global.gc();
        console.log('   ✅ Garbage collection completado');
      } else {
        console.log('   ℹ️  Garbage collection no disponible');
      }

    } catch (error) {
      console.log(`   ❌ Error limpiando caché del sistema: ${error.message}`);
    }
  }

  async getCacheStats() {
    console.log('\n📊 Estadísticas del caché...\n');

    const stats = {
      cache: { size: 0, files: 0 },
      logs: { size: 0, files: 0 },
      temp: { size: 0, files: 0 }
    };

    // Estadísticas del caché
    if (fs.existsSync(this.cacheDir)) {
      const files = fs.readdirSync(this.cacheDir);
      stats.cache.files = files.length;
      for (const file of files) {
        const filePath = path.join(this.cacheDir, file);
        const statsFile = fs.statSync(filePath);
        stats.cache.size += statsFile.size;
      }
    }

    // Estadísticas de logs
    if (fs.existsSync(this.logDir)) {
      const files = fs.readdirSync(this.logDir);
      stats.logs.files = files.length;
      for (const file of files) {
        const filePath = path.join(this.logDir, file);
        const statsFile = fs.statSync(filePath);
        stats.logs.size += statsFile.size;
      }
    }

    // Estadísticas de temp
    if (fs.existsSync(this.tempDir)) {
      const files = fs.readdirSync(this.tempDir);
      stats.temp.files = files.length;
      for (const file of files) {
        const filePath = path.join(this.tempDir, file);
        const statsFile = fs.statSync(filePath);
        stats.temp.size += statsFile.size;
      }
    }

    console.log('📦 Caché de la aplicación:');
    console.log(`   Archivos: ${stats.cache.files}`);
    console.log(`   Tamaño: ${(stats.cache.size / 1024 / 1024).toFixed(2)} MB\n`);

    console.log('📄 Logs:');
    console.log(`   Archivos: ${stats.logs.files}`);
    console.log(`   Tamaño: ${(stats.logs.size / 1024 / 1024).toFixed(2)} MB\n`);

    console.log('🗑️ Archivos temporales:');
    console.log(`   Archivos: ${stats.temp.files}`);
    console.log(`   Tamaño: ${(stats.temp.size / 1024 / 1024).toFixed(2)} MB\n`);

    const totalSize = (stats.cache.size + stats.logs.size + stats.temp.size) / 1024 / 1024;
    console.log(`=== Total a liberar: ${totalSize.toFixed(2)} MB ===\n`);

    return stats;
  }
}

// Ejecutar limpieza
if (require.main === module) {
  const cleaner = new CacheCleaner();
  
  // Mostrar estadísticas antes de limpiar
  cleaner.getCacheStats().then(() => {
    return cleaner.run();
  }).then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = CacheCleaner;