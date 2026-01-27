# Best Practices - Desarrollo

## 🎯 Principios de Desarrollo

Esta guía establece las mejores prácticas para el desarrollo en la Mail App, asegurando código de alta calidad, mantenible y escalable.

## 📝 Convenciones de Código

### 1. **Estilo de Código**

#### JavaScript Style Guide
```javascript
// ✅ Bueno: Uso consistente de const/let
const config = require('./config');
let counter = 0;

// ❌ Malo: Uso inconsistente de var
var config = require('./config');
var counter = 0;

// ✅ Bueno: Arrow functions para callbacks simples
const result = items.map(item => item.name);

// ❌ Malo: Funciones anónimas largas
const result = items.map(function(item) {
  return item.name;
});

// ✅ Bueno: Destructuring para objetos complejos
const { name, email, settings } = user;

// ❌ Malo: Acceso directo a propiedades
const name = user.name;
const email = user.email;
const settings = user.settings;
```

#### Naming Conventions
```javascript
// ✅ Bueno: Nombres descriptivos y específicos
const userEmail = 'user@example.com';
const isAccountActive = true;
const fetchUserPreferences = async () => { /* ... */ };

// ❌ Malo: Nombres genéricos o abreviados
const email = 'user@example.com';
const active = true;
const getPrefs = async () => { /* ... */ };

// ✅ Bueno: Clases con PascalCase
class EmailService {
  // ...
}

// ✅ Bueno: Funciones con camelCase
function sendEmail() {
  // ...
}

// ✅ Bueno: Constantes con UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_PAGE_SIZE = 20;
```

### 2. **Estructura de Archivos**

#### Organización por Capas
```
src/
├── common/           # Componentes comunes
│   ├── logger.js     # Sistema de logging
│   ├── storage.js    # Almacenamiento
│   └── health.js     # Monitoreo de salud
├── services/         # Capa de servicios
│   ├── gmailService.js
│   └── calendarService.js
├── utils/            # Utilidades
│   ├── cache.js
│   └── pagination.js
├── models/           # Modelos de datos
│   ├── Email.js
│   └── Account.js
└── main/             # Capa de aplicación
    └── main.js
```

#### Organización por Funcionalidad
```
src/
├── features/
│   ├── email/
│   │   ├── services/
│   │   ├── models/
│   │   └── utils/
│   └── calendar/
│       ├── services/
│       ├── models/
│       └── utils/
└── shared/
    ├── common/
    ├── utils/
    └── models/
```

### 3. **Comentarios y Documentación**

#### JSDoc Standards
```javascript
/**
 * Fetches emails from Gmail API with caching and pagination
 * @param {string} accountId - The account ID
 * @param {string} [folder='INBOX'] - The folder to fetch emails from
 * @param {number} [pageSize=20] - Number of emails per page
 * @param {Object} [options] - Additional options
 * @param {string} [options.query] - Search query
 * @param {string} [options.orderBy] - Sort order
 * @returns {Promise<Object>} Promise resolving to email data
 * @throws {AppError} When account is not found or API fails
 * @example
 * const emails = await gmailService.fetchEmails('account-123', 'INBOX', 50);
 */
async function fetchEmails(accountId, folder = 'INBOX', pageSize = 20, options = {}) {
  // Implementation
}
```

#### Inline Comments
```javascript
// ✅ Bueno: Comentarios explicativos para lógica compleja
// Calculate exponential backoff delay for retry attempts
// Formula: baseDelay * 2^attempt + randomJitter
const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;

// ❌ Malo: Comentarios obvios
let counter = 0; // Initialize counter to zero

// ✅ Bueno: TODO comments with context
// TODO: Implement rate limiting for API calls
// This should prevent hitting Google API quotas
// Priority: High, Estimated: 2 hours
```

## 🏗️ Arquitectura y Patrones

### 1. **Separation of Concerns**

#### Capa de Servicios
```javascript
// ✅ Bueno: Servicio enfocado en una sola responsabilidad
class GmailService {
  async fetchEmails(accountId, folder, pageSize) {
    // Solo maneja lógica de Gmail
    const cacheKey = this.generateCacheKey(accountId, folder);
    const cached = this.cache.get(cacheKey);
    
    if (cached) return cached;
    
    const emails = await this.apiClient.fetchEmails(accountId, folder, pageSize);
    this.cache.set(cacheKey, emails);
    
    return emails;
  }
}

// ❌ Malo: Servicio con múltiples responsabilidades
class MailService {
  async fetchEmails(accountId, folder, pageSize) {
    // Maneja Gmail + validación + logging + notificaciones
    this.validateAccount(accountId);
    this.logAccess(accountId);
    const emails = await this.gmailClient.fetchEmails(accountId, folder, pageSize);
    await this.sendNotification('emails_fetched', { count: emails.length });
    return emails;
  }
}
```

