#!/usr/bin/env node

/**
 * Database Optimization Script
 * 
 * Este script optimiza la base de datos y realiza
 * tareas de mantenimiento de almacenamiento.
 */

const fs = require('fs');
const path = require('path');

class DatabaseOptimizer {
  constructor() {
    this.storageDir = path.join(process.cwd(), 'storage');
    this.backupDir = path.join(process.cwd(), 'backups');
  }

  async run() {
    console.log('🔧 Iniciando optimización de base de datos...\n');

    try {
      // Optimizar almacenamiento
      await this.optimizeStorage();
      
      // Limpiar datos obsoletos
      await this.cleanObsoleteData();
      
      // Optimizar índices
      await this.optimizeIndexes();
      
      // Realizar backup
      await this.createBackup();

      console.log('✅ Optimización de base de datos completada exitosamente');
      return true;

    } catch (error) {
      console.error('❌ Error durante la optimización de la base de datos:', error.message);
      return false;
    }
  }

  async optimizeStorage() {
    console.log('💾 Optimizando almacenamiento...');

    try {
      if (fs.existsSync(this.storageDir)) {
        const files = fs.readdirSync(this.storageDir);
        let optimized = 0;

        for (const file of files) {
          if (file.endsWith('.json')) {
            const filePath = path.join(this.storageDir, file);
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            // Compactar datos eliminando propiedades nulas o undefined
            const compacted = this.compactData(data);
            
            if (JSON.stringify(compacted) !== JSON.stringify(data)) {
              fs.writeFileSync(filePath, JSON.stringify(compacted, null, 2));
              optimized++;
            }
          }
        }

        console.log(`   ✅ ${optimized} archivos optimizados`);
      } else {
        console.log('   ℹ️  Directorio de almacenamiento no existe');
      }
    } catch (error) {
      console.log(`   ❌ Error optimizando almacenamiento: ${error.message}`);
    }
  }

  async cleanObsoleteData() {
    console.log('🗑️ Limpiando datos obsoletos...');

    try {
      if (fs.existsSync(this.storageDir)) {
        const files = fs.readdirSync(this.storageDir);
        let cleaned = 0;

        for (const file of files) {
          if (file.endsWith('.json')) {
            const filePath = path.join(this.storageDir, file);
            const stats = fs.statSync(filePath);
            
            // Eliminar archivos con más de 90 días
            if (Date.now() - stats.mtime.getTime() > 90 * 24 * 60 * 60 * 1000) {
              fs.unlinkSync(filePath);
              cleaned++;
            }
          }
        }

        console.log(`   ✅ ${cleaned} archivos obsoletos eliminados`);
      } else {
        console.log('   ℹ️  Directorio de almacenamiento no existe');
      }
    } catch (error) {
      console.log(`   ❌ Error limpiando datos obsoletos: ${error.message}`);
    }
  }

  async optimizeIndexes() {
    console.log('📊 Optimizando índices...');

    try {
      // Crear índices para búsquedas rápidas
      const indexFile = path.join(this.storageDir, 'index.json');
      const index = {};

      if (fs.existsSync(this.storageDir)) {
        const files = fs.readdirSync(this.storageDir);
        
        for (const file of files) {
          if (file.endsWith('.json')) {
            const filePath = path.join(this.storageDir, file);
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            // Crear índices basados en tipos de datos
            if (data.type) {
              if (!index[data.type]) {
                index[data.type] = [];
              }
              index[data.type].push(file);
            }
          }
        }

        fs.writeFileSync(indexFile, JSON.stringify(index, null, 2));
        console.log('   ✅ Índices creados');
      }
    } catch (error) {
      console.log(`   ❌ Error optimizando índices: ${error.message}`);
    }
  }

  async createBackup() {
    console.log('💾 Creando backup...');

    try {
      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(this.backupDir, `backup-${timestamp}.json`);
      
      if (fs.existsSync(this.storageDir)) {
        const files = fs.readdirSync(this.storageDir);
        const backupData = {};

        for (const file of files) {
          const filePath = path.join(this.storageDir, file);
          backupData[file] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }

        fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
        console.log(`   ✅ Backup creado: ${backupFile}`);
      } else {
        console.log('   ℹ️  Directorio de almacenamiento no existe');
      }
    } catch (error) {
      console.log(`   ❌ Error creando backup: ${error.message}`);
    }
  }

  compactData(data) {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.compactData(item)).filter(item => item !== null && item !== undefined);
    }

    const result = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== null && value !== undefined) {
        result[key] = this.compactData(value);
      }
    }

    return result;
  }

  async getStorageStats() {
    console.log('\n📊 Estadísticas del almacenamiento...\n');

    const stats = {
      storage: { size: 0, files: 0 },
      backups: { size: 0, files: 0 }
    };

    // Estadísticas del almacenamiento
    if (fs.existsSync(this.storageDir)) {
      const files = fs.readdirSync(this.storageDir);
      stats.storage.files = files.length;
      for (const file of files) {
        const filePath = path.join(this.storageDir, file);
        const statsFile = fs.statSync(filePath);
        stats.storage.size += statsFile.size;
      }
    }

    // Estadísticas de backups
    if (fs.existsSync(this.backupDir)) {
      const files = fs.readdirSync(this.backupDir);
      stats.backups.files = files.length;
      for (const file of files) {
        const filePath = path.join(this.backupDir, file);
        const statsFile = fs.statSync(filePath);
        stats.backups.size += statsFile.size;
      }
    }

    console.log('💾 Almacenamiento:');
    console.log(`   Archivos: ${stats.storage.files}`);
    console.log(`   Tamaño: ${(stats.storage.size / 1024 / 1024).toFixed(2)} MB\n`);

    console.log('📦 Backups:');
    console.log(`   Archivos: ${stats.backups.files}`);
    console.log(`   Tamaño: ${(stats.backups.size / 1024 / 1024).toFixed(2)} MB\n`);

    const totalSize = (stats.storage.size + stats.backups.size) / 1024 / 1024;
    console.log(`=== Total almacenado: ${totalSize.toFixed(2)} MB ===\n`);

    return stats;
  }
}

// Ejecutar optimización
if (require.main === module) {
  const optimizer = new DatabaseOptimizer();
  
  // Mostrar estadísticas antes de optimizar
  optimizer.getStorageStats().then(() => {
    return optimizer.run();
  }).then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = DatabaseOptimizer;