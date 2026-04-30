/*
 * AVISO: Este arquivo utiliza a SERVICE_ROLE_KEY.
 * Este cliente ignora as políticas de RLS (Row Level Security).
 * IMPORTANTE: Nunca importe este arquivo em componentes de frontend ou
 * APIs expostas ao browser. Use apenas em scripts, rotas de API server-side
 * ou instâncias de agentes.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Variáveis de ambiente do Supabase (URL/SERVICE_KEY) ausentes no servidor.");
}

// Configurado como admin para uso em agentes e scripts
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false, // Não precisamos de sessão em scripts/agentes
  },
});