#### Capa de Utilidades
```javascript
// ✅ Bueno: Utilidades reutilizables y específicas
const ValidationUtils = {
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
};

// ❌ Malo: Utilidades genéricas y poco específicas
const Utils = {
  check(value) {
    return value !== null && value !== undefined;
  },
  
  format(data) {
    return JSON.stringify(data);
  }
};
```

### 2. **Error Handling**

#### Centralized Error Handling
```javascript
// ✅ Bueno: Manejo centralizado de errores
class ErrorHandler {
  async handle(error, context = {}) {
    const appError = this.normalizeError(error);
    await this.logError(appError, context);
    await this.notifyError(appError, context);
    return this.applyRecovery(appError, context);
  }
  
  normalizeError(error) {
    if (error instanceof AppError) return error;
    return AppError.internal(error.message, error);
  }
}

// Uso en servicios
try {
  const result = await someOperation();
  return result;
} catch (error) {
  return await ErrorHandler.handle(error, { operation: 'fetch_emails' });
}
```

#### Specific Error Types
```javascript
// ✅ Bueno: Errores específicos y manejables
try {
  const result = await gmailService.fetchEmails(accountId, folder);
  return result;
} catch (error) {
  if (error.code === 'AUTHENTICATION_ERROR') {
    // Manejar error de autenticación específicamente
    await this.handleAuthError(accountId);
  } else if (error.code === 'NETWORK_ERROR') {
    // Reintentar con backoff
    await this.retryWithBackoff(operation, accountId);
  } else {
    // Error inesperado, lanzar tal cual
    throw error;
  }
}
```

### 3. **Performance Patterns**

#### Lazy Loading
```javascript
// ✅ Bueno: Carga perezosa de recursos pesados
class EmailService {
  #gmailClient = null;
  
  async getGmailClient() {
    if (!this.#gmailClient) {
      this.#gmailClient = await this.createGmailClient();
    }
    return this.#gmailClient;
  }
  
  async fetchEmails(accountId, folder) {
    const client = await this.getGmailClient();
    return await client.fetchEmails(accountId, folder);
  }
}

// ❌ Malo: Carga inmediata de todos los recursos
class EmailService {
  constructor() {
    this.gmailClient = this.createGmailClient(); // Carga innecesaria
    this.calendarClient = this.createCalendarClient(); // Carga innecesaria
  }
}
```

#### Batch Processing
```javascript
// ✅ Bueno: Procesamiento en lotes para operaciones masivas
async function processEmailsBatch(emails, batchSize = 10) {
  const results = [];
  
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(email => processEmail(email))
    );
    results.push(...batchResults);
    
    // Pequeña pausa para no sobrecargar el sistema
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}

// ❌ Malo: Procesamiento secuencial lento
async function processEmailsSequential(emails) {
  const results = [];
  
  for (const email of emails) {
    const result = await processEmail(email);
    results.push(result);
  }
  
  return results;
}
```

## 🔒 Seguridad

### 1. **Input Validation**

#### Comprehensive Validation
```javascript
// ✅ Bueno: Validación completa y segura
class InputValidator {
  static validateEmailPayload(payload) {
    const schema = {
      type: 'object',
      required: ['to', 'subject', 'body'],
      properties: {
        to: {
          type: 'string',
          format: 'email',
          maxLength: 255
        },
        subject: {
          type: 'string',
          maxLength: 500,
          minLength: 1
        },
        body: {
          type: 'string',
          maxLength: 10000
        },
        attachments: {
          type: 'array',
          maxItems: 10,
          items: {
            type: 'object',
            properties: {
              filename: { type: 'string', maxLength: 255 },
              content: { type: 'string' }
            }
          }
        }
      }
    };
    
    return this.validateSchema(payload, schema);
  }
  
  static sanitizeInput(input) {
    // Sanitizar HTML/JS
    return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
  }
}

// Uso
const validation = InputValidator.validateEmailPayload(payload);
if (!validation.isValid) {
  throw AppError.validation('Invalid email payload', validation.errors);
}

const sanitizedPayload = {
  ...payload,
  subject: InputValidator.sanitizeInput(payload.subject),
  body: InputValidator.sanitizeInput(payload.body)
};
```

