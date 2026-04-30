// src/agentes/orquestrador.ts

import {
  criarAgentePathfinder,
  converterMensagensParaLangChain,
} from './pathfinder';
import type { EventoStreamSSE } from '../tipos/agente';
import type { Mensagem } from '../tipos/index';

const PREFIXO = '[Orquestrador]';

/**
 * Orquestrador responsável por processar a mensagem do usuário,
 * gerenciar o stream de eventos do agente e aplicar lógica de fallback.
 *
 * Fluxo:
 * 1. Tenta o agente principal — bufferiza tokens até o final.
 * 2. Em caso de sucesso: flush do buffer e fim.
 * 3. Em caso de timeout → erro amigável imediato.
 * 4. Em caso de rate limit / erro genérico → tenta fallback (sem vazar tokens parciais).
 * 5. Se fallback também falhar → erro amigável.
 *
 * Otimização: eventos de tool executados com sucesso no principal são logados
 * mas a tool é re-executada no fallback (limitação do LangGraph que recomeça
 * o ReAct loop). Mitigação futura: cache de resultados de tools no escopo da request.
 */
export async function* processarMensagem(
  messages: Mensagem[],
): AsyncGenerator<EventoStreamSSE> {
  if (messages.length === 0) {
    console.warn(`${PREFIXO} Nenhuma mensagem recebida.`);
    yield { type: 'error', message: 'Nenhuma mensagem foi fornecida.' };
    return;
  }

  console.log(
    `${PREFIXO} Iniciando processamento com ${messages.length} mensagens.`,
  );

  // -----------------------------------------------------------------------
  // Tentativa 1: agente principal (com buffer para evitar vazamento de tokens)
  // -----------------------------------------------------------------------
  const eventosPrincipal: EventoStreamSSE[] = [];
  let principalSucesso = false;
  let erroPrincipal: unknown = null;

  try {
    for await (const evento of executarAgente(false, messages)) {
      eventosPrincipal.push(evento);
    }
    principalSucesso = true;
  } catch (error: unknown) {
    erroPrincipal = error;
    console.error(`${PREFIXO} Erro no agente principal:`, error);
  }

  if (principalSucesso) {
    // Flush do buffer: emite todos os eventos acumulados.
    for (const evento of eventosPrincipal) {
      yield evento;
    }
    yield { type: 'done' };
    console.log(`${PREFIXO} Concluído com sucesso (principal).`);
    return;
  }

  // ---- Houve erro no principal. Decidir entre erro fatal ou fallback. ----
  if (ehTimeout(erroPrincipal)) {
    yield {
      type: 'error',
      message: 'A resposta demorou demais. Por favor, tente novamente.',
    };
    return;
  }

  if (ehRateLimit(erroPrincipal)) {
    console.warn(`${PREFIXO} Rate limit detectado. Acionando fallback...`);
  } else {
    console.warn(`${PREFIXO} Erro genérico. Tentando fallback...`);
  }

  // Importante: NÃO emitimos os eventos parciais do principal.
  // Eles são descartados para evitar texto duplicado/quebrado no frontend.
  if (eventosPrincipal.length > 0) {
    const tokensDescartados = eventosPrincipal.filter(
      (e) => e.type === 'token',
    ).length;
    if (tokensDescartados > 0) {
      console.warn(
        `${PREFIXO} Descartando ${tokensDescartados} tokens parciais do principal.`,
      );
    }
  }

  // -----------------------------------------------------------------------
  // Tentativa 2: fallback (stream direto, sem buffer — já é o último recurso)
  // -----------------------------------------------------------------------
  try {
    yield* executarAgente(true, messages);
    yield { type: 'done' };
    console.log(`${PREFIXO} Concluído com sucesso (fallback).`);
  } catch (fallbackError: unknown) {
    console.error(`${PREFIXO} Erro crítico também no fallback:`, fallbackError);
    yield {
      type: 'error',
      message:
        'Não foi possível processar sua mensagem. Tente novamente mais tarde.',
    };
  }
}

/**
 * Encapsula a execução do agente e o consumo do stream de eventos.
 *
 * Filtra tokens "internos" do raciocínio (chunks que não são da resposta final),
 * emitindo apenas o que o usuário deve ver na UI.
 */
