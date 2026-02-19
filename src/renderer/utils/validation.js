/**
 * Client-side Validation Utilities
 * Provides validation and sanitization for the renderer process
 */

const ValidationUtils = {
  /**
   * Validates an email payload
   * @param {Object} payload - The email payload to validate
   * @returns {Object} Validation result with isValid, errors, and sanitizedPayload
   */
  validateEmailPayload(payload) {
    const errors = [];
    const sanitizedPayload = { ...payload };

    // Validate required fields
    if (!payload.accountId) {
      errors.push('Account ID is required');
    }

    if (!payload.to) {
      errors.push('Recipient email is required');
    } else if (!this.isValidEmail(payload.to)) {
      errors.push('Invalid recipient email format');
    }

    if (!payload.subject) {
      errors.push('Subject is required');
    } else if (payload.subject.length > 200) {
      errors.push('Subject exceeds maximum length of 200 characters');
      sanitizedPayload.subject = payload.subject.substring(0, 200);
    }

    if (!payload.body) {
      errors.push('Email body is required');
    } else if (payload.body.length > 10000) {
      errors.push('Email body exceeds maximum length of 10000 characters');
      sanitizedPayload.body = payload.body.substring(0, 10000);
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedPayload: errors.length === 0 ? sanitizedPayload : null
    };
  },

  /**
   * Validates an email address format
   * @param {string} email - The email to validate
   * @returns {boolean} True if valid
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Sanitizes text to prevent XSS attacks
   * @param {string} text - The text to sanitize
   * @returns {string} Sanitized text
   */
  sanitizeText(text) {
    if (!text) return '';

    return text
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  },

  /**
   * Sanitizes HTML content (allows basic formatting)
   * @param {string} html - The HTML to sanitize
   * @returns {string} Sanitized HTML
   */
  sanitizeHtml(html) {
    if (!html) return '';

    // Remove script tags and their content
    html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Remove event handlers
    html = html.replace(/\s*on\w+\s*=\s*(['"])[^'"]*\1/gi, '');
    html = html.replace(/\s*on\w+\s*=\s*[^\s>]+/gi, '');

    // Remove javascript: links
    html = html.replace(/javascript:/gi, '');

    // Allow basic formatting tags
    const allowedTags = ['p', 'br', 'b', 'i', 'u', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code'];
    const tagPattern = /<\/?(\w+)[^>]*>/g;

    html = html.replace(tagPattern, (match, tagName) => {
      const lowerTag = tagName.toLowerCase();
      if (allowedTags.includes(lowerTag)) {
        // For anchor tags, remove href if it contains javascript:
        if (lowerTag === 'a') {
          return match.replace(/href\s*=\s*(['"])[^'"]*\1/gi, 'href="$1#"$1');
        }
        return match;
      }
      return '';
    });

    return html;
  },

  /**
   * Validates a search query
   * @param {string} query - The search query to validate
   * @returns {Object} Validation result
   */
  validateSearchQuery(query) {
    const errors = [];
    const sanitizedQuery = this.sanitizeText(query || '');

    if (!sanitizedQuery || sanitizedQuery.trim().length === 0) {
      errors.push('Search query cannot be empty');
    }

    if (sanitizedQuery.length > 500) {
      errors.push('Search query exceeds maximum length of 500 characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedQuery: errors.length === 0 ? sanitizedQuery : null
    };
  }
};

// Expose to window
window.validation = ValidationUtils;