#### XSS Protection
```javascript
// ✅ Bueno: Protección contra XSS en todas las entradas
function sanitizeUserInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/[<>]/g, '') // Eliminar etiquetas HTML
    .replace(/javascript:/gi, '') // Eliminar javascript:
    .replace(/on\w+=/gi, '') // Eliminar eventos HTML
    .trim();
}

// ❌ Malo: Sin sanitización
function processUserInput(input) {
  return input; // Peligroso!
}
```

### 2. **Data Security**

#### Sensitive Data Handling
```javascript
// ✅ Bueno: Manejo seguro de datos sensibles
class SecureStorage {
  static storeSensitiveData(key, data) {
    // Encriptar datos sensibles
    const encrypted = this.encrypt(JSON.stringify(data));
    localStorage.setItem(key, encrypted);
  }
  
  static retrieveSensitiveData(key) {
    const encrypted = localStorage.getItem(key);
    if (!encrypted) return null;
    
    try {
      const decrypted = this.decrypt(encrypted);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Failed to decrypt data:', error);
      return null;
    }
  }
  
  static encrypt(data) {
    // Implementación de encriptación segura
    return CryptoJS.AES.encrypt(data, this.getEncryptionKey()).toString();
  }
}

// ❌ Malo: Almacenamiento de datos sensibles sin encriptación
function storeUserData(userData) {
  localStorage.setItem('user_data', JSON.stringify(userData)); // Inseguro!
}
```

#### Token Management
```javascript
// ✅ Bueno: Gestión segura de tokens
class TokenManager {
  static async refreshToken(accountId) {
    const account = await this.getAccount(accountId);
    if (!account || !account.tokens) {
      throw AppError.authentication('Account or tokens not found');
    }
    
    try {
      const newTokens = await this.callRefreshEndpoint(account.tokens.refreshToken);
      
      // Validar tokens antes de almacenar
      if (!this.validateTokens(newTokens)) {
        throw AppError.authentication('Invalid tokens received');
      }
      
      await this.storeTokens(accountId, newTokens);
      return newTokens;
      
    } catch (error) {
      await this.handleTokenRefreshError(accountId, error);
      throw AppError.authentication('Token refresh failed', error);
    }
  }
  
  static validateTokens(tokens) {
    return tokens &&
           tokens.access_token &&
           tokens.expires_in &&
           tokens.expires_in > 0;
  }
}
```

## 🧪 Testing

### 1. **Unit Testing**

#### Test Structure
```javascript
// ✅ Bueno: Tests unitarios bien estructurados
describe('GmailService', () => {
  let gmailService;
  let mockApiClient;
  let mockCache;
  
  beforeEach(() => {
    mockApiClient = {
      fetchEmails: jest.fn(),
      sendEmail: jest.fn()
    };
    
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      clear: jest.fn()
    };
    
    gmailService = new GmailService(mockApiClient, mockCache);
  });
  
  describe('fetchEmails', () => {
    it('should return cached emails when available', async () => {
      // Arrange
      const cachedEmails = [{ id: '1', subject: 'Test' }];
      mockCache.get.mockReturnValue(cachedEmails);
      
      // Act
      const result = await gmailService.fetchEmails('account-1', 'INBOX', 10);
      
      // Assert
      expect(result).toEqual(cachedEmails);
      expect(mockApiClient.fetchEmails).not.toHaveBeenCalled();
    });
    
    it('should fetch emails from API when not cached', async () => {
      // Arrange
      const apiEmails = [{ id: '2', subject: 'API Email' }];
      mockCache.get.mockReturnValue(null);
      mockApiClient.fetchEmails.mockResolvedValue(apiEmails);
      
      // Act
      const result = await gmailService.fetchEmails('account-1', 'INBOX', 10);
      
      // Assert
      expect(result).toEqual(apiEmails);
      expect(mockCache.set).toHaveBeenCalledWith(
        expect.any(String),
        apiEmails
      );
    });
    
    it('should handle authentication errors', async () => {
      // Arrange
      mockCache.get.mockReturnValue(null);
      mockApiClient.fetchEmails.mockRejectedValue(
        new AppError('Authentication failed', 'AUTH_ERROR', 401)
      );
      
      // Act & Assert
      await expect(
        gmailService.fetchEmails('account-1', 'INBOX', 10)
      ).rejects.toThrow('Authentication failed');
    });
  });
});
```

