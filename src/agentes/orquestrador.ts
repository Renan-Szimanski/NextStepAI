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
 * Bug 1 fix: recebe `usuarioId` como parâmetro explícito e o propaga
 * até `executarAgente`, que o injeta no input do agente LangGraph.
 * Isso elimina a dependência de `auth()` dentro das tools, que falhava
 * silenciosamente no contexto assíncrono de streaming.
 *
 * Fluxo:
 * 1. Tenta o agente principal com streaming direto (sem buffer).
 * 2. Em caso de sucesso: tokens chegam ao cliente em tempo real.
 * 3. Em caso de timeout → erro amigável imediato.
 * 4. Em caso de erro ANTES do primeiro token → tenta fallback.
 * 5. Se já havia tokens emitidos → informa interrupção (não dá rollback).
 * 6. Se fallback também falhar → erro amigável.
 */
export async function* processarMensagem(
  messages: Mensagem[],
  usuarioId: string,
): AsyncGenerator<EventoStreamSSE> {
  if (messages.length === 0) {
    console.warn(`${PREFIXO} Nenhuma mensagem recebida.`);
    yield { type: 'error', message: 'Nenhuma mensagem foi fornecida.' };
    return;
  }

  console.log(
    `${PREFIXO} Iniciando processamento com ${messages.length} mensagens (usuário: ${usuarioId}).`,
  );

  let primeiroTokenEmitido = false;

  try {
    for await (const evento of executarAgente(false, messages, usuarioId)) {
      if (evento.type === 'token') primeiroTokenEmitido = true;
      yield evento;
    }

    yield { type: 'done' };
    console.log(`${PREFIXO} Concluído com sucesso (principal).`);
    return;

  } catch (error: unknown) {
    console.error(`${PREFIXO} Erro no agente principal:`, error);

    if (primeiroTokenEmitido) {
      yield {
        type: 'error',
        message: 'A resposta foi interrompida. Por favor, tente novamente.',
      };
      return;
    }

    if (ehTimeout(error)) {
      yield {
        type: 'error',
        message: 'A resposta demorou demais. Por favor, tente novamente.',
      };
      return;
    }

    if (ehRateLimit(error)) {
      console.warn(`${PREFIXO} Rate limit detectado. Acionando fallback...`);
    } else {
      console.warn(`${PREFIXO} Erro genérico sem tokens emitidos. Tentando fallback...`);
    }
  }

  // Fallback (só chega aqui se o principal falhou SEM emitir tokens)
  try {
    yield* executarAgente(true, messages, usuarioId);
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
 * Bug 1 fix: o `usuarioId` é injetado no campo `configurable` do input
 * do LangGraph. A tool `extrair_texto_pdf` lê esse valor diretamente,
 * sem precisar chamar `auth()` — que não funciona fora do contexto HTTP.
 */
async function* executarAgente(
  usarFallback: boolean,
  messages: Mensagem[],
  usuarioId: string,
): AsyncGenerator<EventoStreamSSE> {
  const agente = criarAgentePathfinder(usarFallback);
  const langChainMessages = await converterMensagensParaLangChain(messages);

  // Bug 1 fix: usuarioId injetado em configurable para ser acessível
  // pelas tools via RunnableConfig, sem depender de auth() no contexto da tool.
  const input = { messages: langChainMessages };
  const config = {
    configurable: {
      usuarioId,
    },
  };

  console.log(`${PREFIXO} Executando agente (fallback=${usarFallback}, usuário=${usuarioId})`);

  const stream = agente.streamEvents(input, { version: 'v2', ...config });

  for await (const event of stream) {
    switch (event.event) {
      case 'on_chat_model_stream': {
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

function ehTokenDeRespostaFinal(event: {
  metadata?: Record<string, unknown>;
  data?: { chunk?: { content?: unknown; additional_kwargs?: unknown } };
}): boolean {
  const chunk = event.data?.chunk;
  if (!chunk) return false;

  const additional = chunk.additional_kwargs as
    | { tool_calls?: unknown[]; tool_call_chunks?: unknown[] }
    | undefined;
  if (
    additional?.tool_calls?.length ||
    additional?.tool_call_chunks?.length
  ) {
    return false;
  }

  const node = event.metadata?.langgraph_node;
  if (node === 'tools') return false;

  return true;
}

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