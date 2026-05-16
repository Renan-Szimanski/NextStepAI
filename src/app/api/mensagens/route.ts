// src/app/api/mensagens/route.ts

/**
 * Endpoint de chat com streaming SSE (Server-Sent Events).
 *
 * Recebe o histórico de mensagens do cliente, valida a sessão do usuário,
 * invoca o orquestrador (async generator) e devolve os eventos do agente
 * Pathfinder em formato SSE para consumo incremental no frontend.
 *
 * Fluxo:
 *   1. Valida autenticação via NextAuth (auth()).
 *   2. Valida o body JSON com Zod.
 *   3. Cria um ReadableStream que consome processarMensagem().
 *   4. Retorna Response com headers SSE corretos.
 *   5. Cancela o stream se o cliente abortar (req.signal).
 *
 * Bug 1 fix: o usuarioId (obtido aqui, onde auth() tem acesso aos cookies
 * da requisição HTTP) agora é passado explicitamente para processarMensagem().
 * As tools não chamam mais auth() internamente — o que falhava silenciosamente
 * dentro do contexto assíncrono de streaming do LangGraph.
 */

import { z } from 'zod';
import { auth } from '@/lib/auth';
import { processarMensagem } from '@/agentes/orquestrador';
import { Mensagem } from '@/tipos/agente';

// LangChain.js depende de APIs Node (streams, crypto, etc.) — não roda em Edge.
export const runtime = 'nodejs';
// Vercel Pro: 60s. Em Hobby será automaticamente capado em 10s.
export const maxDuration = 60;
// Garante que o Next não tente cachear a rota.
export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Schema de validação do payload recebido do cliente.
// ---------------------------------------------------------------------------
const mensagemSchema = z.object({
  id: z.string(),
  papel: z.enum(['user', 'assistant', 'tool', 'system']),
  conteudo: z.string(),
  timestamp: z.number(),
  toolName: z.string().optional(),
});

const requestSchema = z.object({
  messages: z.array(mensagemSchema).min(1).max(50),
  sessionId: z.string(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function respostaJson(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function formatarEventoSSE(evento: unknown, encoder: TextEncoder): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(evento)}\n\n`);
}

// ---------------------------------------------------------------------------
// Handler POST
// ---------------------------------------------------------------------------
export async function POST(req: Request): Promise<Response> {
  // -------------------------------------------------------------------------
  // 1. Validação de sessão
  // auth() só tem acesso aos cookies aqui, no handler HTTP.
  // Por isso o usuarioId é extraído neste ponto e repassado adiante —
  // não dentro das tools, onde o contexto de requisição já não existe.
  // -------------------------------------------------------------------------
  const sessao = await auth();
  if (!sessao?.user) {
    return respostaJson({ error: 'Não autenticado' }, 401);
  }

  // Bug 1 fix: extrai o usuarioId aqui, onde auth() funciona corretamente.
  const usuarioId =
    (sessao.user as { id?: string }).id ?? sessao.user.email ?? 'desconhecido';

  if (!usuarioId || usuarioId === 'desconhecido') {
    console.error('[api/mensagens] sessão sem id de usuário válido:', sessao.user);
    return respostaJson({ error: 'Sessão inválida' }, 401);
  }

  // -------------------------------------------------------------------------
  // 2. Validação do body com Zod
  // -------------------------------------------------------------------------
  let bodyBruto: unknown;
  try {
    bodyBruto = await req.json();
  } catch {
    return respostaJson({ error: 'Body JSON inválido' }, 400);
  }

  const parseado = requestSchema.safeParse(bodyBruto);
  if (!parseado.success) {
    return respostaJson(
      {
        error: 'Payload inválido',
        detalhes: parseado.error.flatten(),
      },
      400,
    );
  }

  const { messages, sessionId } = parseado.data;

  console.info('[api/mensagens] requisição recebida', {
    usuario: usuarioId,
    totalMensagens: messages.length,
    sessionId,
  });

  // -------------------------------------------------------------------------
  // 3. Construção do ReadableStream SSE
  // -------------------------------------------------------------------------
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let fechado = false;

      const fechar = () => {
        if (fechado) return;
        fechado = true;
        try {
          controller.close();
        } catch {
          // controller já estava fechado — ignorar.
        }
      };

      const onAbort = () => {
        console.info('[api/mensagens] cliente abortou a conexão', {
          sessionId,
          usuario: usuarioId,
        });
        fechar();
      };

      if (req.signal.aborted) {
        fechar();
        return;
      }
      req.signal.addEventListener('abort', onAbort, { once: true });

      try {
        // Bug 1 fix: passa usuarioId explicitamente para o orquestrador,
        // que o repassa para as tools via argumento — sem depender de auth()
        // dentro do contexto assíncrono do LangGraph.
        for await (const evento of processarMensagem(messages as Mensagem[], usuarioId)) {
          if (fechado || req.signal.aborted) break;
          controller.enqueue(formatarEventoSSE(evento, encoder));
        }
      } catch (erro) {
        console.error('[api/mensagens] erro durante streaming', {
          sessionId,
          usuario: usuarioId,
          erro:
            erro instanceof Error
              ? { message: erro.message, stack: erro.stack }
              : erro,
        });

        if (!fechado) {
          try {
            controller.enqueue(
              formatarEventoSSE(
                {
                  type: 'error',
                  message:
                    'Ocorreu um erro ao processar sua mensagem. Tente novamente.',
                },
                encoder,
              ),
            );
          } catch {
            // ignorar falha ao emitir evento de erro
          }
        }
      } finally {
        req.signal.removeEventListener('abort', onAbort);
        fechar();
      }
    },

    cancel(motivo) {
      console.info('[api/mensagens] stream cancelado', {
        sessionId,
        usuario: usuarioId,
        motivo: motivo instanceof Error ? motivo.message : motivo,
      });
    },
  });

  // -------------------------------------------------------------------------
  // 4. Resposta com headers SSE
  // -------------------------------------------------------------------------
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}