#### Mocking Best Practices
```javascript
// ✅ Bueno: Mocks específicos y controlados
const createMockApiClient = () => ({
  fetchEmails: jest.fn().mockResolvedValue([]),
  sendEmail: jest.fn().mockResolvedValue({ id: 'email-123' }),
  getAccountInfo: jest.fn().mockResolvedValue({ email: 'test@example.com' })
});

const createMockCache = () => ({
  get: jest.fn(),
  set: jest.fn(),
  has: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn()
});

// ❌ Malo: Mocks genéricos y poco específicos
const mock = {
  method1: jest.fn(),
  method2: jest.fn(),
  method3: jest.fn()
};
```

### 2. **Integration Testing**

#### Test Environment Setup
```javascript
// ✅ Bueno: Entorno de testing aislado
describe('Email Integration Tests', () => {
  let testDatabase;
  let testServer;
  let testClient;
  
  beforeAll(async () => {
    // Configurar base de datos de testing
    testDatabase = await setupTestDatabase();
    
    // Configurar servidor de testing
    testServer = await setupTestServer({
      database: testDatabase,
      environment: 'test'
    });
    
    // Configurar cliente de testing
    testClient = createTestClient(testServer);
  });
  
  afterAll(async () => {
    // Limpiar recursos
    await testClient.close();
    await testServer.close();
    await testDatabase.drop();
  });
  
  beforeEach(async () => {
    // Limpiar datos entre tests
    await testDatabase.clear();
  });
  
  describe('Email Flow', () => {
    it('should complete full email flow', async () => {
      // Arrange
      const testAccount = await createTestAccount();
      const testEmail = createTestEmail();
      
      // Act
      const sentEmail = await testClient.sendEmail(testAccount.id, testEmail);
      const receivedEmail = await testClient.fetchEmail(testAccount.id, sentEmail.id);
      
      // Assert
      expect(receivedEmail.id).toBe(sentEmail.id);
      expect(receivedEmail.subject).toBe(testEmail.subject);
    });
  });
});
```

#### Test Data Management
```javascript
// ✅ Bueno: Datos de testing gestionados y aislados
class TestDataFactory {
  static createTestAccount(overrides = {}) {
    return {
      id: `test-account-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      email: `test-${Date.now()}@example.com`,
      provider: 'gmail',
      tokens: {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600
      },
      createdAt: new Date().toISOString(),
      ...overrides
    };
  }
  
  static createTestEmail(overrides = {}) {
    return {
      to: 'recipient@example.com',
      subject: 'Test Email',
      body: 'This is a test email',
      attachments: [],
      ...overrides
    };
  }
  
  static async cleanup() {
    // Limpiar datos de testing
    await TestDatabase.clear();
  }
}
```

## 📊 Performance

### 1. **Memory Management**

#### Memory Leaks Prevention
```javascript
// ✅ Bueno: Prevención de memory leaks
class EmailProcessor {
  #eventListeners = new Set();
  #timers = new Set();
  #intervals = new Set();
  
  addEventListener(element, event, handler) {
    element.addEventListener(event, handler);
    this.#eventListeners.add({ element, event, handler });
  }
  
  setInterval(callback, delay) {
    const id = setInterval(callback, delay);
    this.#intervals.add(id);
    return id;
  }
  
  cleanup() {
    // Remover event listeners
    for (const { element, event, handler } of this.#eventListeners) {
      element.removeEventListener(event, handler);
    }
    this.#eventListeners.clear();
    
    // Limpiar timers
    for (const id of this.#timers) {
      clearTimeout(id);
    }
    this.#timers.clear();
    
    // Limpiar intervals
    for (const id of this.#intervals) {
      clearInterval(id);
    }
    this.#intervals.clear();
  }
}

// Uso
const processor = new EmailProcessor();
// ... usar el processor ...
processor.cleanup(); // Limpiar recursos
```

#### Efficient Data Structures
```javascript
// ✅ Bueno: Uso eficiente de estructuras de datos
class EmailCache {
  #cache = new Map();
  #accessOrder = new Set();
  
