const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://vddfrgrlgiqmeolzewph.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZGZyZ3JsZ2lxbWVvbHpld3BoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDY5OTI5NSwiZXhwIjoyMDc2Mjc1Mjk1fQ.OdPm-pTBXpWfL5X045BE6dFzAB01jRyYQGKdzuqaLBI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createTable() {
  try {
    console.log('Intentando crear la tabla pqrs_responses...');
    
    // Primero verificar si la tabla existe
    const { data: existingTable, error: checkError } = await supabase
      .from('pqrs_responses')
      .select('id')
      .limit(1);
    
    if (!checkError) {
      console.log('La tabla pqrs_responses ya existe y es accesible');
      return;
    }
    
    console.log('Error verificando tabla:', checkError.message);
    
    if (checkError.message.includes('does not exist') || checkError.message.includes('schema cache')) {
      console.log('La tabla no existe, necesita ser creada manualmente en Supabase');
      console.log('');
      console.log('='.repeat(80));
      console.log('INSTRUCCIONES PARA CREAR LA TABLA MANUALMENTE:');
      console.log('='.repeat(80));
      console.log('');
      console.log('1. Ve a https://vddfrgrlgiqmeolzewph.supabase.co/project/default/sql');
      console.log('2. Ejecuta el siguiente SQL:');
      console.log('');
      console.log(`-- Crear tabla pqrs_responses
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

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_pqrs_responses_pqrs_id ON public.pqrs_responses(pqrs_id);
CREATE INDEX IF NOT EXISTS idx_pqrs_responses_response_date ON public.pqrs_responses(response_date);
CREATE INDEX IF NOT EXISTS idx_pqrs_responses_created_at ON public.pqrs_responses(created_at);

-- Habilitar RLS
ALTER TABLE public.pqrs_responses ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS
CREATE POLICY "Enable read access for all users" ON public.pqrs_responses
FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON public.pqrs_responses
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users only" ON public.pqrs_responses
FOR UPDATE USING (auth.role() = 'authenticated');

-- Crear función y trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_pqrs_responses_updated_at 
BEFORE UPDATE ON public.pqrs_responses 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`);
      console.log('');
      console.log('3. Después de ejecutar el SQL, reinicia el servidor de desarrollo');
      console.log('');
      console.log('='.repeat(80));
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Ejecutar
createTable()
  .then(() => {
    console.log('Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error ejecutando script:', error);
    process.exit(1);
  });