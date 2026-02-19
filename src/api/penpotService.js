/**
 * Penpot Service
 * Servicio para interactuar con la API de Penpot
 */

const axios = require('axios');
const OAuthHelper = require('../common/oauthHelper');
const { PENPOT, ERROR_TYPES } = require('../config/constants');

class PenpotService {
  /**
   * Obtiene listado de proyectos
   * @param {string} accountId - ID de la cuenta
   * @param {number} limit - Límite de resultados
   * @param {number} offset - Desplazamiento
   * @returns {Promise<Object>} Resultado con proyectos
   */
  static async fetchProjects(accountId, limit = PENPOT.DEFAULT_LIMIT, offset = 0) {
    try {
      if (!accountId) {
        throw new Error('Account ID is required');
      }

      const accessToken = await this._getAccessToken(accountId);
      const response = await axios.get(`${PENPOT.API_BASE_URL}/api/projects`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          limit,
          offset
        }
      });

      return {
        success: true,
        data: response.data,
        pagination: {
          limit,
          offset,
          total: response.data.length
        }
      };
    } catch (e) {
      console.error('Fetch projects error:', e);
      return this._handleError(e);
    }
  }

  /**
   * Obtiene listado de diseños de un proyecto
   * @param {string} accountId - ID de la cuenta
   * @param {string} projectId - ID del proyecto
   * @param {number} limit - Límite de resultados
   * @param {number} offset - Desplazamiento
   * @returns {Promise<Object>} Resultado con diseños
   */
  static async fetchDesigns(accountId, projectId, limit = PENPOT.DEFAULT_LIMIT, offset = 0) {
    try {
      if (!accountId || !projectId) {
        throw new Error('Account ID and Project ID are required');
      }

      const accessToken = await this._getAccessToken(accountId);
      const response = await axios.get(`${PENPOT.API_BASE_URL}/api/projects/${projectId}/files`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          limit,
          offset
        }
      });

      return {
        success: true,
        data: response.data,
        projectId,
        pagination: {
          limit,
          offset,
          total: response.data.length
        }
      };
    } catch (e) {
      console.error('Fetch designs error:', e);
      return this._handleError(e);
    }
  }

  /**
   * Obtiene detalles de un diseño
   * @param {string} accountId - ID de la cuenta
   * @param {string} projectId - ID del proyecto
   * @param {string} designId - ID del diseño
   * @returns {Promise<Object>} Detalles del diseño
   */
  static async fetchDesignDetails(accountId, projectId, designId) {
    try {
      if (!accountId || !projectId || !designId) {
        throw new Error('Account ID, Project ID and Design ID are required');
      }

      const accessToken = await this._getAccessToken(accountId);
      const response = await axios.get(`${PENPOT.API_BASE_URL}/api/projects/${projectId}/files/${designId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (e) {
      console.error('Fetch design details error:', e);
      return this._handleError(e, null);
    }
  }

  /**
   * Exporta un diseño a diferentes formatos
   * @param {string} accountId - ID de la cuenta
   * @param {string} projectId - ID del proyecto
   * @param {string} designId - ID del diseño
   * @param {string} format - Formato de exportación (svg, png, jpg, pdf)
   * @param {Object} options - Opciones de exportación
   * @returns {Promise<Object>} Resultado de exportación
   */
  static async exportDesign(accountId, projectId, designId, format = 'svg', options = {}) {
    try {
      if (!accountId || !projectId || !designId) {
        throw new Error('Account ID, Project ID and Design ID are required');
      }

      const accessToken = await this._getAccessToken(accountId);
      const response = await axios.get(`${PENPOT.API_BASE_URL}/api/projects/${projectId}/files/${designId}/export`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          format,
          ...options
        },
        responseType: 'arraybuffer'
      });

      return {
        success: true,
        data: response.data,
        format,
        filename: `${designId}.${format}`
      };
    } catch (e) {
      console.error('Export design error:', e);
      return this._handleError(e, null);
    }
  }

  /**
   * Comparte un diseño
   * @param {string} accountId - ID de la cuenta
   * @param {string} projectId - ID del proyecto
   * @param {string} designId - ID del diseño
   * @param {Object} shareData - Datos de compartir
   * @returns {Promise<Object>} Resultado de compartir
   */
  static async shareDesign(accountId, projectId, designId, shareData) {
    try {
      if (!accountId || !projectId || !designId) {
        throw new Error('Account ID, Project ID and Design ID are required');
      }

      const accessToken = await this._getAccessToken(accountId);
      const response = await axios.post(`${PENPOT.API_BASE_URL}/api/projects/${projectId}/files/${designId}/share`, shareData, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (e) {
      console.error('Share design error:', e);
      return this._handleError(e, null);
    }
  }

  /**
   * Obtiene el token de acceso
   * @private
   */
  static async _getAccessToken(accountId) {
    const oauth2Client = await OAuthHelper.getOAuth2Client(accountId);
    const tokens = await OAuthHelper.getTokens(accountId);

    if (!tokens || !tokens.access_token) {
      throw new Error('Access token not found');
    }

    return tokens.access_token;
  }

  /**
   * Maneja errores y retorna formato estándar
   * @private
   */
  static _handleError(e, defaultData = []) {
    const errorMessage = e.message || 'Unknown error';
    let errorType = ERROR_TYPES.UNKNOWN;

    if (e.response) {
      // Error de respuesta HTTP
      const status = e.response.status;
      if (status === 401) {
        errorType = ERROR_TYPES.AUTHENTICATION;
      } else if (status === 403) {
        errorType = ERROR_TYPES.AUTHENTICATION;
      } else if (status >= 500) {
        errorType = ERROR_TYPES.NETWORK;
      } else if (status === 404) {
        errorType = ERROR_TYPES.ACCOUNT_NOT_FOUND;
      }
    } else if (e.request) {
      // Error de red
      errorType = ERROR_TYPES.NETWORK;
    } else if (errorMessage.includes('token') || errorMessage.includes('auth')) {
      errorType = ERROR_TYPES.AUTHENTICATION;
    } else if (errorMessage.includes('Account not found')) {
      errorType = ERROR_TYPES.ACCOUNT_NOT_FOUND;
    }

    return {
      success: false,
      error: errorMessage,
      errorType,
      data: defaultData
    };
  }
}

module.exports = PenpotService;