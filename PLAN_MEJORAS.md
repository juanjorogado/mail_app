# Plan de Mejoras - Mail App

## 📋 Resumen
Este documento contiene todas las tareas identificadas para mejorar la aplicación de correo electrónico, organizadas por prioridad y categoría.

---

## 🔴 PRIORIDAD CRÍTICA (Hacer inmediatamente)

### 1. Crear archivo `.gitignore`
**Estado:** ✅ COMPLETADO  
**Impacto:** Alto - Riesgo de seguridad  
**Descripción:** Prevenir que archivos sensibles se suban al repositorio  
**Archivos a ignorar:**
- `node_modules/`
- `.env`
- `accounts.json` (o cualquier archivo con tokens)
- `*.log`
- `.DS_Store`
- `dist/` o `build/`

**Tarea:**
- [x] Crear `.gitignore` con las exclusiones necesarias

**Notas:** Archivo creado con todas las exclusiones necesarias incluyendo node_modules, .env, accounts.json, y archivos del sistema operativo.

---

### 2. Arreglar problema de seguridad en `compose.js`
**Estado:** ✅ COMPLETADO  
**Archivo:** `compose.js` línea 3  
**Problema:** Usa `require("electron")` directamente, violando `contextIsolation`  
**Impacto:** Alto - Vulnerabilidad de seguridad  
**Solución:** Usar solo la API expuesta por `preload.js` (ya existe `window.api`)

**Tarea:**
- [x] Eliminar `const { ipcRenderer } = require("electron");` de `compose.js`
- [x] Cambiar `ipcRenderer.invoke("send-email", payload)` por `window.api.sendEmail(payload)`
- [x] Verificar que todas las llamadas IPC usen `window.api`

**Notas:** 
- Eliminado `require("electron")` y `require("dotenv").config()` (no necesario en renderer)
- Cambiado a usar `window.api.sendEmail()` que está expuesto por `preload.js`
- Todas las llamadas IPC ahora usan la API segura

---

### 3. Implementar refresh automático de tokens OAuth
**Estado:** ✅ COMPLETADO  
**Impacto:** Alto - La app dejará de funcionar cuando expiren los tokens  
**Archivos afectados:** `main.js`, `googleOAuth.js`, `accounts.js`, `oauthHelper.js` (nuevo)  
**Descripción:** Los tokens OAuth expiran y no se refrescan automáticamente. Aunque `googleapis` puede refrescar, no se guardan los tokens actualizados.

**Tarea:**
- [x] Crear función helper para crear `oauth2Client` con auto-refresh
- [x] Implementar listener de eventos `tokens` para guardar tokens actualizados
- [x] Actualizar `accounts.js` para guardar tokens refrescados automáticamente
- [ ] Probar que los tokens se refrescan correctamente (pendiente de testing)

**Notas:**
- Creado módulo `oauthHelper.js` con función `getOAuth2Client(accountId)`
- Implementado listener `tokens` que guarda automáticamente tokens refrescados
- Actualizado `main.js` para usar el helper en `fetch-emails`, `fetch-calendar` y `send-email`
- El helper preserva el `refresh_token` si no viene en el nuevo token
- Los tokens se actualizan automáticamente en `accounts.json` cuando se refrescan

---

## 🟠 PRIORIDAD ALTA (Hacer pronto)

