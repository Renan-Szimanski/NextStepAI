import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Variáveis de ambiente do Supabase (URL/ANON_KEY) não encontradas.");
}

// Singleton: instância única do cliente para o frontend
export const supabase = createClient(supabaseUrl, supabaseAnonKey);