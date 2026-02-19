/**
 * SearchManager - Gestión centralizada de búsquedas
 * Maneja la lógica de búsqueda, validación y debounce
 */

import { SELECTORS, CSS_CLASSES } from '../config/uiConfig.js';
import { MESSAGES, TIMEOUTS, LIMITS } from '../config/textConstants.js';

export class SearchManager {
  constructor(uiManager) {
    this.uiManager = uiManager;
    this.searchTimeout = null;
    this.currentQuery = '';
    this.isSearchMode = false;
    this.initSearchElements();
  }

  /**
   * Inicializa elementos de búsqueda
   */
  initSearchElements() {
    this.searchButton = document.querySelector(SELECTORS.SEARCH_BUTTON);
    this.searchInput = document.querySelector(SELECTORS.SEARCH_INPUT) || this.createSearchInput();
    
    this.attachSearchListeners();
  }

  /**
   * Crea el input de búsqueda si no existe
   */
  createSearchInput() {
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'search-input';
    input.placeholder = MESSAGES.PLACEHOLDERS.SEARCH_INPUT;
    input.classList.add('search-input', CSS_CLASSES.HIDDEN);

    const searchContainer = document.querySelector('.main-content .flex.items-center.space-x-4');
    if (searchContainer) {
      searchContainer.appendChild(input);
    }

    return input;
  }

