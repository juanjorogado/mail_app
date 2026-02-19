# Templates HTML

Esta carpeta contiene templates HTML modulares para la aplicación de correo.

## 📁 **Estructura de Templates**

```
templates/
├── onboarding.html      # Pantalla de bienvenida
├── main-app.html        # Pantalla principal completa
├── message-detail.html   # Detalles de mensaje
├── message-list.html    # Lista de mensajes
├── mailbox-item.html     # Item individual de buzón
└── message-item.html     # Item individual de mensaje
```

## 🎯 **Uso de Templates**

### **Templates Completos:**
- **`onboarding.html`** - Pantalla inicial con botón de conexión
- **`main-app.html`** - Estructura completa de la app principal
- **`message-detail.html`** - Componente de detalles de mensaje
- **`message-list.html`** - Contenedor para lista de mensajes

### **Templates de Componentes:**
- **`mailbox-item.html`** - Template para items de buzón con placeholders
- **`message-item.html`** - Template para items de mensaje con placeholders

## 🔧 **Placeholders**

Los templates de componentes usan placeholders con doble llave:
- `{{mailboxType}}` - Tipo de buzón (all, unread, today, flagged)
- `{{label}}` - Etiqueta del buzón
- `{{count}}` - Contador de mensajes
- `{{id}}` - ID del mensaje
- `{{from}}` - Remitente
- `{{date}}` - Fecha
- `{{subject}}` - Asunto
- `{{snippet}}` - Fragmento del mensaje

## 📋 **Integración con Componentes**

Estos templates están diseñados para ser usados con los componentes modulares:

```javascript
import { OnboardingScreen } from '../components/screens/OnboardingScreen.js';
import { MainAppScreen } from '../components/screens/MainAppScreen.js';
```

## 🎨 **Estilos CSS**

Los templates utilizan las clases CSS del sistema modular:
- `.btn`, `.btn--primary`, `.btn--ghost`
- `.panel-section`, `.scrollable-content`
- `.message-item`, `.mailbox-item`
- Variables CSS: `--primary`, `--text-primary`, etc.

## 🔄 **Beneficios**

- ✅ **Reutilización**: Templates pueden usarse en múltiples lugares
- ✅ **Consistencia**: Mismo diseño en toda la aplicación
- ✅ **Mantenibilidad**: Cambios en un lugar afectan todos
- ✅ **Componentes**: Integración perfecta con sistema modular
- ✅ **Performance**: Templates cacheables por el navegador

## 🚀 **Uso Futuro**

Estos templates permiten:
- Generación dinámica de UI
- Sistema de theming
- Internacionalización fácil
- Testing de componentes aislados
