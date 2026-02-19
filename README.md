# Mail App - Gmail Desktop Client

Aplicación de escritorio para gestionar correos de Gmail desarrollada con Electron.

## 🚀 Características

- **Gestión de cuentas Gmail**: Conexión segura mediante OAuth 2.0
- **Bandeja de entrada**: Visualización de correos con paginación
- **Operaciones**: Leer, responder, reenviar y eliminar correos
- **Búsqueda**: Búsqueda de correos por texto
- **Tema oscuro**: Soporte para modo claro y oscuro
- **Caché inteligente**: Almacenamiento temporal de correos para mejor performance

## 📁 Estructura del Proyecto

```
src/
├── main/                 # Proceso principal de Electron
│   ├── main.js          # Punto de entrada y manejo de IPC
│   └── preload.js       # Bridge seguro entre main y renderer
├── renderer/            # Interfaz de usuario
│   ├── index.html       # Pantalla principal
│   ├── compose.html     # Ventana de composición
│   ├── script.js        # Lógica de UI
│   ├── compose.js       # Lógica de composición
│   ├── styles.css       # Estilos
│   ├── notifications.js # Sistema de notificaciones
│   └── validation.js    # Validación de formularios
├── services/            # Lógica de negocio
│   ├── gmailService.js  # Integración con Gmail API
│   ├── calendarService.js # Integración con Calendar API
│   └── index.js         # Exportación de servicios
├── api/                 # APIs externas
│   ├── googleOAuth.js   # Autenticación OAuth
│   └── penpotService.js # Integración Penpot (opcional)
├── common/              # Utilidades compartidas
│   ├── logger.js        # Sistema de logging
│   ├── accounts.js      # Gestión de cuentas
│   ├── oauthHelper.js   # Helpers de OAuth
│   ├── storage.js       # Almacenamiento encriptado
│   ├── validation.js    # Validación de inputs
│   ├── config.js        # Configuración
│   └── health.js        # Monitoreo de salud
├── utils/               # Utilidades
│   ├── cache.js         # Sistema de caché con TTL
│   └── pagination.js    # Paginación inteligente
├── events/              # Eventos
│   ├── EventBus.js      # Bus de eventos
│   ├── notifications.js # Notificaciones
│   └── index.js         # Exportación
└── config/              # Configuración
    └── constants.js     # Constantes de la aplicación
```

## 🛠️ Instalación

1. **Clonar el repositorio**

   ```bash
   git clone <repository-url>
   cd mail_app
   ```

2. **Instalar dependencias**

   ```bash
   npm install
   ```

3. **Configurar variables de entorno**

   ```bash
   cp .env.example .env
   ```

   Editar `.env` con tus credenciales:

   ```
   GOOGLE_CLIENT_ID=tu-client-id
   GOOGLE_CLIENT_SECRET=tu-client-secret
   APP_SECRET=$(openssl rand -hex 32)
   ```

4. **Iniciar la aplicación**
   ```bash
   npm start
   ```

## 🔐 Seguridad

- **Encriptación AES-256-GCM** para tokens OAuth
- **Almacenamiento seguro** de credenciales
- **Validación XSS** en todas las entradas
- **Sanitización** de contenido HTML
- Ver [SECURITY.md](SECURITY.md) para más detalles

## 📝 Scripts Disponibles

- `npm start` - Iniciar aplicación en modo desarrollo
- `npm test` - Ejecutar pruebas
- `npm run build` - Compilar para producción

## 🐛 Solución de Problemas

### Error: Cannot find module

Verificar que todas las dependencias estén instaladas:

```bash
npm install
```

### Error: GOOGLE_CLIENT_ID no configurado

Crear archivo `.env` con las credenciales de Google OAuth.

### Error de autenticación

Revocar el token anterior en [Google Account Settings](https://myaccount.google.com/permissions) y volver a conectar.

## 📄 Licencia

MIT License - ver LICENSE para detalles

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor, abrir un issue o pull request.

---

**Versión**: 1.0.0  
**Autor**: Juanjo  
**Última actualización**: Febrero 2026
