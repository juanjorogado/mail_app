# API Reference - Mail App

## 📚 Índice

- [Common Layer APIs](#common-layer-apis)
  - [Logger API](#logger-api)
  - [Storage API](#storage-api)
  - [Health Monitor API](#health-monitor-api)
  - [OAuth Helper API](#oauth-helper-api)
  - [Notifications API](#notifications-api)
- [Service Layer APIs](#service-layer-apis)
  - [Gmail Service API](#gmail-service-api)
  - [Calendar Service API](#calendar-service-api)
- [Util Layer APIs](#util-layer-apis)
  - [Cache API](#cache-api)
  - [Pagination API](#pagination-api)
  - [Performance Monitor API](#performance-monitor-api)
- [Model Layer APIs](#model-layer-apis)
  - [Email Model API](#email-model-api)
  - [Account Model API](#account-model-api)
- [Event Layer APIs](#event-layer-apis)
  - [Event Bus API](#event-bus-api)
- [Error Layer APIs](#error-layer-apis)
  - [AppError API](#apperror-api)
  - [Error Handler API](#error-handler-api)
- [Testing Layer APIs](#testing-layer-apis)
  - [Unit Tester API](#unit-tester-api)
  - [Integration Tester API](#integration-tester-api)

---

## Common Layer APIs

### Logger API

Sistema de logging estructurado con múltiples niveles y categorías.

#### Métodos Disponibles

```javascript
const { loggers } = require('../common/logger');

// Logging general
loggers.app.info(message, data);
loggers.app.warn(message, data);
loggers.app.error(message, data);
loggers.app.debug(message, data);

// Logging de cuentas
loggers.accounts.created(accountId, data);
loggers.accounts.updated(accountId, data);
loggers.accounts.removed(accountId, data);
loggers.accounts.error(operation, error, data);

// Logging de OAuth
loggers.oauth.token_renewed(accountId, data);
loggers.oauth.token_expired(accountId, data);
loggers.oauth.error(operation, error, data);

// Logging de seguridad
loggers.security.login_attempt(email, success, data);
loggers.security.token_validation(accountId, valid, data);
loggers.security.validation_error(field, value, error);

// Logging de APIs
loggers.api.request(method, endpoint, data);
loggers.api.response(method, endpoint, statusCode, data);
loggers.api.error(method, endpoint, error, data);

// Logging de notificaciones
loggers.notifications.sent(title, priority, data);
loggers.notifications.error(operation, error, data);
loggers.notifications.channel_added(name, type);
loggers.notifications.channel_removed(name);

// Logging de performance
loggers.performance.start(operation, data);
loggers.performance.end(operation, duration, data);
loggers.performance.metric(name, value, data);
loggers.performance.memory_leak(leakData);
loggers.performance.degradation_detected(operation, data);

// Logging de errores
loggers.errors.error(operation, error, data);
loggers.errors.policy_added(errorCode, policy);
loggers.errors.handler_added(errorCode);
loggers.errors.retry_attempt(errorCode, attempt, delay);
loggers.errors.retry_success(errorCode, attempt);
loggers.errors.retry_failed(errorCode, attempt, error);
```

#### Ejemplos de Uso

```javascript
// Logging básico
loggers.app.info('Application started', { version: '1.0.0' });

// Logging con datos estructurados
loggers.accounts.created('account-123', { 
  email: 'user@example.com', 
  provider: 'gmail' 
});

// Logging de errores
loggers.api.error('GET', '/api/emails', new Error('Network error'), {
  accountId: 'account-123'
});
```

---

### Storage API

Sistema de almacenamiento persistente con encriptación y validación.

#### Métodos Disponibles

```javascript
const Storage = require('../common/storage');

// Operaciones básicas
Storage.setItem(key, value);
Storage.getItem(key);
Storage.removeItem(key);
Storage.clear();

// Operaciones con encriptación
Storage.setEncryptedItem(key, value);
Storage.getEncryptedItem(key);
Storage.removeEncryptedItem(key);

// Operaciones con validación
Storage.setValidatedItem(key, value, schema);
Storage.getValidatedItem(key, schema);

// Operaciones bulk
Storage.setMultiple(items);
Storage.getMultiple(keys);
Storage.removeMultiple(keys);

// Operaciones de backup
Storage.createBackup();
Storage.restoreBackup(backupPath);
Storage.listBackups();
Storage.deleteBackup(backupPath);

// Operaciones de migración
Storage.migrateData(oldVersion, newVersion);
Storage.getMigrationStatus();
Storage.rollbackMigration(version);

// Operaciones de monitoreo
Storage.getStats();
Storage.getHealthStatus();
Storage.getBackupStatus();
```

#### Ejemplos de Uso

```javascript
// Almacenamiento básico
Storage.setItem('user-preferences', { theme: 'dark', language: 'es' });

// Almacenamiento encriptado
Storage.setEncryptedItem('user-tokens', { 
  accessToken: 'secret-token',
  refreshToken: 'secret-refresh-token'
});

// Almacenamiento con validación
const schema = {
  type: 'object',
  properties: {
    email: { type: 'string', format: 'email' },
    name: { type: 'string' }
  }
};
Storage.setValidatedItem('user-profile', userData, schema);
```

---

### Health Monitor API

Sistema de monitoreo de salud del sistema en tiempo real.

#### Métodos Disponibles

```javascript
const HealthMonitor = require('../common/health');

// Iniciar/parar monitoreo
HealthMonitor.startMonitoring();
HealthMonitor.stopMonitoring();

// Obtener estado del sistema
HealthMonitor.getStatus();
HealthMonitor.getSystemHealth();
HealthMonitor.getMemoryHealth();
HealthMonitor.getPerformanceHealth();

// Obtener métricas
HealthMonitor.getMetrics();
HealthMonitor.getMemoryMetrics();
HealthMonitor.getPerformanceMetrics();
HealthMonitor.getApiMetrics();

// Configurar umbrales
HealthMonitor.setThresholds(thresholds);
HealthMonitor.getThresholds();

// Alertas y notificaciones
HealthMonitor.enableAlerts();
HealthMonitor.disableAlerts();
HealthMonitor.getAlerts();
HealthMonitor.clearAlerts();

// Reportes
HealthMonitor.generateReport();
HealthMonitor.exportMetrics(format);
HealthMonitor.getUptime();
```

#### Ejemplos de Uso

```javascript
// Iniciar monitoreo
HealthMonitor.startMonitoring();

// Configurar umbrales
HealthMonitor.setThresholds({
  memory: { maxUsage: 80, maxLeakRate: 10 },
  performance: { maxResponseTime: 5000, minSuccessRate: 95 },
  apis: { maxErrorRate: 5, maxTimeoutRate: 2 }
});

// Obtener estado
const status = HealthMonitor.getStatus();
console.log('System health:', status.overall);
```

---

### OAuth Helper API

Gestión avanzada de tokens OAuth con renovación automática.

#### Métodos Disponibles

```javascript
const OAuthHelper = require('../common/oauthHelper');

// Gestión de tokens
OAuthHelper.getOAuth2Client(accountId);
OAuthHelper.refreshToken(accountId);
OAuthHelper.revokeToken(accountId);
OAuthHelper.validateToken(accountId);

// Gestión de cuentas
OAuthHelper.addAccount(accountData);
OAuthHelper.removeAccount(accountId);
OAuthHelper.getAccount(accountId);
OAuthHelper.listAccounts();

// Validación y seguridad
OAuthHelper.validateCredentials(credentials);
OAuthHelper.isTokenValid(accountId);
OAuthHelper.getTokenExpiration(accountId);
OAuthHelper.getTokenStatus(accountId);

// Operaciones avanzadas
OAuthHelper.migrateTokens(oldVersion, newVersion);
OAuthHelper.backupTokens();
OAuthHelper.restoreTokens(backupData);
OAuthHelper.encryptTokenData(tokenData);
OAuthHelper.decryptTokenData(encryptedData);
```

#### Ejemplos de Uso

```javascript
// Obtener cliente OAuth
const oauth2Client = await OAuthHelper.getOAuth2Client('account-123');

// Renovar token
const newTokens = await OAuthHelper.refreshToken('account-123');

// Validar token
const isValid = await OAuthHelper.isTokenValid('account-123');
```

---

### Notifications API

Sistema de notificaciones con múltiples canales y prioridades.

#### Métodos Disponibles

```javascript
const NotificationManager = require('../events/notifications');

// Envío de notificaciones
NotificationManager.send(notification, data, context);
NotificationManager.sendTemplate(templateName, data, context);

// Gestión de canales
NotificationManager.addChannel(name, config);
NotificationManager.removeChannel(name);
NotificationManager.getChannel(name);
NotificationManager.enableChannel(name);
NotificationManager.disableChannel(name);

// Gestión de plantillas
NotificationManager.addTemplate(name, template);
NotificationManager.removeTemplate(name);
NotificationManager.getTemplate(name);

// Gestión de reglas
NotificationManager.addRule(rule);
NotificationManager.removeRule(ruleId);
NotificationManager.getRules();

// Estadísticas y monitoreo
NotificationManager.getStats();
NotificationManager.getNotificationsByType(type, limit);
NotificationManager.getNotificationsByPriority(priority, limit);
NotificationManager.markAsRead(notificationId);
NotificationManager.clearHistory(keep);

// Operaciones avanzadas
NotificationManager.createApiEvent(type, action, data, api);
NotificationManager.createUserEvent(type, action, data, user);
NotificationManager.createSystemEvent(type, action, data);
```

#### Ejemplos de Uso

```javascript
// Enviar notificación
await NotificationManager.send('email_sent', {
  to: 'recipient@example.com',
  subject: 'Test Email'
}, {
  source: 'gmail_service'
});

// Enviar con plantilla
await NotificationManager.sendTemplate('account_added', {
  email: 'user@example.com'
});
```

---

## Service Layer APIs

### Gmail Service API

Servicios avanzados para Gmail con caché, paginación y manejo de errores.

#### Métodos Disponibles

```javascript
const { gmailService } = require('../services');

// Operaciones de emails
gmailService.fetchEmails(accountId, folder, pageSize);
gmailService.fetchEmailDetails(accountId, emailId);
gmailService.sendEmail(accountId, payload);
gmailService.searchEmails(accountId, query, options);
gmailService.batchSendEmails(accountId, emails);
gmailService.deleteEmail(accountId, emailId);
gmailService.markAsRead(accountId, emailId);
gmailService.markAsUnread(accountId, emailId);
gmailService.moveEmail(accountId, emailId, folder);

// Operaciones de cuentas
gmailService.getAccountInfo(accountId);
gmailService.getAccountStats(accountId);
gmailService.getAccountFolders(accountId);
gmailService.getAccountLabels(accountId);

// Operaciones avanzadas
gmailService.getThreadDetails(accountId, threadId);
gmailService.searchAdvanced(accountId, filters);
gmailService.getAttachments(accountId, emailId);
gmailService.createDraft(accountId, draftData);
gmailService.sendDraft(accountId, draftId);

// Operaciones de administración
gmailService.clearCache(accountId);
gmailService.getCacheStats(accountId);
gmailService.getPerformanceMetrics(accountId);
gmailService.getLastError(accountId);
```

#### Ejemplos de Uso

```javascript
// Obtener emails
const emails = await gmailService.fetchEmails('account-123', 'INBOX', 50);

// Enviar email
const result = await gmailService.sendEmail('account-123', {
  to: 'recipient@example.com',
  subject: 'Test',
  body: 'Hello world'
});

// Buscar emails
const searchResult = await gmailService.searchEmails('account-123', 'from:sender@example.com', {
  pageSize: 20,
  orderBy: 'date'
});
```

---

### Calendar Service API

Servicios avanzados para Google Calendar con gestión de eventos y calendarios.

#### Métodos Disponibles

```javascript
const { calendarService } = require('../services');

// Operaciones de eventos
calendarService.getEvents(accountId, calendarId, timeMin, timeMax, options);
calendarService.getEvent(accountId, calendarId, eventId);
calendarService.createEvent(accountId, calendarId, eventData);
calendarService.updateEvent(accountId, calendarId, eventId, eventData);
calendarService.deleteEvent(accountId, calendarId, eventId);
calendarService.moveEvent(accountId, calendarId, eventId, newCalendarId);

// Operaciones de calendarios
calendarService.getCalendars(accountId);
calendarService.getCalendar(accountId, calendarId);
calendarService.createCalendar(accountId, calendarData);
calendarService.updateCalendar(accountId, calendarId, calendarData);
calendarService.deleteCalendar(accountId, calendarId);

// Operaciones avanzadas
calendarService.searchEvents(accountId, query, options);
calendarService.getAvailability(accountId, timeMin, timeMax, attendees);
calendarService.createRecurringEvent(accountId, calendarId, eventData);
calendarService.getEventInstances(accountId, calendarId, eventId, timeMin, timeMax);
calendarService.importEvent(accountId, calendarId, eventData);

// Operaciones de administración
calendarService.clearCache(accountId);
calendarService.getCacheStats(accountId);
calendarService.getPerformanceMetrics(accountId);
calendarService.getLastError(accountId);
```

#### Ejemplos de Uso

```javascript
// Obtener eventos
const events = await calendarService.getEvents('account-123', 'primary', 
  new Date(), new Date(Date.now() + 86400000));

// Crear evento
const event = await calendarService.createEvent('account-123', 'primary', {
  summary: 'Meeting',
  description: 'Team meeting',
  start: { dateTime: '2023-12-01T10:00:00' },
  end: { dateTime: '2023-12-01T11:00:00' }
});

// Buscar eventos
const searchResult = await calendarService.searchEvents('account-123', 'meeting', {
  timeMin: new Date(),
  maxResults: 10
});
```

---

## Util Layer APIs

### Cache API

Sistema de caché avanzado con TTL, LRU eviction y compresión.

#### Métodos Disponibles

```javascript
const { cache } = require('../utils');

// Operaciones básicas
cache.set(key, value, ttl);
cache.get(key);
cache.has(key);
cache.delete(key);
cache.clear();

// Operaciones avanzadas
cache.setWithCompression(key, value, ttl);
cache.getWithDecompression(key);
cache.setBatch(items, ttl);
cache.getBatch(keys);
cache.deleteBatch(keys);

// Operaciones de gestión
cache.getStats();
cache.getSize();
cache.getMaxSize();
cache.getHitRate();
cache.getMissRate();
cache.getKeys();
cache.getValues();

// Operaciones de persistencia
cache.saveToFile(filePath);
cache.loadFromFile(filePath);
cache.exportData();
cache.importData(data);

// Operaciones de monitoreo
cache.getPerformanceMetrics();
cache.getMemoryUsage();
cache.getEvictionStats();
cache.getCompressionStats();
```

#### Ejemplos de Uso

```javascript
// Almacenar en caché
cache.set('user-profile-123', userProfile, 300000); // 5 minutos

// Obtener del caché
const profile = cache.get('user-profile-123');

// Almacenar con compresión
cache.setWithCompression('large-data-123', largeData, 600000); // 10 minutos

// Operaciones batch
const items = {
  'key1': 'value1',
  'key2': 'value2',
  'key3': 'value3'
};
cache.setBatch(items, 300000);
```

---

### Pagination API

Sistema de paginación inteligente con múltiples estrategias.

#### Métodos Disponibles

```javascript
const { pagination } = require('../utils');

// Creación de paginadores
pagination.createOffsetPaginator(totalItems, pageSize, currentPage);
pagination.createCursorPaginator(data, pageSize, cursor);
pagination.createInfinitePaginator(data, pageSize, prefetchSize);

// Operaciones de paginación
pagination.getPage(data, page, pageSize);
pagination.getNextPage(data, currentPage, pageSize);
pagination.getPreviousPage(data, currentPage, pageSize);
pagination.getFirstPage(data, pageSize);
pagination.getLastPage(data, pageSize);

// Operaciones avanzadas
pagination.getRange(data, start, end);
pagination.searchAndPaginate(data, query, page, pageSize);
pagination.filterAndPaginate(data, filters, page, pageSize);
pagination.sortAndPaginate(data, sortBy, order, page, pageSize);

// Estrategias de paginación
pagination.getStrategy(name);
pagination.registerStrategy(name, strategy);
pagination.analyzeData(data);
pagination.selectStrategy(data, options);

// Operaciones de gestión
pagination.getStats();
pagination.getPerformanceMetrics();
pagination.getMemoryUsage();
pagination.getCacheStats();
```

#### Ejemplos de Uso

```javascript
// Crear paginador offset
const paginator = pagination.createOffsetPaginator(1000, 20, 1);

// Obtener página
const pageData = pagination.getPage(emails, 1, 20);

// Crear paginador por cursor
const cursorPaginator = pagination.createCursorPaginator(emails, 50, 'cursor-123');

// Buscar y paginar
const searchResult = pagination.searchAndPaginate(emails, 'important', 1, 20);
```

---

### Performance Monitor API

Sistema de monitoreo de performance con detección de memory leaks.

#### Métodos Disponibles

```javascript
const PerformanceMonitor = require('../utils/performance');

// Medición de performance
PerformanceMonitor.measure(name, fn, context);
PerformanceMonitor.startProfile(name);
PerformanceMonitor.recordOperation(profileName, operation, data);
PerformanceMonitor.endProfile(name);

// Monitoreo de memoria
PerformanceMonitor.takeMemorySnapshot();
PerformanceMonitor.getMemoryUsage();
PerformanceMonitor.detectMemoryLeaks();
PerformanceMonitor.optimizeMemory();

// Métricas y estadísticas
PerformanceMonitor.getStats();
PerformanceMonitor.getMetrics(name, limit);
PerformanceMonitor.getProfile(name);
PerformanceMonitor.getMemorySnapshots(limit);

// Gestión de datos
PerformanceMonitor.clearData(type);
PerformanceMonitor.generateReport();
PerformanceMonitor.exportMetrics(format);

// Alertas y notificaciones
PerformanceMonitor.enableAlerts();
PerformanceMonitor.disableAlerts();
PerformanceMonitor.getAlerts();
PerformanceMonitor.clearAlerts();
```

#### Ejemplos de Uso

```javascript
// Medir performance
const result = await PerformanceMonitor.measure('fetch_emails', async () => {
  return await gmailService.fetchEmails(accountId, 'INBOX');
});

// Crear perfil
const profile = PerformanceMonitor.startProfile('email_processing');
// ... operaciones ...
PerformanceMonitor.recordOperation('email_processing', 'fetch', { count: 100 });
const result = PerformanceMonitor.endProfile('email_processing');

// Monitorear memoria
PerformanceMonitor.takeMemorySnapshot();
PerformanceMonitor.optimizeMemory();
```

---

## Model Layer APIs

### Email Model API

Modelo de datos para emails con validación y transformación.

#### Métodos Disponibles

```javascript
const Email = require('../models/Email');

// Creación y validación
Email.create(data);
Email.validate(data);
Email.sanitize