# Documentación del Sistema de Envío de Correos PQRS

## Resumen de Correcciones Aplicadas

### 1. Problema de Tipos TypeScript
**Error:** `nodemailer` module implicitly has an 'any' type
**Solución:** Instalación de `@types/nodemailer`
```bash
npm install --save-dev @types/nodemailer
```

### 2. Configuración SMTP Completa
**Problema:** Variables de entorno incompletas para Gmail
**Solución:** Configuración completa en `.env.local`
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_SERVICE=gmail
SMTP_USER=digital@bdatam.com
SMTP_PASS=ewjqvsntmbadbzah
SMTP_FROM=digital@bdatam.com
SMTP_FROM_NAME=BDATAM Digital
```

### 3. Esquema de Base de Datos
**Problema:** Tabla `pqrs_responses` no existía
**Solución:** Creación del esquema SQL completo (ver `supabase_schema.sql`)

### 4. Manejo de Errores en UI
**Problema:** Mensajes de error genéricos
**Solución:** Implementación de mensajes detallados con contexto específico

## Configuración SMTP para Gmail

### Requisitos
1. **Cuenta Gmail:** Usar cuenta corporativa `digital@bdatam.com`
2. **Contraseña de Aplicación:** Generar en configuración de seguridad de Google
3. **Verificación en 2 pasos:** Debe estar habilitada

### Variables de Entorno Requeridas
```env
# Configuración SMTP Gmail
SMTP_HOST=smtp.gmail.com          # Servidor SMTP de Gmail
SMTP_PORT=587                     # Puerto para STARTTLS
SMTP_SECURE=false                 # false para puerto 587
SMTP_SERVICE=gmail                # Servicio predefinido
SMTP_USER=digital@bdatam.com      # Email de autenticación
SMTP_PASS=ewjqvsntmbadbzah        # Contraseña de aplicación
SMTP_FROM=digital@bdatam.com      # Email remitente
SMTP_FROM_NAME=BDATAM Digital     # Nombre del remitente
```

### Configuraciones Alternativas
```env
# Para puerto 465 (SSL)
SMTP_PORT=465
SMTP_SECURE=true

# Para servidores SMTP personalizados
SMTP_HOST=mail.tudominio.com
SMTP_PORT=587
SMTP_SECURE=false
```

## Estructura de la API

### Endpoint: `/api/pqrs/responses`

#### POST - Envío Individual
```json
{
  "to_email": "destinatario@email.com",
  "pqrs_id": 1,
  "content": "Mensaje de respuesta",
  "responder_email": "admin@bdatam.com",
  "subject": "Asunto del correo",
  "cc_emails": "copia@email.com",
  "bcc_emails": "copia_oculta@email.com"
}
```

#### POST - Envío Masivo
```json
{
  "batch_emails": [
    {
      "to_email": "dest1@email.com",
      "pqrs_id": 1,
      "content": "Mensaje 1",
      "responder_email": "admin@bdatam.com",
      "subject": "Asunto 1"
    },
    {
      "to_email": "dest2@email.com",
      "pqrs_id": 2,
      "content": "Mensaje 2",
      "responder_email": "admin@bdatam.com",
      "subject": "Asunto 2"
    }
  ]
}
```

#### Respuesta de Éxito
```json
{
  "ok": true,
  "data": {
    "status": "sent",
    "message": "Email enviado exitosamente"
  }
}
```

#### Respuesta de Error
```json
{
  "ok": false,
  "data": {
    "status": "failed",
    "error_message": "Descripción detallada del error"
  },
  "error": "Mensaje de error general"
}
```

## Validaciones Implementadas

### 1. Validación de Correos
- Formato de email válido
- Longitud máxima de 255 caracteres
- Separación por comas para CC/BCC

### 2. Validación de Contenido
- Mensaje mínimo de 10 caracteres
- Asunto obligatorio
- Contenido HTML sanitizado

### 3. Validación de Archivos
- Tamaño máximo: 5MB
- Tipos permitidos: PDF, DOC, DOCX, PNG, JPG, JPEG, WEBP
- Validación de extensión y MIME type

## Manejo de Errores

### Tipos de Errores Comunes

#### 1. Errores SMTP
```
Error: SSL routines: wrong version number
Solución: Verificar SMTP_PORT y SMTP_SECURE
```

#### 2. Errores de Autenticación
```
Error: Invalid login
Solución: Verificar SMTP_USER y SMTP_PASS
```

#### 3. Errores de Red
```
Error: Connection timeout
Solución: Verificar conectividad y firewall
```

#### 4. Errores de Base de Datos
```
Error: Could not find table 'pqrs_responses'
Solución: Ejecutar script supabase_schema.sql
```

### Contexto Adicional en UI
- Errores SSL/SMTP: "Verifique la configuración SMTP del servidor"
- Errores de autenticación: "Credenciales de correo incorrectas"
- Errores de red: "Problema de conectividad de red"

## Logging y Monitoreo

### Tabla `pqrs_responses`
```sql
- id: Identificador único
- pqrs_id: ID del PQRS relacionado
- to_email: Destinatario principal
- cc_emails: Copias (separadas por comas)
- bcc_emails: Copias ocultas (separadas por comas)
- subject: Asunto del correo
- content: Contenido del mensaje
- responder_email: Email del remitente
- status: Estado (pending, sent, failed)
- error_message: Mensaje de error detallado
- attachment_names: Nombres de archivos adjuntos
- send_log: Log detallado del proceso
- created_at: Fecha de creación
- updated_at: Fecha de actualización
```

### Consultas Útiles
```sql
-- Correos fallidos en las últimas 24 horas
SELECT * FROM pqrs_responses 
WHERE status = 'failed' 
AND created_at > NOW() - INTERVAL '24 hours';