async function* executarAgente(
  usarFallback: boolean,
  messages: Mensagem[],
): AsyncGenerator<EventoStreamSSE> {
  const agente = criarAgentePathfinder(usarFallback);
  const langChainMessages = converterMensagensParaLangChain(messages);
  const input = { messages: langChainMessages };

  console.log(`${PREFIXO} Executando agente (fallback=${usarFallback})`);

  const stream = agente.streamEvents(input, { version: 'v2' });

  for await (const event of stream) {
    switch (event.event) {
      case 'on_chat_model_stream': {
        // Filtra tokens que vêm de nós que não são a resposta final.
        // No LangGraph ReAct, queremos só o nó 'agent' (geração final),
        // não 'tools' (parsing) nem chunks intermediários sem texto útil.
        if (!ehTokenDeRespostaFinal(event)) break;

        const texto = extrairTexto(event.data?.chunk?.content);
        if (texto.length > 0) {
          yield { type: 'token', content: texto };
        }
        break;
      }

      case 'on_tool_start': {
        console.log(`${PREFIXO} Tool iniciada: ${event.name}`);
        yield { type: 'tool_call', name: event.name ?? 'desconhecida' };
        break;
      }

      case 'on_tool_end': {
        console.log(`${PREFIXO} Tool finalizada: ${event.name}`);
        yield {
          type: 'tool_result',
          name: event.name ?? 'desconhecida',
          success: true,
        };
        break;
      }

      case 'on_tool_error': {
        console.warn(`${PREFIXO} Tool falhou (não fatal): ${event.name}`);
        yield {
          type: 'tool_result',
          name: event.name ?? 'desconhecida',
          success: false,
        };
        break;
      }

      default:
        break;
    }
  }
}

/**
 * Decide se um evento `on_chat_model_stream` representa um token da resposta
 * final ao usuário (em vez de raciocínio interno do agente).
 *
 * Heurística: aceita tokens com content em formato de texto. Tool calls
 * geralmente vêm como tool_call_chunks no chunk.additional_kwargs, sem
 * conteúdo textual visível.
 */
function ehTokenDeRespostaFinal(event: {
  metadata?: Record<string, unknown>;
  data?: { chunk?: { content?: unknown; additional_kwargs?: unknown } };
}): boolean {
  const chunk = event.data?.chunk;
  if (!chunk) return false;

  // Se o chunk tem tool_calls em andamento, é raciocínio (não resposta final).
  const additional = chunk.additional_kwargs as
    | { tool_calls?: unknown[]; tool_call_chunks?: unknown[] }
    | undefined;
  if (
    additional?.tool_calls?.length ||
    additional?.tool_call_chunks?.length
  ) {
    return false;
  }

  // Se metadata indica que estamos no nó 'tools', filtra (não é resposta).
  const node = event.metadata?.langgraph_node;
  if (node === 'tools') return false;

  return true;
}

/** Normaliza o `content` de um chunk para string. */
function extrairTexto(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((b) => {
        if (typeof b === 'string') return b;
        if (typeof b === 'object' && b !== null && 'text' in b) {
          const t = (b as { text: unknown }).text;
          return typeof t === 'string' ? t : '';
        }
        return '';
      })
      .join('');
  }
  return '';
}

/** Detecta erro de timeout. */
function ehTimeout(erro: unknown): boolean {
  if (typeof erro === 'object' && erro !== null && 'message' in erro) {
    const msg = String((erro as { message: unknown }).message).toLowerCase();
    return (
      msg.includes('timeout') ||
      msg.includes('timed out') ||
      msg.includes('aborted')
    );
  }
  return false;
}

/** Detecta erro de rate limit (HTTP 429 ou mensagem indicativa). */
function ehRateLimit(erro: unknown): boolean {
  if (typeof erro !== 'object' || erro === null) return false;

  if ('status' in erro && (erro as { status: unknown }).status === 429) {
    return true;
  }

  if ('message' in erro) {
    const msg = String((erro as { message: unknown }).message).toLowerCase();
    return (
      msg.includes('rate limit') ||
      msg.includes('rate_limit') ||
      msg.includes('429') ||
      msg.includes('too many requests')
    );
  }

  return false;
}