  /**
   * Adjunta listeners de búsqueda
   */
  attachSearchListeners() {
    if (this.searchButton) {
      this.searchButton.addEventListener('click', () => {
        this.toggleSearchInput();
      });
    }

    if (this.searchInput) {
      this.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.performSearch(this.searchInput.value.trim());
        }
      });

      this.searchInput.addEventListener('input', (e) => {
        this.handleSearchInput(e.target.value);
      });

      this.searchInput.addEventListener('blur', () => {
        this.handleSearchBlur();
      });
    }
  }

  /**
   * Maneja el toggle del input de búsqueda
   */
  toggleSearchInput() {
    if (this.searchInput.classList.contains(CSS_CLASSES.HIDDEN)) {
      this.showSearchInput();
    } else {
      this.hideSearchInput();
    }
  }

  /**
   * Muestra el input de búsqueda
   */
  showSearchInput() {
    this.searchInput.classList.remove(CSS_CLASSES.HIDDEN);
    this.searchButton.classList.add('active');
    this.searchInput.focus();
  }

  /**
   * Oculta el input de búsqueda
   */
  hideSearchInput() {
    this.searchInput.classList.add(CSS_CLASSES.HIDDEN);
    this.searchButton.classList.remove(CSS_CLASSES.HIDDEN);
    
    if (this.currentQuery) {
      this.clearSearch();
    }
  }

  /**
   * Maneja el input de búsqueda con debounce
   */
  handleSearchInput(value) {
    // Limpiar timeout anterior
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // Validar longitud mínima
    if (value.length < LIMITS.SEARCH_QUERY_MIN) {
      return;
    }

    // Validar longitud máxima
    if (value.length > LIMITS.SEARCH_QUERY_MAX) {
      this.uiManager.showNotification(
        `La búsqueda es demasiado larga (máximo ${LIMITS.SEARCH_QUERY_MAX} caracteres)`,
        'error',
        TIMEOUTS.NOTIFICATION_SHORT
      );
      return;
    }

    // Debounce para evitar búsquedas excesivas
    this.searchTimeout = setTimeout(() => {
      this.performSearch(value);
    }, TIMEOUTS.SEARCH_DEBOUNCE);
  }

  /**
   * Maneja el blur del input de búsqueda
   */
  handleSearchBlur() {
    if (!this.searchInput.value.trim()) {
      this.hideSearchInput();
    }
  }

  /**
   * Valida la consulta de búsqueda
   */
  validateSearchQuery(query) {
    const errors = [];

    if (!query || typeof query !== 'string') {
      errors.push('La consulta de búsqueda es requerida');
    }

    if (query.length < LIMITS.SEARCH_QUERY_MIN) {
      errors.push(`La búsqueda debe tener al menos ${LIMITS.SEARCH_QUERY_MIN} caracteres`);
    }

    if (query.length > LIMITS.SEARCH_QUERY_MAX) {
      errors.push(`La búsqueda no puede exceder ${LIMITS.SEARCH_QUERY_MAX} caracteres`);
    }

    // Validar caracteres peligrosos
    const dangerousChars = /[<>'"&]/;
    if (dangerousChars.test(query)) {
      errors.push('La búsqueda contiene caracteres no válidos');
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedQuery: this.sanitizeQuery(query)
    };
  }

  /**
   * Sanitiza la consulta de búsqueda
   */
  sanitizeQuery(query) {
    if (!query || typeof query !== 'string') return '';

    return query
      .trim()
      .replace(/[<>'"&]/g, '') // Remover caracteres peligrosos
      .replace(/\s+/g, ' ') // Normalizar espacios
      .substring(0, LIMITS.SEARCH_QUERY_MAX); // Limitar longitud
  }

  /**
   * Realiza la búsqueda
   */
  async performSearch(query) {
    const currentAccountId = this.uiManager.getCurrentAccountId();
    
    if (!currentAccountId) {
      this.uiManager.showNotification(
        MESSAGES.NOTIFICATIONS.NO_ACCOUNT_SEARCH,
        'warning',
        TIMEOUTS.NOTIFICATION_DEFAULT
      );
      return;
    }

    const validation = this.validateSearchQuery(query);
    
    if (!validation.isValid) {
      this.uiManager.showNotification(
        validation.errors[0],
        'error',
        TIMEOUTS.NOTIFICATION_DEFAULT
      );
      return;
    }

    this.currentQuery = validation.sanitizedQuery;
    this.isSearchMode = true;
    this.uiManager.setSearchMode(true);

    try {
      this.uiManager.showNotification(
        MESSAGES.NOTIFICATIONS.SEARCH_LOADING,
        'info',
        0 // Sin timeout - se mostrará hasta que termine
      );

      const response = await window.electronAPI.searchEmails(
        currentAccountId,
        this.currentQuery
      );

      // Ocultar notificación de carga
      this.uiManager.showNotification('', 'info', 1);

      if (response.success) {
        this.handleSearchSuccess(response.data);
      } else {
        this.handleSearchError(response.error);
      }
    } catch (error) {
      this.handleSearchError(this.getSearchErrorMessage(error));
    }
  }

  /**
   * Maneja éxito de búsqueda
   */
  handleSearchSuccess(results) {
    this.uiManager.updateMessageListHeader(
      `"${this.currentQuery}"`,
      results.length,
      true
    );

    this.uiManager.showNotification(
      MESSAGES.NOTIFICATIONS.SEARCH_RESULTS(results.length),
      'success',
      TIMEOUTS.NOTIFICATION_DEFAULT
    );

    // Emitir evento para que otros módulos rendericen los resultados
    this.emitSearchResults(results);
  }

  /**
   * Maneja error de búsqueda
   */
  handleSearchError(error) {
    console.error('Search error:', error);
    
    this.uiManager.showNotification(
      `${MESSAGES.NOTIFICATIONS.SEARCH_ERROR}: ${error}`,
      'error',
      TIMEOUTS.NOTIFICATION_LONG
    );
  }

  /**
   * Obtiene mensaje de error apropiado
   */
  getSearchErrorMessage(error) {
    if (!error || !error.message) {
      return MESSAGES.NOTIFICATIONS.NETWORK_ERROR;
    }

    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes('network') || 
        errorMessage.includes('fetch') ||
        errorMessage.includes('internet')) {
      return MESSAGES.NOTIFICATIONS.NO_INTERNET;
    }

    if (errorMessage.includes('timeout') || 
        errorMessage.includes('etimedout')) {
      return MESSAGES.NOTIFICATIONS.TIMEOUT_ERROR;
    }

    if (errorMessage.includes('auth') || 
        errorMessage.includes('401')) {
      return MESSAGES.NOTIFICATIONS.AUTH_ERROR;
    }

    return error.message || MESSAGES.NOTIFICATIONS.NETWORK_ERROR;
  }

  /**
   * Limpia la búsqueda actual
   */
  clearSearch() {
    this.currentQuery = '';
    this.isSearchMode = false;
    this.uiManager.setSearchMode(false);
    
    if (this.searchInput) {
      this.searchInput.value = '';
    }

    // Limpiar timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = null;
    }

    // Emitir evento de limpieza
    this.emitSearchClear();
  }

  /**
   * Emite resultados de búsqueda
   */
  emitSearchResults(results) {
    const event = new CustomEvent('searchResults', {
      detail: { results, query: this.currentQuery }
    });
    document.dispatchEvent(event);
  }

  /**
   * Emite evento de limpieza de búsqueda
   */
  emitSearchClear() {
    const event = new CustomEvent('searchClear', {
      detail: {}
    });
    document.dispatchEvent(event);
  }

  /**
   * Obtiene el estado actual de búsqueda
   */
  getSearchState() {
    return {
      currentQuery: this.currentQuery,
      isSearchMode: this.isSearchMode,
      isActive: !this.searchInput.classList.contains(CSS_CLASSES.HIDDEN)
    };
  }

  /**
   * Establece foco en el input de búsqueda
   */
  focus() {
    if (this.searchInput) {
      this.showSearchInput();
      this.searchInput.focus();
    }
  }

  /**
   * Limpia recursos
   */
  cleanup() {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
      this.searchTimeout = null;
    }
    
    this.currentQuery = '';
    this.isSearchMode = false;
  }
}
