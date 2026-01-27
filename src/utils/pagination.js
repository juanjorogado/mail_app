/**
 * Sistema de Paginación Avanzado
 * Implementa paginación con cursor, offset y estrategias de carga inteligente
 */

const { loggers } = require('../common/logger');

class PaginationManager {
  constructor(options = {}) {
    this.defaultPageSize = options.defaultPageSize || 20;
    this.maxPageSize = options.maxPageSize || 100;
    this.enableCursorPagination = options.enableCursorPagination !== false;
    this.enableOffsetPagination = options.enableOffsetPagination !== false;
    this.enableInfiniteScroll = options.enableInfiniteScroll || false;
    
    loggers.app.info('Pagination manager initialized', {
      defaultPageSize: this.defaultPageSize,
      maxPageSize: this.maxPageSize,
      enableCursorPagination: this.enableCursorPagination,
      enableOffsetPagination: this.enableOffsetPagination,
      enableInfiniteScroll: this.enableInfiniteScroll
    });
  }

  /**
   * Pagina datos con estrategia de offset
   * @param {Array} data - Datos a paginar
   * @param {number} page - Número de página (1-based)
   * @param {number} pageSize - Tamaño de página
   * @returns {Object} Resultado paginado
   */
  paginateOffset(data, page = 1, pageSize = this.defaultPageSize) {
    const startTime = Date.now();
    
    try {
      // Validar parámetros
      const validatedParams = this.validatePaginationParams(page, pageSize);
      page = validatedParams.page;
      pageSize = validatedParams.pageSize;
      
      const totalItems = data.length;
      const totalPages = Math.ceil(totalItems / pageSize);
      const startIndex = (page - 1) * pageSize;
      const endIndex = Math.min(startIndex + pageSize, totalItems);
      
      const items = data.slice(startIndex, endIndex);
      
      const result = {
        items,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          pageSize,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
          nextPage: page < totalPages ? page + 1 : null,
          prevPage: page > 1 ? page - 1 : null
        },
        meta: {
          strategy: 'offset',
          startIndex,
          endIndex,
          duration: Date.now() - startTime
        }
      };
      
      loggers.performance.end('pagination.offset', Date.now() - startTime, {
        totalItems,
        pageSize,
        currentPage: page,
        totalPages,
        hasNextPage: result.pagination.hasNextPage
      });
      
      return result;
    } catch (error) {
      loggers.pagination.error('paginateOffset', error, { page, pageSize });
      throw error;
    }
  }

  /**
   * Pagina datos con estrategia de cursor
   * @param {Array} data - Datos a paginar
   * @param {string} cursor - Cursor de posición
   * @param {number} pageSize - Tamaño de página
   * @param {string} sortField - Campo para ordenar
   * @param {string} sortOrder - Orden ('asc' o 'desc')
   * @returns {Object} Resultado paginado
   */
  paginateCursor(data, cursor = null, pageSize = this.defaultPageSize, sortField = 'id', sortOrder = 'asc') {
    const startTime = Date.now();
    
    try {
      // Validar parámetros
      const validatedParams = this.validatePaginationParams(1, pageSize);
      pageSize = validatedParams.pageSize;
      
      // Ordenar datos
      const sortedData = this.sortData(data, sortField, sortOrder);
      
      let startIndex = 0;
      let endIndex = pageSize;
      
      if (cursor) {
        const cursorIndex = this.findCursorIndex(sortedData, cursor, sortField);
        if (cursorIndex !== -1) {
          startIndex = cursorIndex + 1;
          endIndex = startIndex + pageSize;
        }
      }
      
      const endIndexClamped = Math.min(endIndex, sortedData.length);
      const items = sortedData.slice(startIndex, endIndexClamped);
      
      const result = {
        items,
        pagination: {
          cursor: items.length > 0 ? this.getCursor(items[items.length - 1], sortField) : null,
          hasNextPage: endIndex < sortedData.length,
          hasPrevPage: startIndex > 0,
          totalItems: sortedData.length
        },
        meta: {
          strategy: 'cursor',
          startIndex,
          endIndex: endIndexClamped,
          sortField,
          sortOrder,
          duration: Date.now() - startTime
        }
      };
      
      loggers.performance.end('pagination.cursor', Date.now() - startTime, {
        totalItems: sortedData.length,
        pageSize,
        cursor,
        hasNextPage: result.pagination.hasNextPage
      });
      
      return result;
    } catch (error) {
      loggers.pagination.error('paginateCursor', error, { cursor, pageSize, sortField, sortOrder });
      throw error;
    }
  }

  /**
   * Pagina datos con estrategia de carga inteligente (infinite scroll)
   * @param {Array} data - Datos a paginar
   * @param {number} page - Número de página
   * @param {number} pageSize - Tamaño de página
   * @param {number} prefetchPages - Páginas a pre-cargar
   * @returns {Object} Resultado paginado
   */
  paginateInfinite(data, page = 1, pageSize = this.defaultPageSize, prefetchPages = 2) {
    const startTime = Date.now();
    
    try {
      // Validar parámetros
      const validatedParams = this.validatePaginationParams(page, pageSize);
      page = validatedParams.page;
      pageSize = validatedParams.pageSize;
      
      const totalItems = data.length;
      const totalPages = Math.ceil(totalItems / pageSize);
      
      // Calcular rango de carga
      const startPage = Math.max(1, page - prefetchPages);
      const endPage = Math.min(totalPages, page + prefetchPages);
      
      const startIndex = (startPage - 1) * pageSize;
      const endIndex = Math.min(endPage * pageSize, totalItems);
      
      const items = data.slice(startIndex, endIndex);
      
      const result = {
        items,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          pageSize,
          startPage,
          endPage,
          prefetchPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
          nextPage: page < totalPages ? page + 1 : null,
          prevPage: page > 1 ? page - 1 : null
        },
        meta: {
          strategy: 'infinite',
          startIndex,
          endIndex,
          prefetchRange: { startPage, endPage },
          duration: Date.now() - startTime
        }
      };
      
      loggers.performance.end('pagination.infinite', Date.now() - startTime, {
        totalItems,
        pageSize,
        currentPage: page,
        prefetchRange: { startPage, endPage }
      });
      
      return result;
    } catch (error) {
      loggers.pagination.error('paginateInfinite', error, { page, pageSize, prefetchPages });
      throw error;
    }
  }

  /**
   * Pagina datos automáticamente según estrategia
   * @param {Array} data - Datos a paginar
   * @param {Object} options - Opciones de paginación
   * @returns {Object} Resultado paginado
   */
  paginate(data, options = {}) {
    const { strategy = 'offset', ...params } = options;
    
    switch (strategy) {
      case 'cursor':
        return this.paginateCursor(data, params.cursor, params.pageSize, params.sortField, params.sortOrder);
      case 'infinite':
        return this.paginateInfinite(data, params.page, params.pageSize, params.prefetchPages);
      case 'offset':
      default:
        return this.paginateOffset(data, params.page, params.pageSize);
    }
  }

  /**
   * Valida parámetros de paginación
   * @private
   */
  validatePaginationParams(page, pageSize) {
    // Validar página
    const validatedPage = Math.max(1, Math.floor(page) || 1);
    
    // Validar tamaño de página
    const validatedPageSize = Math.max(1, Math.min(Math.floor(pageSize) || this.defaultPageSize, this.maxPageSize));
    
    return { page: validatedPage, pageSize: validatedPageSize };
  }

  /**
   * Ordena datos según campo y dirección
   * @private
   */
  sortData(data, sortField, sortOrder) {
    return [...data].sort((a, b) => {
      const aVal = this.getNestedValue(a, sortField);
      const bVal = this.getNestedValue(b, sortField);
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }

  /**
   * Obtiene valor anidado de objeto
   * @private
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current && current[key], obj);
  }

  /**
   * Encuentra índice por cursor
   * @private
   */
  findCursorIndex(data, cursor, sortField) {
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const itemCursor = this.getCursor(item, sortField);
      if (itemCursor === cursor) {
        return i;
      }
    }
    return -1;
  }

  /**
   * Genera cursor para un item
   * @private
   */
  getCursor(item, sortField) {
    const value = this.getNestedValue(item, sortField);
    return typeof value === 'string' ? value : String(value);
  }

  /**
   * Calcula estadísticas de paginación
   * @param {Array} data - Datos originales
   * @param {Object} paginationResult - Resultado de paginación
   * @returns {Object} Estadísticas
   */
  calculateStats(data, paginationResult) {
    const totalItems = data.length;
    const currentPageItems = paginationResult.items.length;
    const totalPages = paginationResult.pagination.totalPages || Math.ceil(totalItems / paginationResult.pagination.pageSize);
    
    return {
      totalItems,
      currentPageItems,
      totalPages,
      currentPage: paginationResult.pagination.currentPage || 1,
      pageSize: paginationResult.pagination.pageSize,
      strategy: paginationResult.meta.strategy,
      efficiency: currentPageItems / Math.min(paginationResult.pagination.pageSize, totalItems),
      memoryUsage: {
        original: this.calculateMemoryUsage(data),
        paginated: this.calculateMemoryUsage(paginationResult.items),
        reduction: totalItems > 0 ? (1 - currentPageItems / totalItems) * 100 : 0
      }
    };
  }

  /**
   * Calcula uso de memoria
   * @private
   */
  calculateMemoryUsage(data) {
    try {
      const str = JSON.stringify(data);
      return Buffer.byteLength(str, 'utf8');
    } catch (error) {
      loggers.pagination.error('calculateMemoryUsage', error);
      return 0;
    }
  }

  /**
   * Optimiza paginación según características de los datos
   * @param {Array} data - Datos a analizar
   * @returns {Object} Estrategia recomendada
   */
  analyzeDataForPagination(data) {
    const totalItems = data.length;
    const avgItemSize = totalItems > 0 ? this.calculateMemoryUsage(data) / totalItems : 0;
    
    // Determinar estrategia óptima
    let strategy = 'offset';
    let reason = '';
    
    if (totalItems > 1000) {
      strategy = 'cursor';
      reason = 'Large dataset - cursor pagination recommended';
    } else if (avgItemSize > 1000) {
      strategy = 'infinite';
      reason = 'Large items - infinite scroll recommended';
    } else if (totalItems > 100) {
      strategy = 'cursor';
      reason = 'Medium dataset - cursor pagination for better performance';
    } else {
      strategy = 'offset';
      reason = 'Small dataset - offset pagination sufficient';
    }
    
    return {
      recommendedStrategy: strategy,
      reason,
      analysis: {
        totalItems,
        avgItemSize: Math.round(avgItemSize),
        memoryUsage: this.formatBytes(this.calculateMemoryUsage(data)),
        strategy: strategy
      }
    };
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
   * Crea paginador reutilizable
   * @param {Array} data - Datos a paginar
   * @param {Object} options - Opciones de paginación
   * @returns {Object} Paginador con métodos
   */
  createPaginator(data, options = {}) {
    const paginator = {
      data,
      options: { ...options },
      currentPage: 1,
      totalPages: 0,
      
      // Métodos
      goToPage(page) {
        const result = this.paginate(page, this.options.pageSize);
        this.currentPage = result.pagination.currentPage;
        this.totalPages = result.pagination.totalPages;
        return result;
      },
      
      nextPage() {
        return this.goToPage(this.currentPage + 1);
      },
      
      prevPage() {
        return this.goToPage(Math.max(1, this.currentPage - 1));
      },
      
      firstPage() {
        return this.goToPage(1);
      },
      
      lastPage() {
        const result = this.goToPage(this.totalPages);
        this.currentPage = result.pagination.currentPage;
        return result;
      },
      
      paginate(page, pageSize) {
        return this.paginateData(data, page, pageSize || this.options.pageSize);
      },
      
      getStats() {
        const result = this.paginate(this.currentPage);
        return this.calculateStats(data, result);
      }
    };
    
    // Inicializar
    const initialResult = paginator.paginate(1);
    paginator.currentPage = initialResult.pagination.currentPage;
    paginator.totalPages = initialResult.pagination.totalPages;
    
    return paginator;
  }

  /**
   * Pagina datos internamente
   * @private
   */
  paginateData(data, page, pageSize) {
    return this.paginateOffset(data, page, pageSize);
  }
}

// Exportar instancia única (Singleton)
module.exports = new PaginationManager({
  defaultPageSize: 20,
  maxPageSize: 100,
  enableCursorPagination: true,
  enableOffsetPagination: true,
  enableInfiniteScroll: true
});