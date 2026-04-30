import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não encontradas. ' +
    'Verifique o arquivo .env.local.'
  );
}

// Publishable Anon Key — nunca exponha a service_role key no frontend
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persiste sessão no localStorage (padrão)
    persistSession: true,
    // Auto-refresh do JWT antes de expirar
    autoRefreshToken: true,
    // Detecta sessão existente na URL (PKCE callback)
    detectSessionInUrl: true,
  },
});
