import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { data: conversa, error } = await supabase
    .from('conversas')
    .select('roadmap_data')
    .eq('id', params.id)
    .eq('usuario_id', session.user.id)
    .single();

  if (error || !conversa?.roadmap_data) {
    return NextResponse.json({ roadmap: null });
  }

  return NextResponse.json({ roadmap: conversa.roadmap_data });
}