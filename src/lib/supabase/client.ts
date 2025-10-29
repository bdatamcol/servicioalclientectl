import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

function resolvePublicEnv() {
  interface PublicEnv { NEXT_PUBLIC_SUPABASE_URL?: string; NEXT_PUBLIC_SUPABASE_ANON_KEY?: string; }
  interface CustomWindow extends Window { __PUBLIC_ENV__?: PublicEnv; }
  const winEnv = typeof window !== "undefined" ? (window as CustomWindow).__PUBLIC_ENV__ : undefined;
  const supabaseUrl = winEnv?.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = winEnv?.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase public env not available at runtime");
  }
  return { supabaseUrl, supabaseAnonKey };
}

export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;
  const { supabaseUrl, supabaseAnonKey } = resolvePublicEnv();
  _client = createClient(supabaseUrl, supabaseAnonKey);
  return _client;
}

// Proxy para mantener el import existente `import { supabase } ...`
// No crea el cliente hasta que se accede a alguna propiedad (p. ej. `supabase.auth`)
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    // @ts-expect-error - acceso dinámico
    return client[prop];
  }
});