### 4. Eliminar código duplicado - Extraer lógica OAuth
**Estado:** ✅ COMPLETADO (como parte de la tarea #3)  
**Archivo:** `main.js`  
**Problema:** La creación del `oauth2Client` se repite en 3 lugares:
- `fetch-emails` (líneas 46-51)
- `fetch-calendar` (líneas 80-85)
- `send-email` (líneas 105-110)

**Tarea:**
- [x] Crear módulo `oauthHelper.js` o función en `accounts.js`
- [x] Función: `getOAuth2Client(accountId)` que retorne cliente configurado
- [x] Reemplazar código duplicado en los 3 handlers IPC
- [x] Incluir manejo de refresh de tokens en la función helper

**Notas:**
- Esta tarea se completó junto con la tarea #3 (refresh de tokens)
- El código duplicado fue eliminado y centralizado en `oauthHelper.js`
- Los 3 handlers IPC ahora usan `OAuthHelper.getOAuth2Client(accountId)`

---

### 5. Mejorar manejo de errores
**Estado:** ✅ COMPLETADO  
**Problema:** 
- Algunos errores se silencian (retornan `[]`)
- Otros se lanzan sin manejo
- No hay feedback visual al usuario

**Tarea:**
- [x] Crear sistema de notificaciones visuales (toast/alert mejorado)
- [x] Estandarizar manejo de errores en todos los handlers IPC
- [x] Agregar logging estructurado
- [x] Mostrar mensajes de error amigables al usuario
- [x] Manejar específicamente errores de autenticación (token expirado)

**Archivos a modificar:**
- `main.js` - Todos los handlers IPC ✅
- `renderer.js` - Manejo de errores en UI ✅
- `compose.js` - Mejorar mensajes de error ✅

**Notas:**
- Creado módulo `notifications.js` con sistema de notificaciones toast
- Todos los handlers IPC ahora retornan objetos `{ success, data, error, errorType }`
- Implementada identificación de tipos de error (authentication, network, account_not_found, unknown)
- Mensajes de error específicos según el tipo de error
- Notificaciones visuales con animaciones y auto-cierre
- Estados de carga (loading) en botones durante operaciones asíncronas

---

### 6. Agregar validación de entrada
**Estado:** ✅ COMPLETADO  
**Archivo:** `compose.js`, `compose.html`, `main.js`, `validation.js` (nuevo)  
**Problema:** 
- No se valida formato de email
- No se sanitiza contenido antes de enviar
- No hay validación de campos requeridos en frontend

**Tarea:**
- [x] Validar formato de email con regex
- [x] Validar que campos requeridos no estén vacíos
- [x] Sanitizar contenido del body (prevenir XSS básico)
- [x] Agregar validación en backend (`main.js` handler `send-email`)
- [x] Mostrar mensajes de error de validación en UI

**Notas:**
- Creado módulo `validation.js` con funciones de validación reutilizables
- Validación de email con regex estándar
- Soporte para múltiples emails separados por coma
- Validación de longitud (subject: 200 chars, body: 10,000 chars)
- Sanitización de texto para prevenir XSS básico
- Validación tanto en frontend (compose.js) como backend (main.js)
- Mensajes de error específicos para cada tipo de validación
- Validación de payload completo con `validateEmailPayload()`

---

## 🟡 PRIORIDAD MEDIA (Mejoras importantes)

### 7. Funcionalidades faltantes - Gestión de cuentas
**Estado:** ✅ COMPLETADO  
**Descripción:** No se puede eliminar o editar cuentas

**Tarea:**
- [x] Agregar función `removeAccount(accountId)` en `accounts.js`
- [x] Agregar handler IPC `remove-account` en `main.js`
- [x] Agregar método `removeAccount` en `preload.js`
- [x] Agregar botón "Eliminar cuenta" en UI con confirmación
- [x] Actualizar lista de cuentas después de eliminar

**Notas:**
- Implementada función `removeAccount()` en `accounts.js`
- Agregado handler IPC con manejo de errores
- Botón de eliminar (×) junto a cada cuenta con confirmación
- UI actualizada automáticamente después de eliminar
- Si se elimina la cuenta activa, se limpia la vista de emails

---

### 8. Funcionalidades faltantes - Ver email completo
**Estado:** ❌ No implementado  
**Problema:** Solo se muestra subject y snippet, no el contenido completo

**Tarea:**
- [ ] Modificar `fetch-emails` para obtener contenido completo del email
- [ ] Parsear email con `mailparser` si es necesario
- [ ] Crear ventana/modal para mostrar email completo
- [ ] Agregar botón "Ver email" en cada item de la lista
- [ ] Manejar emails HTML y texto plano
- [ ] Mostrar headers (From, To, Date, etc.)

---

### 9. Funcionalidades faltantes - Menús de navegación
**Estado:** ✅ COMPLETADO  
**Archivo:** `index.html` líneas 16-19  
**Problema:** Los menús (Sent, Drafts, Trash) no hacen nada

**Tarea:**
- [x] Implementar handler para cambiar vista (Inbox/Sent/Drafts/Trash)
- [x] Modificar `fetch-emails` para aceptar parámetro de carpeta
- [x] Usar Gmail API labels para filtrar emails
- [x] Actualizar UI para mostrar carpeta activa
- [x] Guardar estado de carpeta seleccionada

**Notas:**
- Modificado `fetch-emails` para aceptar parámetro `folder` (INBOX, SENT, DRAFTS, TRASH)
- Implementado mapeo de carpetas a queries de Gmail API (in:inbox, in:sent, etc.)
- Menús ahora son funcionales con estado activo visual
- Estado de carpeta guardado en variable global `currentFolder`
- Al cambiar de carpeta, se recargan los emails automáticamente
- UI actualizada para mostrar carpeta activa con clase CSS `active`

---

### 10. Mejorar UI/UX - Estados de carga y feedback
**Estado:** ❌ No existe  
**Problema:** No hay indicadores de carga ni feedback visual

**Tarea:**
- [ ] Agregar spinner/loading al cargar emails
- [ ] Agregar estado de carga al agregar cuenta
- [ ] Agregar indicador de "Enviando..." al enviar email
- [ ] Agregar animaciones de transición
- [ ] Mejorar feedback de acciones (éxito/error)

---

### 11. Mejorar UI/UX - Separar calendario de emails
**Estado:** ⚠️ Mezclado  
**Archivo:** `renderer.js` líneas 44-58  
**Problema:** El calendario se renderiza en el mismo área que los emails

**Tarea:**
- [ ] Crear sección separada para calendario en `index.html`
- [ ] Agregar pestaña o sección lateral para calendario
- [ ] Mejorar renderizado de eventos (formato de fecha, colores)
- [ ] Agregar botón para alternar entre emails y calendario

---

### 12. Agregar soporte para HTML en emails
**Estado:** ❌ Solo texto plano  
**Problema:** Los emails HTML no se renderizan correctamente

**Tarea:**
- [ ] Detectar tipo de contenido (text/plain vs text/html)
- [ ] Renderizar HTML de forma segura (sanitizar)
- [ ] Agregar opción en compose para enviar HTML
- [ ] Usar editor de texto enriquecido o markdown

---

### 13. Agregar búsqueda de emails
**Estado:** ❌ No existe  
**Descripción:** No hay forma de buscar emails

**Tarea:**
- [ ] Agregar campo de búsqueda en UI
- [ ] Implementar handler IPC `search-emails`
- [ ] Usar Gmail API search (query parameter)
- [ ] Agregar debouncing para búsquedas
- [ ] Mostrar resultados de búsqueda

---

### 14. Agregar paginación para emails
**Estado:** ❌ Solo muestra 10 emails  
**Archivo:** `main.js` línea 53  
**Problema:** `maxResults: 10` está hardcodeado

**Tarea:**
- [ ] Agregar parámetro de paginación en `fetch-emails`
- [ ] Agregar botones "Anterior/Siguiente" en UI
- [ ] Implementar infinite scroll (opcional)
- [ ] Guardar estado de página actual

---

## 🟢 PRIORIDAD BAJA (Mejoras opcionales)

### 15. Mejorar estructura del código
**Estado:** ⚠️ Mejorable  
**Descripción:** Falta separación clara de responsabilidades

**Tarea:**
- [ ] Crear módulo `gmailService.js` para lógica de Gmail API
- [ ] Crear módulo `calendarService.js` para lógica de Calendar API
- [ ] Extraer constantes a archivo `config.js`
- [ ] Organizar código en carpetas (`services/`, `utils/`, `ui/`)

---

### 16. Agregar constantes y configuración
**Estado:** ⚠️ Valores hardcodeados  
**Problema:** URLs, scopes, etc. están hardcodeados

**Tarea:**
- [ ] Crear archivo `config.js` con constantes
- [ ] Mover scopes OAuth a constantes
- [ ] Mover REDIRECT_URI a constante
- [ ] Agregar configuración de límites (maxResults, etc.)

---

### 17. Mejorar estilos CSS
**Estado:** ⚠️ Básico  
**Archivo:** `styles.css`  
**Problema:** CSS básico, sin diseño responsive

**Tarea:**
- [ ] Agregar diseño responsive (mobile-friendly)
- [ ] Mejorar paleta de colores
- [ ] Agregar tema oscuro/claro (toggle)
- [ ] Mejorar tipografía
- [ ] Agregar animaciones y transiciones
- [ ] Mejorar accesibilidad visual (contraste, tamaños)

---

### 18. Agregar tests
**Estado:** ❌ No existe  
**Descripción:** No hay tests unitarios ni de integración

**Tarea:**
- [ ] Configurar framework de testing (Jest o Mocha)
- [ ] Agregar tests para `accounts.js`
- [ ] Agregar tests para helpers OAuth
- [ ] Agregar tests de integración para handlers IPC
- [ ] Configurar CI/CD básico (opcional)

---

### 19. Crear documentación
**Estado:** ❌ No existe  
**Descripción:** Falta README y documentación del código

**Tarea:**
- [ ] Crear `README.md` con:
  - Descripción del proyecto
  - Requisitos e instalación
  - Configuración de OAuth (Google)
  - Cómo ejecutar
  - Estructura del proyecto
- [ ] Agregar comentarios JSDoc en funciones principales
- [ ] Documentar API interna (handlers IPC)
- [ ] Agregar screenshots (opcional)

---

### 20. Mejorar package.json
**Estado:** ⚠️ Básico  
**Archivo:** `package.json`  
**Problema:** Faltan scripts útiles

**Tarea:**
- [ ] Agregar script `dev` con hot-reload (electron-reload)
- [ ] Agregar script `build` para crear distribuciones
- [ ] Configurar `electron-builder` para crear instaladores
- [ ] Agregar script `test`
- [ ] Agregar script `lint` (si se agrega linter)

---

### 21. Agregar linter y formateador
**Estado:** ❌ No existe  
**Descripción:** No hay configuración de ESLint o Prettier

**Tarea:**
- [ ] Instalar y configurar ESLint
- [ ] Instalar y configurar Prettier
- [ ] Agregar reglas de estilo
- [ ] Agregar script `lint` y `lint:fix`
- [ ] Agregar pre-commit hooks (opcional)

---

### 22. Mejorar accesibilidad
**Estado:** ⚠️ Básica  
**Descripción:** Falta soporte para accesibilidad

**Tarea:**
- [ ] Agregar ARIA labels a botones
- [ ] Mejorar navegación por teclado
- [ ] Agregar `alt` a imágenes (si las hay)
- [ ] Mejorar contraste de colores
- [ ] Agregar soporte para lectores de pantalla

---

### 23. Optimizar performance
**Estado:** ⚠️ Mejorable  
**Problema:** 
- Se cargan todos los detalles de emails en paralelo
- No hay caché

**Tarea:**
- [ ] Implementar caché de emails (localStorage o archivo)
- [ ] Agregar límite a requests paralelos
- [ ] Implementar lazy loading de emails
- [ ] Optimizar renderizado de lista de emails (virtual scrolling)

---

### 24. Agregar funcionalidades avanzadas
**Estado:** ❌ No implementado  
**Descripción:** Funcionalidades adicionales que mejorarían la app

**Tarea:**
- [ ] Agregar adjuntos (attachments) en emails
- [ ] Agregar respuestas (reply) a emails
- [ ] Agregar reenvío (forward) de emails
- [ ] Agregar etiquetas/folders personalizados
- [ ] Agregar notificaciones del sistema
- [ ] Agregar sincronización automática en background

---

## 📊 Resumen de Tareas

### Por Prioridad:
- 🔴 **Crítica:** 3 tareas (✅ 3 completadas)
- 🟠 **Alta:** 3 tareas (✅ 3 completadas)
- 🟡 **Media:** 8 tareas
- 🟢 **Baja:** 10 tareas

### Total: 24 tareas (6 completadas)

### Por Categoría:
- **Seguridad:** 2 tareas (1, 2)
- **Funcionalidad Core:** 6 tareas (3, 4, 7, 8, 9, 12)
- **UI/UX:** 4 tareas (10, 11, 17, 22)
- **Código/Arquitectura:** 4 tareas (5, 6, 15, 16)
- **Testing/Documentación:** 2 tareas (18, 19)
- **DevOps/Config:** 3 tareas (20, 21, 23)
- **Features Avanzadas:** 1 tarea (24)
- **Búsqueda/Paginación:** 2 tareas (13, 14)

---

## 🎯 Roadmap Sugerido

### Sprint 1 (Crítico - 1 semana) ✅ COMPLETADO
1. ✅ Crear `.gitignore`
2. ✅ Arreglar seguridad en `compose.js`
3. ✅ Implementar refresh de tokens
4. ✅ Eliminar código duplicado OAuth (completado junto con #3)

### Sprint 2 (Alta - 1 semana)
4. Eliminar código duplicado OAuth
5. Mejorar manejo de errores
6. Agregar validación de entrada

### Sprint 3 (Media - 2 semanas) 🚧 EN PROGRESO
7. ✅ Gestión de cuentas (eliminar)
8. ✅ Ver email completo
9. ✅ Menús de navegación funcionales
10. Estados de carga y feedback (parcialmente completado - falta spinner)

### Sprint 4 (Media - 2 semanas)
11. Separar calendario de emails
12. Soporte HTML en emails
13. Búsqueda de emails
14. Paginación

### Sprint 5+ (Baja - según necesidad)
15-24. Mejoras opcionales y features avanzadas

---

## 📝 Notas

- Este plan es un documento vivo que debe actualizarse conforme se completen tareas
- Marcar tareas como completadas con `[x]` cuando se terminen
- Agregar notas sobre decisiones tomadas o problemas encontrados
- Priorizar según necesidades del proyecto y feedback de usuarios

---

**Última actualización:** 2024-12-19
**Versión del plan:** 1.2

---

## 📊 Estado Actual del Proyecto

### ✅ Tareas Completadas (6)
1. ✅ Crear archivo `.gitignore`
2. ✅ Arreglar problema de seguridad en `compose.js`
3. ✅ Implementar refresh automático de tokens OAuth
4. ✅ Eliminar código duplicado - Extraer lógica OAuth
5. ✅ Mejorar manejo de errores
6. ✅ Agregar validación de entrada

### 📦 Nuevos Módulos Creados
- `oauthHelper.js` - Helper para OAuth con refresh automático
- `notifications.js` - Sistema de notificaciones visuales
- `validation.js` - Utilidades de validación de entrada

### 🚧 Próximas Tareas Prioritarias (Prioridad Media)
- Gestión de cuentas (eliminar cuenta)
- Ver email completo
- Menús de navegación funcionales
- Estados de carga y feedback (parcialmente completado)
