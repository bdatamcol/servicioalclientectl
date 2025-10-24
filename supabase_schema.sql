-- Crear tabla para logging de respuestas PQRS
CREATE TABLE IF NOT EXISTS public.pqrs_responses (
    id SERIAL PRIMARY KEY,
    pqrs_id UUID NOT NULL,
    to_email VARCHAR(255) NOT NULL,
    cc_emails TEXT,
    bcc_emails TEXT,
    subject VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    content_html TEXT,
    responder_email VARCHAR(255) NOT NULL,
    responder_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    attachment_names TEXT,
    attachment_sizes TEXT,
    send_log TEXT,
    email_message_id VARCHAR(255),
    retry_count INTEGER DEFAULT 0,
    sent_at TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_pqrs_responses_pqrs_id ON public.pqrs_responses(pqrs_id);
CREATE INDEX IF NOT EXISTS idx_pqrs_responses_status ON public.pqrs_responses(status);
CREATE INDEX IF NOT EXISTS idx_pqrs_responses_created_at ON public.pqrs_responses(created_at);
CREATE INDEX IF NOT EXISTS idx_pqrs_responses_responder_email ON public.pqrs_responses(responder_email);
CREATE INDEX IF NOT EXISTS idx_pqrs_responses_sent_at ON public.pqrs_responses(sent_at);
CREATE INDEX IF NOT EXISTS idx_pqrs_responses_composite ON public.pqrs_responses(pqrs_id, status, created_at);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.pqrs_responses ENABLE ROW LEVEL SECURITY;

-- Crear política para permitir todas las operaciones (ajustar según necesidades de seguridad)
CREATE POLICY "Enable all operations for authenticated users" ON public.pqrs_responses
    FOR ALL USING (auth.role() = 'authenticated');

-- Comentarios para documentar la tabla
COMMENT ON TABLE public.pqrs_responses IS 'Tabla para registrar el historial de respuestas enviadas por correo electrónico para PQRS';
COMMENT ON COLUMN public.pqrs_responses.pqrs_id IS 'ID del PQRS al que se responde';
COMMENT ON COLUMN public.pqrs_responses.to_email IS 'Dirección de correo del destinatario principal';
COMMENT ON COLUMN public.pqrs_responses.cc_emails IS 'Direcciones de correo en copia (CC), separadas por comas';
COMMENT ON COLUMN public.pqrs_responses.bcc_emails IS 'Direcciones de correo en copia oculta (BCC), separadas por comas';
COMMENT ON COLUMN public.pqrs_responses.subject IS 'Asunto del correo electrónico';
COMMENT ON COLUMN public.pqrs_responses.content IS 'Contenido del mensaje en texto plano';
COMMENT ON COLUMN public.pqrs_responses.content_html IS 'Contenido del mensaje en formato HTML';
COMMENT ON COLUMN public.pqrs_responses.responder_email IS 'Correo del usuario que envía la respuesta';
COMMENT ON COLUMN public.pqrs_responses.responder_name IS 'Nombre del usuario que envía la respuesta';
COMMENT ON COLUMN public.pqrs_responses.status IS 'Estado del envío: pending, sent, failed';
COMMENT ON COLUMN public.pqrs_responses.error_message IS 'Mensaje de error en caso de fallo en el envío';
COMMENT ON COLUMN public.pqrs_responses.attachment_names IS 'Nombres de archivos adjuntos, separados por comas';
COMMENT ON COLUMN public.pqrs_responses.attachment_sizes IS 'Tamaños de archivos adjuntos en bytes, separados por comas';
COMMENT ON COLUMN public.pqrs_responses.send_log IS 'Log detallado del proceso de envío';
COMMENT ON COLUMN public.pqrs_responses.email_message_id IS 'ID del mensaje de correo para seguimiento';
COMMENT ON COLUMN public.pqrs_responses.retry_count IS 'Número de reintentos de envío';
COMMENT ON COLUMN public.pqrs_responses.sent_at IS 'Fecha y hora de envío exitoso';
COMMENT ON COLUMN public.pqrs_responses.ip_address IS 'Dirección IP del usuario que envía';
COMMENT ON COLUMN public.pqrs_responses.user_agent IS 'User agent del navegador del usuario';

-- Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear trigger para actualizar updated_at
CREATE TRIGGER update_pqrs_responses_updated_at 
    BEFORE UPDATE ON public.pqrs_responses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Crear vista para consultas optimizadas
CREATE OR REPLACE VIEW public.pqrs_responses_summary AS
SELECT 
    pr.id,
    pr.pqrs_id,
    pr.to_email,
    pr.subject,
    pr.responder_email,
    pr.responder_name,
    pr.status,
    pr.sent_at,
    pr.created_at,
    pr.attachment_names,
    CASE 
        WHEN pr.attachment_names IS NOT NULL AND pr.attachment_names != '' 
        THEN true 
        ELSE false 
    END as has_attachments,
    LENGTH(pr.content) as content_length
FROM public.pqrs_responses pr
ORDER BY pr.created_at DESC;

-- Índices adicionales para optimización de consultas
CREATE INDEX IF NOT EXISTS idx_pqrs_responses_status_created_at ON public.pqrs_responses(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pqrs_responses_sent_at_desc ON public.pqrs_responses(sent_at DESC) WHERE sent_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pqrs_responses_pqrs_status_sent ON public.pqrs_responses(pqrs_id, status, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_pqrs_responses_responder_created ON public.pqrs_responses(responder_email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pqrs_responses_error_status ON public.pqrs_responses(status) WHERE error_message IS NOT NULL;

-- Índice para búsquedas de texto en contenido y asunto
CREATE INDEX IF NOT EXISTS idx_pqrs_responses_text_search ON public.pqrs_responses 
USING gin(to_tsvector('spanish', coalesce(subject, '') || ' ' || coalesce(content, '')));

-- Índice compuesto para filtros comunes en la API
CREATE INDEX IF NOT EXISTS idx_pqrs_responses_filters ON public.pqrs_responses(pqrs_id, status, sent_at DESC, created_at DESC);

-- Estadísticas para el optimizador
ANALYZE public.pqrs_responses;

-- Tabla de auditoría de seguridad
CREATE TABLE IF NOT EXISTS security_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    user_role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(255) NOT NULL,
    success BOOLEAN NOT NULL DEFAULT true,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(50),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para la tabla de auditoría
CREATE INDEX IF NOT EXISTS idx_security_audit_user_id ON security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_action ON security_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_security_audit_created_at ON security_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_security_audit_user_action ON security_audit_log(user_id, action);
CREATE INDEX IF NOT EXISTS idx_security_audit_resource ON security_audit_log(resource);

-- Política RLS para la tabla de auditoría (solo administradores pueden ver)
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs" ON security_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.user_metadata->>'role' = 'admin'
        )
    );

-- Función para limpiar logs antiguos (mantener solo 90 días)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM security_audit_log 
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Programar limpieza automática (ejecutar diariamente)
-- Nota: Esto requiere la extensión pg_cron en producción
-- SELECT cron.schedule('cleanup-audit-logs', '0 2 * * *', 'SELECT cleanup_old_audit_logs();');