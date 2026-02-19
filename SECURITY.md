# Seguridad del Sistema

## 🛡️ Resumen de Seguridad

Este documento describe las medidas de seguridad implementadas en el sistema de correo electrónico y las mejores prácticas para su uso seguro.

## 🔐 Gestión de Tokens OAuth

### **Almacenamiento Seguro**
- **Encriptación AES-256-GCM**: Todos los tokens OAuth están encriptados con algoritmo AES-256-GCM
- **Clave de encriptación**: Configurable mediante variable de entorno `APP_SECRET`
- **Validación de clave**: La clave debe tener al menos 32 caracteres
- **Entornos**: En producción se requiere `APP_SECRET`, en desarrollo usa clave por defecto con advertencia

### **Ciclo de Vida de Tokens**
- **Refresh automático**: Los tokens se refrescan automáticamente cuando están por expirar
- **Persistencia segura**: Los tokens refrescados se guardan automáticamente en almacenamiento encriptado
- **Validación continua**: Se verifica la validez de los tokens antes de cada uso
- **Revocación segura**: Los tokens pueden ser revocados manualmente eliminando la cuenta

### **Configuración de Seguridad**
```bash
# Variables de entorno críticas (NO deben estar en el código)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
APP_SECRET=your-32-character-secret-key
```

## 🔒 Encriptación de Datos

### **Algoritmo AES-256-GCM**
- **Autenticación**: GCM proporciona autenticación de integridad
- **Vector de inicialización**: Generado aleatoriamente para cada encriptación
- **Etiqueta de autenticación**: Verifica que los datos no han sido manipulados

### **Claves de Encriptación**
- **Derivación**: Usando `crypto.scryptSync` con salt
- **Longitud**: 32 bytes (256 bits)
- **Almacenamiento**: Nunca se almacena la clave, solo se deriva del secreto

## 🚨 Mejoras de Seguridad Recomendadas

### **1. Variables de Entorno**
```bash
# Crear archivo .env (NO subir a repositorio)
cp .env.example .env

# Configurar variables críticas
echo "APP_SECRET=$(openssl rand -base64 32)" >> .env
echo "GOOGLE_CLIENT_ID=tu-client-id" >> .env
echo "GOOGLE_CLIENT_SECRET=tu-client-secret" >> .env
```

### **2. Rotación de Claves**
- **Frecuencia**: Rotar la clave de encriptación cada 90 días
- **Proceso**: Desencriptar datos con clave antigua y encriptar con nueva clave
- **Backup**: Mantener backups encriptados con claves anteriores durante 30 días

### **3. Monitoreo de Seguridad**
- **Auditoría**: Registrar todos los accesos a tokens OAuth
- **Alertas**: Notificar cuando se detecten intentos de acceso no autorizados
- **Logging**: Registrar eventos de seguridad sin exponer datos sensibles

### **4. Seguridad de Red**
- **HTTPS**: Usar HTTPS para todas las comunicaciones externas
- **Validación de certificados**: Verificar certificados SSL/TLS
- **Timeouts**: Configurar timeouts cortos para conexiones

## ⚠️ Riesgos de Seguridad

### **1. Claves Débiles**
- **Riesgo**: Claves cortas o predecibles
- **Mitigación**: Usar claves de al menos 32 caracteres, generadas aleatoriamente

### **2. Exposición de Tokens**
- **Riesgo**: Tokens expuestos en logs o variables de entorno
- **Mitigación**: No registrar tokens, usar variables de entorno seguras

### **3. Ataques de Fuerza Bruta**
- **Riesgo**: Intentos repetidos de acceso
- **Mitigación**: Implementar límites de intentos y bloqueos temporales

### **4. Inyección de Código**
- **Riesgo**: Entradas no validadas
- **Mitigación**: Validación estricta de todas las entradas de usuario

## 🔐 Mejores Prácticas

### **Desarrollo**
1. **Nunca commitear claves**: Las claves nunca deben estar en el código fuente
2. **Entornos separados**: Usar diferentes credenciales para desarrollo, staging y producción
3. **Pruebas de seguridad**: Realizar pruebas de penetración regularmente

### **Producción**
1. **Acceso restringido**: Limitar acceso a variables de entorno críticas
2. **Monitoreo continuo**: Supervisar actividad sospechosa
3. **Respuesta a incidentes**: Tener plan de respuesta para brechas de seguridad

### **Gestión de Cuentas**
1. **Revocación rápida**: Poder revocar tokens inmediatamente ante sospecha
2. **Auditoría de cuentas**: Revisar cuentas activas regularmente
3. **Límites de acceso**: Restringir scopes de OAuth al mínimo necesario

## 📋 Checklist de Seguridad

- [ ] Configurar `APP_SECRET` con clave segura (32+ caracteres)
- [ ] Configurar `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`
- [ ] Añadir `.env` al `.gitignore`
- [ ] Validar todos los inputs de usuario
- [ ] Implementar logging de seguridad sin exponer datos sensibles
- [ ] Configurar monitoreo de actividad sospechosa
- [ ] Establecer procedimientos de rotación de claves
- [ ] Documentar procedimientos de respuesta a incidentes

## 🚨 Incidentes de Seguridad

### **Procedimiento ante Brecha**
1. **Inmediatamente**: Revocar todos los tokens OAuth
2. **Investigar**: Determinar el alcance de la brecha
3. **Notificar**: Informar a usuarios afectados
4. **Remediar**: Corregir vulnerabilidades descubiertas
5. **Prevenir**: Implementar medidas para evitar recurrencias

### **Contacto de Seguridad**
Para reportar vulnerabilidades de seguridad:
- **Email**: security@yourapp.com
- **Asunto**: [SECURITY] Vulnerability Report
- **Contenido**: Descripción detallada del problema, pasos para reproducir, impacto potencial

## 📚 Recursos Adicionales

- [OWASP Security Guidelines](https://owasp.org/)
- [Google OAuth Security Best Practices](https://developers.google.com/identity/protocols/oauth2/security)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Cryptography in Node.js](https://nodejs.org/api/crypto.html)

---

**Nota**: Este documento debe ser revisado y actualizado regularmente para reflejar las mejores prácticas de seguridad actuales.