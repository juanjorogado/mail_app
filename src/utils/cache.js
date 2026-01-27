/**
 * Sistema de Caché Avanzado
 * Implementa caché con TTL, LRU eviction y persistencia opcional
 */

const { loggers } = require('../common/logger');

class CacheManager {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.defaultTTL || 5 * 60 * 1000; // 5 minutos
    this.enablePersistence = options.enablePersistence || false;
    this.enableCompression = options.enableCompression || false;
    
    this.cache = new Map();
    this.accessOrder = new Map(); // Para LRU
    this.timers = new Map(); // Para TTL
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      memoryUsage: 0
    };
    
    // Inicializar persistencia si está habilitada
    if (this.enablePersistence) {
      this.loadFromStorage();
    }
    
    loggers.app.info('Cache manager initialized', {
      maxSize: this.maxSize,
      defaultTTL: this.defaultTTL,
      enablePersistence: this.enablePersistence,
      enableCompression: this.enableCompression
    });
  }

  /**
   * Obtiene un valor del caché
   * @param {string} key - Clave del caché
   * @returns {*} Valor almacenado o undefined
   */
  get(key) {
    const startTime = Date.now();
    
    try {
      const entry = this.cache.get(key);
      
      if (!entry) {
        this.stats.misses++;
        loggers.performance.end('cache.get', Date.now() - startTime, { 
          key, 
          hit: false,
          reason: 'not_found' 
        });
        return undefined;
      }

      // Verificar TTL
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        this.delete(key);
        this.stats.misses++;
        loggers.performance.end('cache.get', Date.now() - startTime, { 
          key, 
          hit: false,
          reason: 'expired' 
        });
        return undefined;
      }

      // Actualizar orden de acceso (LRU)
      this.updateAccessOrder(key);
      
      this.stats.hits++;
      this.stats.memoryUsage = this.calculateMemoryUsage();
      
      loggers.performance.end('cache.get', Date.now() - startTime, { 
        key, 
        hit: true,
        size: this.getEntrySize(entry.value) 
      });
      
      return entry.value;
    } catch (error) {
      loggers.cache.error('get', error, { key });
      this.stats.misses++;
      return undefined;
    }
  }

  /**
   * Almacena un valor en el caché
   * @param {string} key - Clave del caché
   * @param {*} value - Valor a almacenar
   * @param {number} ttl - Tiempo de vida en milisegundos
   */
  set(key, value, ttl = this.defaultTTL) {
    const startTime = Date.now();
    
    try {
      // Comprimir valor si está habilitado
      const compressedValue = this.enableCompression ? this.compress(value) : value;
      
      // Verificar tamaño máximo
      const entrySize = this.getEntrySize(compressedValue);
      if (entrySize > this.maxSize * 1024) { // Convertir a bytes
        loggers.cache.warn('Value too large for cache', { key, size: entrySize });
        return false;
      }

      // Eliminar entrada existente si existe
      if (this.cache.has(key)) {
        this.delete(key);
      }

      // Verificar límite de tamaño y aplicar LRU si es necesario
      this.evictIfNecessary();

      // Crear nueva entrada
      const entry = {
        value: compressedValue,
        createdAt: Date.now(),
        expiresAt: ttl > 0 ? Date.now() + ttl : null,
        size: entrySize
      };

      this.cache.set(key, entry);
      this.updateAccessOrder(key);
      
      // Configurar temporizador de expiración
      if (entry.expiresAt) {
        const timer = setTimeout(() => {
          this.delete(key);
        }, ttl);
        this.timers.set(key, timer);
      }

      this.stats.sets++;
      this.stats.memoryUsage = this.calculateMemoryUsage();
      
      loggers.performance.end('cache.set', Date.now() - startTime, { 
        key, 
        size: entrySize,
        ttl,
        cacheSize: this.cache.size 
      });
      
      return true;
    } catch (error) {
      loggers.cache.error('set', error, { key });
      return false;
    }
  }

  /**
   * Elimina una entrada del caché
   * @param {string} key - Clave a eliminar
   */
  delete(key) {
    try {
      const entry = this.cache.get(key);
      
      if (entry) {
        // Limpiar temporizador
        if (this.timers.has(key)) {
          clearTimeout(this.timers.get(key));
          this.timers.delete(key);
        }
        
        // Eliminar de estructuras
        this.cache.delete(key);
        this.accessOrder.delete(key);
        
        this.stats.deletes++;
        this.stats.memoryUsage = this.calculateMemoryUsage();
        
        loggers.cache.info('Entry deleted', { key, size: entry.size });
      }
    } catch (error) {
      loggers.cache.error('delete', error, { key });
    }
  }

  /**
   * Limpia todo el caché
   */
  clear() {
    try {
      // Limpiar todos los temporizadores
      for (const timer of this.timers.values()) {
        clearTimeout(timer);
      }
      
      this.cache.clear();
      this.accessOrder.clear();
      this.timers.clear();
      
      this.stats.deletes += this.stats.hits + this.stats.misses;
      this.stats.memoryUsage = 0;
      
      loggers.cache.info('Cache cleared');
    } catch (error) {
      loggers.cache.error('clear', error);
    }
  }

  /**
   * Verifica si una clave existe en el caché
   * @param {string} key - Clave a verificar
   * @returns {boolean} True si existe
   */
  has(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Verificar TTL
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Obtiene todas las claves del caché
   * @returns {Array} Array de claves
   */
  keys() {
    return Array.from(this.cache.keys());
  }

  /**
   * Obtiene estadísticas del caché
   * @returns {Object} Estadísticas
   */
  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
      memoryUsage: this.formatBytes(this.stats.memoryUsage),
      oldestEntry: this.getOldestEntry(),
      newestEntry: this.getNewestEntry()
    };
  }

  /**
   * Obtiene el valor más antiguo (para debugging)
   * @private
   */
  getOldestEntry() {
    let oldestKey = null;
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }
    
    return oldestKey ? { key: oldestKey, age: Date.now() - oldestTime } : null;
  }

  /**
   * Obtiene el valor más nuevo (para debugging)
   * @private
   */
  getNewestEntry() {
    let newestKey = null;
    let newestTime = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.createdAt > newestTime) {
        newestTime = entry.createdAt;
        newestKey = key;
      }
    }
    
    return newestKey ? { key: newestKey, age: Date.now() - newestTime } : null;
  }

  /**
   * Actualiza el orden de acceso para LRU
   * @private
   */
  updateAccessOrder(key) {
    this.accessOrder.delete(key);
    this.accessOrder.set(key, Date.now());
  }

  /**
   * Aplica política de eviction LRU
   * @private
   */
  evictIfNecessary() {
    while (this.cache.size >= this.maxSize) {
      const oldestKey = this.getLeastRecentlyUsedKey();
      if (oldestKey) {
        this.delete(oldestKey);
        this.stats.evictions++;
      } else {
        break;
      }
    }
  }

  /**
   * Obtiene la clave menos recientemente usada
   * @private
   */
  getLeastRecentlyUsedKey() {
    let oldestKey = null;
    let oldestTime = Date.now();
    
    for (const [key, accessTime] of this.accessOrder.entries()) {
      if (accessTime < oldestTime) {
        oldestTime = accessTime;
        oldestKey = key;
      }
    }
    
    return oldestKey;
  }

  /**
   * Calcula el tamaño de una entrada
   * @private
   */
  getEntrySize(value) {
    try {
      const str = JSON.stringify(value);
      return Buffer.byteLength(str, 'utf8');
    } catch (error) {
      loggers.cache.error('getEntrySize', error);
      return 0;
    }
  }

  /**
   * Calcula el uso total de memoria
   * @private
   */
  calculateMemoryUsage() {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += entry.size || 0;
    }
    return totalSize;
  }

  /**
   * Formatea bytes a string legible
   * @private
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Comprime un valor (simplificado)
   * @private
   */
  compress(value) {
    // Implementación simplificada de compresión
    // En un entorno real, usarías una librería como lz-string o pako
    try {
      const str = JSON.stringify(value);
      // Simple compression simulation
      return str.length > 1000 ? { __compressed: true, data: str } : value;
    } catch (error) {
      loggers.cache.error('compress', error);
      return value;
    }
  }

  /**
   * Descomprime un valor
   * @private
   */
  decompress(value) {
    if (value && value.__compressed) {
      return JSON.parse(value.data);
    }
    return value;
  }

  /**
   * Persiste el caché en almacenamiento
   * @private
   */
  saveToStorage() {
    if (!this.enablePersistence) return;

    try {
      const data = {
        cache: Array.from(this.cache.entries()),
        accessOrder: Array.from(this.accessOrder.entries()),
        createdAt: Date.now(),
        version: '1.0'
      };
      
      // Guardar en localStorage o sistema de archivos
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('app-cache', JSON.stringify(data));
      }
      
      loggers.cache.info('Cache saved to storage');
    } catch (error) {
      loggers.cache.error('saveToStorage', error);
    }
  }

  /**
   * Carga el caché desde almacenamiento
   * @private
   */
  loadFromStorage() {
    if (!this.enablePersistence) return;

    try {
      let data;
      
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('app-cache');
        if (stored) {
          data = JSON.parse(stored);
        }
      }
      
      if (data && data.cache) {
        // Restaurar caché
        for (const [key, entry] of data.cache) {
          this.cache.set(key, entry);
        }
        
        // Restaurar orden de acceso
        for (const [key, accessTime] of data.accessOrder) {
          this.accessOrder.set(key, accessTime);
        }
        
        // Configurar temporizadores para entradas con TTL
        for (const [key, entry] of this.cache.entries()) {
          if (entry.expiresAt && entry.expiresAt > Date.now()) {
            const ttl = entry.expiresAt - Date.now();
            const timer = setTimeout(() => {
              this.delete(key);
            }, ttl);
            this.timers.set(key, timer);
          }
        }
        
        loggers.cache.info('Cache loaded from storage', { 
          entries: this.cache.size,
          memoryUsage: this.calculateMemoryUsage() 
        });
      }
    } catch (error) {
      loggers.cache.error('loadFromStorage', error);
    }
  }

  /**
   * Limpia entradas expiradas
   */
  cleanupExpired() {
    const now = Date.now();
    const expiredKeys = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && entry.expiresAt <= now) {
        expiredKeys.push(key);
      }
    }
    
    for (const key of expiredKeys) {
      this.delete(key);
    }
    
    loggers.cache.info('Expired entries cleaned up', { count: expiredKeys.length });
  }

  /**
   * Obtiene un valor con fallback a función generadora
   * @param {string} key - Clave del caché
   * @param {Function} generator - Función que genera el valor
   * @param {number} ttl - Tiempo de vida en milisegundos
   * @returns {*} Valor del caché o generado
   */
  async getOrGenerate(key, generator, ttl = this.defaultTTL) {
    // Intentar obtener del caché
    let value = this.get(key);
    
    if (value !== undefined) {
      return value;
    }
    
    // Generar nuevo valor
    try {
      value = await generator();
      
      // Almacenar en caché
      this.set(key, value, ttl);
      
      return value;
    } catch (error) {
      loggers.cache.error('getOrGenerate', error, { key });
      throw error;
    }
  }
}

// Exportar instancia única (Singleton)
module.exports = new CacheManager({
  maxSize: 500,
  defaultTTL: 10 * 60 * 1000, // 10 minutos
  enablePersistence: true,
  enableCompression: true
});