  set(key, value) {
    this.#cache.set(key, value);
    this.#accessOrder.add(key);
    
    // LRU eviction
    if (this.#cache.size > this.maxSize) {
      const oldestKey = this.#accessOrder.values().next().value;
      this.#cache.delete(oldestKey);
      this.#accessOrder.delete(oldestKey);
    }
  }
  
  get(key) {
    const value = this.#cache.get(key);
    if (value) {
      // Actualizar orden de acceso
      this.#accessOrder.delete(key);
      this.#accessOrder.add(key);
    }
    return value;
  }
}

// ❌ Malo: Uso ineficiente de estructuras de datos
class InefficientCache {
  #cache = [];
  
  set(key, value) {
    this.#cache.push({ key, value, timestamp: Date.now() });
    
    // Búsqueda ineficiente para LRU
    if (this.#cache.length > this.maxSize) {
      const oldest = this.#cache.reduce((oldest, current) => 
        current.timestamp < oldest.timestamp ? current : oldest
      );
      this.#cache = this.#cache.filter(item => item.key !== oldest.key);
    }
  }
}
```

### 2. **Async/Await Patterns**

#### Error Handling in Async
```javascript
// ✅ Bueno: Manejo de errores en operaciones asíncronas
class AsyncOperationManager {
  async executeWithRetry(operation, maxRetries = 3, delay = 1000) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          throw new AppError(
            `Operation failed after ${maxRetries} attempts`,
            'OPERATION_FAILED',
            500,
            { originalError: error }
          );
        }
        
        // Esperar antes del próximo intento
        await this.sleep(delay * Math.pow(2, attempt));
      }
    }
  }
  
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ❌ Malo: Falta de manejo de errores en async
async function badAsyncOperation() {
  const result = await someAsyncOperation(); // ¿Qué pasa si falla?
  return result.data; // ¿Qué pasa si result es null?
}
```

#### Concurrent Operations
```javascript
// ✅ Bueno: Operaciones concurrentes controladas
class ConcurrentProcessor {
  async processBatch(items, concurrency = 5) {
    const results = [];
    const semaphore = new Semaphore(concurrency);
    
    const processItem = async (item) => {
      await semaphore.acquire();
      try {
        const result = await this.processSingleItem(item);
        results.push(result);
      } finally {
        semaphore.release();
      }
    };
    
    await Promise.all(items.map(processItem));
    return results;
  }
  
  async processSingleItem(item) {
    // Procesamiento individual
    return { id: item.id, processed: true };
  }
}

// ❌ Malo: Operaciones concurrentes sin control
async function uncontrolledProcessing(items) {
  // Esto puede sobrecargar el sistema
  const results = await Promise.all(
    items.map(item => this.processSingleItem(item))
  );
  return results;
}
```

## 🔧 Code Quality Tools

### 1. **Linting Configuration**

#### ESLint Rules
```javascript
// .eslintrc.js
module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true
  },
  extends: [
    'eslint:recommended',
    '@eslint/js/recommended'
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module'
  },
  rules: {
    // Mejoras de calidad
    'no-console': 'warn',
    'no-unused-vars': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    
    // Buenas prácticas
    'prefer-arrow-callback': 'error',
    'arrow-spacing': 'error',
    'object-shorthand': 'error',
    
    // Seguridad
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    
    // Performance
    'no-loop-func': 'error',
    'prefer-spread': 'error',
    'prefer-rest-params': 'error'
  }
};
```

#### Prettier Configuration
```javascript
// .prettierrc.js
module.exports = {
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  bracketSpacing: true,
  arrowParens: 'avoid',
  endOfLine: 'lf'
};
```

### 2. **Type Checking**

#### TypeScript Configuration
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2021",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

#### Type Definitions
```typescript
// types/index.ts
export interface Email {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  snippet: string;
  body: string;
  htmlBody: string;
  attachments: Attachment[];
  labels: string[];
}

export interface Account {
  id: string;
  email: string;
  provider: 'gmail' | 'outlook' | 'yahoo';
  tokens: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  };
  createdAt: string;
  lastSync?: string;
  isActive: boolean;
}

export interface AppError {
  name: string;
  code: string;
  message: string;
  statusCode: number;
  details?: any;
  timestamp: string;
  id: string;
}
```

---

**Estas mejores prácticas aseguran un código de alta calidad, mantenible y escalable. Todas las contribuciones al proyecto deben seguir estos estándares para mantener la consistencia y calidad del código.**