// src/app/api/progresso/route.ts

import { z } from 'zod';
import { auth } from '@/lib/auth';
import { toggleConcluidoHabilidade } from '@/lib/supabase/progresso';

export const runtime = 'nodejs';

const requestSchema = z.object({
  acao: z.literal('toggle'),
  habilidade: z.string().min(2),
  concluido: z.boolean(),
  usuarioId: z.string().optional(),
});

export async function POST(req: Request): Promise<Response> {
  const sessao = await auth();
  if (!sessao?.user?.id) {
    return new Response(JSON.stringify({ error: 'Não autenticado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const usuarioId = sessao.user.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const parseado = requestSchema.safeParse(body);
  if (!parseado.success) {
    return new Response(
      JSON.stringify({ error: 'Dados inválidos', detalhes: parseado.error.flatten() }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { habilidade, concluido } = parseado.data;

  try {
    const resultado = await toggleConcluidoHabilidade(usuarioId, habilidade, concluido);
    
    return new Response(JSON.stringify({
      sucesso: true,
      habilidade: resultado.habilidade,
      concluido: resultado.porcentagem === 100,
      nivel: resultado.nivel,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('[api/progresso] Erro:', error);
    return new Response(
      JSON.stringify({ error: 'Falha ao atualizar progresso' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}