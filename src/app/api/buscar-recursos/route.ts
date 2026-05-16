// src/app/api/buscar-recursos/route.ts

/**
 * Endpoint para buscar recursos educacionais de uma habilidade específica.
 * Usado pelo roadmap interativo ao clicar em um nó.
 */

import { z } from 'zod';
import { auth } from '@/lib/auth';
import { buscarRecursosEducacionais } from '@/agentes/ferramentas/buscar-recursos';

export const runtime = 'nodejs';
export const maxDuration = 30;

const requestSchema = z.object({
  habilidade: z.string().min(2).max(100),
  nivel: z.enum(['iniciante', 'intermediário', 'avançado']).optional(),
});

export interface RecursoEducacional {
  titulo: string;
  url: string;
  descricao: string;
}

export async function POST(req: Request): Promise<Response> {
  const sessao = await auth();
  if (!sessao?.user) {
    return new Response(JSON.stringify({ error: 'Não autenticado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

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

  const { habilidade, nivel } = parseado.data;

  try {
    // Invoca a tool existente
    const resultado = await buscarRecursosEducacionais.invoke({
      habilidades: [habilidade],
      nivel: nivel as 'iniciante' | 'intermediário' | 'avançado' | undefined,
    });

    // Extrai o conteúdo da resposta (pode ser string ou ToolMessage)
    const conteudoTexto = extrairConteudoTexto(resultado);
    
    // Parse do resultado Markdown para JSON estruturado
    const recursos = parsearResultadosMarkdown(conteudoTexto);

    return new Response(JSON.stringify({
      habilidade,
      recursos,
      total: recursos.length,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('[api/buscar-recursos] Erro:', error);
    return new Response(
      JSON.stringify({ error: 'Falha ao buscar recursos' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * Extrai texto de uma resposta que pode ser string ou ToolMessage.
 */
function extrairConteudoTexto(resultado: unknown): string {
  if (typeof resultado === 'string') {
    return resultado;
  }
  
  if (resultado && typeof resultado === 'object' && 'content' in resultado) {
    const content = (resultado as { content: unknown }).content;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content
        .map((item: unknown) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object' && 'text' in item) {
            return (item as { text: string }).text;
          }
          return '';
        })
        .join('\n');
    }
  }
  
  return String(resultado ?? '');
}

/**
 * Parse simples do Markdown retornado pela tool para array de objetos.
 */
function parsearResultadosMarkdown(markdown: string): RecursoEducacional[] {
  const linhas = markdown.split('\n');
  const recursos: RecursoEducacional[] = [];

  for (const linha of linhas) {
    // Match para: - [Título](url) — descrição
    const match = linha.match(/^\s*[-*]\s+\[([^\]]+)\]\(([^)]+)\)\s*[—-]?\s*(.*)$/);
    if (match) {
      recursos.push({
        titulo: match[1]?.trim() || '',
        url: match[2]?.trim() || '',
        descricao: match[3]?.trim() || 'Sem descrição',
      });
    }
  }

  return recursos.slice(0, 5);
}