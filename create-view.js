const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://vddfrgrlgiqmeolzewph.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZGZyZ3JsZ2lxbWVvbHpld3BoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDY5OTI5NSwiZXhwIjoyMDc2Mjc1Mjk1fQ.OdPm-pTBXpWfL5X045BE6dFzAB01jRyYQGKdzuqaLBI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createView() {
  try {
    // Crear la vista que mapea los campos de pqrs_responses a los esperados por la API
    const createViewSQL = `
      CREATE OR REPLACE VIEW public.pqrs_responses_summary AS
      SELECT 
        id,
        pqrs_id,
        sent_by as responder_email,
        sent_by as responder_name,
        email_subject as subject,
        response_text as content,
        status,
        sent_at,
        created_at,
        attachment_count,
        CASE 
          WHEN attachment_count > 0 THEN true 
          ELSE false 
        END as has_attachments,
        LENGTH(response_text) as content_length
      FROM public.pqrs_responses
      ORDER BY created_at DESC;
    `;

    // Ejecutar usando una consulta SQL directa
    const { data, error } = await supabase
      .from('pqrs_responses')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Error verificando conexión:', error);
      return;
    }

    console.log('Conexión verificada. Intentando crear vista...');
    
    // Usar el cliente de PostgreSQL directamente
    const { Client } = require('pg');
    
    const client = new Client({
      connectionString: `postgresql://postgres.vddfrgrlgiqmeolzewph:${process.env.DB_PASSWORD || 'backcenter2024'}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`
    });

    await client.connect();
    
    const result = await client.query(createViewSQL);
    console.log('Vista creada exitosamente:', result);
    
    await client.end();

  } catch (error) {
    console.error('Error creando vista:', error);
  }
}

createView();