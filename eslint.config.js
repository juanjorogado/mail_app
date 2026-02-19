module.exports = [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        localStorage: 'readonly',
        global: 'readonly'
      }
    },
    rules: {
      // Estilo y formato
      'indent': ['error', 2],
      'linebreak-style': ['error', 'unix'],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'semi': ['error', 'always'],
      'comma-dangle': ['error', 'never'],
      'no-trailing-spaces': 'error',
      'eol-last': 'error',
      
      // Variables
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      
      // Buenas prácticas
      'no-console': 'off', // Permitimos console.log en desarrollo
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      
      // Espaciado
      'space-before-function-paren': ['error', 'never'],
      'keyword-spacing': 'error',
      'space-infix-ops': 'error',
      'comma-spacing': ['error', { before: false, after: true }],
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      
      // Estilo de nombres
      'camelcase': ['error', { properties: 'always' }],
      'new-cap': 'error',
      
      // Manejo de errores
      'no-throw-literal': 'error',
      'prefer-promise-reject-errors': 'error',
      
      // Import/require
      'no-duplicate-imports': 'error',
      'no-useless-rename': 'error'
    }
  },
  {
    // Reglas específicas para archivos de test
    files: ['**/*.test.js', '**/*.spec.js'],
    rules: {
      'no-console': 'off'
    }
  },
  {
    // Reglas específicas para archivos del renderer (frontend)
    files: ['src/renderer/**/*.js'],
    languageOptions: {
      globals: {
        document: 'readonly',
        window: 'readonly',
        alert: 'readonly'
      }
    },
    rules: {
      'no-alert': 'off',
      'no-undef': ['error', { typeof: true }]
    }
  },
  {
    // Reglas específicas para archivos de componentes
    files: ['src/components/**/*.js'],
    languageOptions: {
      globals: {
        document: 'readonly'
      }
    },
    rules: {
      'no-undef': ['error', { typeof: true }]
    }
  },
  {
    // Reglas específicas para archivos de validación
    files: ['src/common/validation.js'],
    languageOptions: {
      globals: {
        window: 'readonly'
      }
    },
    rules: {
      'no-undef': ['error', { typeof: true }]
    }
  },
  {
    // Reglas específicas para archivos de notificaciones
    files: ['src/common/notifications.js', 'src/events/notifications.js'],
    languageOptions: {
      globals: {
        document: 'readonly',
        setTimeout: 'readonly'
      }
    },
    rules: {
      'no-undef': ['error', { typeof: true }]
    }
  }
];