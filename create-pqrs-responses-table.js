const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración de Supabase
const supabaseUrl = 'https://vddfrgrlgiqmeolzewph.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZGZyZ3JsZ2lxbWVvbHpld3BoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDY5OTI5NSwiZXhwIjoyMDc2Mjc1Mjk1fQ.OdPm-pTBXpWfL5X045BE6dFzAB01jRyYQGKdzuqaLBI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createPqrsResponsesTable() {
  try {
    console.log('Verificando si la tabla pqrs_responses existe...');
    await createTableAlternative();
  } catch (error) {
    console.error('Error:', error);
    await createTableAlternative();
  }
}

async function createTableAlternative() {
  try {
    console.log('Creando tabla pqrs_responses usando método alternativo...');
    
    // SQL para crear la tabla
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.pqrs_responses (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        pqrs_id UUID NOT NULL REFERENCES public.pqrs(id) ON DELETE CASCADE,
        response_text TEXT NOT NULL,
        response_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        responder_name VARCHAR(255),
        responder_email VARCHAR(255),
        is_internal BOOLEAN DEFAULT false,
        attachments JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    const { data: tableData, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'pqrs_responses')
      .eq('table_schema', 'public');
    
    if (tableError) {
      console.error('Error verificando tabla:', tableError);
    }
    
    if (!tableData || tableData.length === 0) {
      console.log('La tabla no existe, creándola...');
      
      // Usar el cliente SQL directo
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: createTableSQL
      });
      
      if (createError) {
        console.error('Error creando tabla:', createError);
        
        // Último intento: usar una función personalizada
        await createTableWithRawSQL();
      } else {
        console.log('Tabla creada exitosamente');
        await createIndexesAndPolicies();
      }
    } else {
      console.log('La tabla pqrs_responses ya existe');
    }
    
  } catch (error) {
    console.error('Error en método alternativo:', error);
    await createTableWithRawSQL();
  }
}

async function createTableWithRawSQL() {
  try {
    console.log('Usando SQL directo para crear la tabla...');
    
    // Intentar insertar un registro de prueba para verificar si la tabla existe
    const { error: testError } = await supabase
      .from('pqrs_responses')
      .select('id')
      .limit(1);
    
    if (testError && testError.message.includes('does not exist')) {
      console.log('Confirmado: la tabla no existe en la base de datos');
      console.log('Por favor, ejecute manualmente el siguiente SQL en el panel de Supabase:');
      console.log('');
      console.log('-- SQL para crear la tabla pqrs_responses');
      console.log(`
CREATE TABLE IF NOT EXISTS public.pqrs_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pqrs_id UUID NOT NULL REFERENCES public.pqrs(id) ON DELETE CASCADE,
  response_text TEXT NOT NULL,
  response_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  responder_name VARCHAR(255),
  responder_email VARCHAR(255),
  is_internal BOOLEAN DEFAULT false,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_pqrs_responses_pqrs_id ON public.pqrs_responses(pqrs_id);
CREATE INDEX IF NOT EXISTS idx_pqrs_responses_response_date ON public.pqrs_responses(response_date);
CREATE INDEX IF NOT EXISTS idx_pqrs_responses_created_at ON public.pqrs_responses(created_at);

-- RLS Policies
ALTER TABLE public.pqrs_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON public.pqrs_responses
FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.pqrs_responses
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON public.pqrs_responses
FOR UPDATE USING (auth.role() = 'authenticated');

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_pqrs_responses_updated_at BEFORE UPDATE ON public.pqrs_responses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `);
      console.log('');
      console.log('Después de ejecutar el SQL, reinicie el servidor de desarrollo.');
    } else {
      console.log('La tabla pqrs_responses existe y es accesible');
    }
    
  } catch (error) {
    console.error('Error final:', error);
  }
}

async function createIndexesAndPolicies() {
  try {
    console.log('Creando índices y políticas...');
    
    const indexesSQL = `
      CREATE INDEX IF NOT EXISTS idx_pqrs_responses_pqrs_id ON public.pqrs_responses(pqrs_id);
      CREATE INDEX IF NOT EXISTS idx_pqrs_responses_response_date ON public.pqrs_responses(response_date);
      CREATE INDEX IF NOT EXISTS idx_pqrs_responses_created_at ON public.pqrs_responses(created_at);
    `;
    
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: indexesSQL
    });
    
    if (indexError) {
      console.error('Error creando índices:', indexError);
    } else {
      console.log('Índices creados exitosamente');
    }
    
  } catch (error) {
    console.error('Error creando índices:', error);
  }
}

// Ejecutar el script
createPqrsResponsesTable()
  .then(() => {
    console.log('Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error ejecutando script:', error);
    process.exit(1);
  });