-- Estadísticas de envío por día
SELECT DATE(created_at) as fecha, 
       COUNT(*) as total,
       SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as exitosos,
       SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as fallidos
FROM pqrs_responses 
GROUP BY DATE(created_at)
ORDER BY fecha DESC;
```

## Medidas Preventivas

### 1. Monitoreo Continuo
- Revisar logs de error diariamente
- Configurar alertas para fallos de envío
- Monitorear cuotas de Gmail (500 correos/día para cuentas gratuitas)

### 2. Validación Previa
- Verificar conectividad SMTP antes del envío
- Validar formato de emails antes de procesar
- Comprobar tamaño y tipo de archivos adjuntos

### 3. Configuración de Respaldo
```env
# Configuración de respaldo (Outlook/Hotmail)
SMTP_HOST_BACKUP=smtp-mail.outlook.com
SMTP_PORT_BACKUP=587
SMTP_USER_BACKUP=backup@outlook.com
SMTP_PASS_BACKUP=password_backup
```

### 4. Límites y Throttling
- Implementar límite de envíos por minuto
- Queue de correos para envíos masivos
- Retry automático con backoff exponencial

### 5. Seguridad
- Usar contraseñas de aplicación, no contraseñas principales
- Rotar credenciales periódicamente
- Implementar rate limiting por IP
- Validar y sanitizar todo input del usuario

## Casos de Prueba

### 1. Envío Individual Exitoso
```bash
curl -X POST http://localhost:3001/api/pqrs/responses \
  -H "Content-Type: application/json" \
  -d '{"to_email":"test@example.com","pqrs_id":1,"content":"Test message","responder_email":"admin@bdatam.com","subject":"Test Subject"}'
```

### 2. Envío con CC/BCC
```bash
curl -X POST http://localhost:3001/api/pqrs/responses \
  -H "Content-Type: application/json" \
  -d '{"to_email":"test@example.com","cc_emails":"cc@example.com","bcc_emails":"bcc@example.com","pqrs_id":1,"content":"Test with copies","responder_email":"admin@bdatam.com","subject":"Test with CC/BCC"}'
```

### 3. Envío Masivo
```bash
curl -X POST http://localhost:3001/api/pqrs/responses \
  -H "Content-Type: application/json" \
  -d '{"batch_emails":[{"to_email":"test1@example.com","pqrs_id":1,"content":"Message 1","responder_email":"admin@bdatam.com","subject":"Subject 1"},{"to_email":"test2@example.com","pqrs_id":2,"content":"Message 2","responder_email":"admin@bdatam.com","subject":"Subject 2"}]}'
```

## Troubleshooting

### Problema: Correos no se envían
1. Verificar variables de entorno
2. Comprobar conectividad a smtp.gmail.com:587
3. Validar credenciales de Gmail
4. Revisar logs en `pqrs_responses.send_log`

### Problema: Errores SSL
1. Verificar SMTP_PORT (587 para STARTTLS, 465 para SSL)
2. Ajustar SMTP_SECURE según el puerto
3. Comprobar firewall y proxy

### Problema: Tabla no encontrada
1. Ejecutar script `supabase_schema.sql` en Supabase
2. Verificar permisos de la tabla
3. Comprobar conexión a base de datos

### Problema: Archivos adjuntos fallan
1. Verificar tamaño < 5MB
2. Comprobar tipo de archivo permitido
3. Validar encoding del archivo

---

**Fecha de última actualización:** $(date)
**Versión:** 1.0
**Responsable:** Sistema PQRS BDATAM