// src\agentes\orquestrador.ts

import {
  criarAgentePathfinder,
  converterMensagensParaLangChain,
} from './pathfinder';
import type { EventoStreamSSE } from '../tipos/agente';
import type { Mensagem } from '../tipos/index';

const PREFIXO = '[Orquestrador]';
const AGENT_TIMEOUT_MS = 9000;

export async function* processarMensagem(
  messages: Mensagem[],
  usuarioId: string,
): AsyncGenerator<EventoStreamSSE> {
  if (messages.length === 0) {
    yield { type: 'error', message: 'Nenhuma mensagem foi fornecida.' };
    return;
  }

  console.log(`${PREFIXO} Iniciando processamento (usuário: ${usuarioId})`);

  let primeiroTokenEmitido = false;

  const generator = executarAgente(false, messages, usuarioId);
  
  try {
    const iterator = generator[Symbol.asyncIterator]();
    let done = false;

    while (!done) {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AGENT_TIMEOUT')), AGENT_TIMEOUT_MS)
      );
      
      const nextPromise = iterator.next();
      const result = await Promise.race([nextPromise, timeoutPromise]);
      // result pode ser { value, done } vindo de iterator.next() ou nunca chegar (timeout)
      // Como timeout lança exceção, aqui só chega se for o next.
      const { value, done: doneValue } = result as IteratorResult<EventoStreamSSE>;
      done = doneValue === true; // força booleano, tratando undefined como false
      if (value) {
        if (value.type === 'token') primeiroTokenEmitido = true;
        yield value;
      }
    }

    yield { type: 'done' };
    console.log(`${PREFIXO} Concluído com sucesso.`);
    return;
  } catch (error: unknown) {
    console.error(`${PREFIXO} Erro ou timeout no agente principal:`, error);

    if (error instanceof Error && error.message === 'AGENT_TIMEOUT') {
      if (primeiroTokenEmitido) {
        yield { type: 'error', message: 'A resposta foi interrompida. Tente novamente.' };
      } else {
        yield {
          type: 'error',
          message: 'O processamento do seu currículo está demorando mais que o esperado. Continue conversando – os dados serão carregados em breve. Peça "analise meu currículo" novamente em alguns instantes.',
        };
      }
      return;
    }

    if (!primeiroTokenEmitido) {
      try {
        yield* executarAgente(true, messages, usuarioId);
        yield { type: 'done' };
        return;
      } catch (fallbackError) {
        console.error(`${PREFIXO} Fallback também falhou:`, fallbackError);
      }
    }

    yield { type: 'error', message: 'Não foi possível processar sua mensagem. Tente novamente.' };
  }
}

async function* executarAgente(
  usarFallback: boolean,
  messages: Mensagem[],
  usuarioId: string,
): AsyncGenerator<EventoStreamSSE> {
  const agente = criarAgentePathfinder(usarFallback);
  const langChainMessages = await converterMensagensParaLangChain(messages);
  const input = { messages: langChainMessages };
  const config = { configurable: { usuarioId } };

  console.log(`${PREFIXO} Executando agente (fallback=${usarFallback})`);

  const stream = agente.streamEvents(input, { version: 'v2', ...config });

  for await (const event of stream) {
    switch (event.event) {
      case 'on_chat_model_stream': {
        const isFinalToken = ehTokenDeRespostaFinal(event);
        if (!isFinalToken) break;
        const texto = extrairTexto(event.data?.chunk?.content);
        if (texto.length > 0) yield { type: 'token', content: texto };
        break;
      }
      case 'on_tool_start':
        yield { type: 'tool_call', name: event.name ?? 'desconhecida' };
        break;
      case 'on_tool_end':
        yield { type: 'tool_result', name: event.name ?? 'desconhecida', success: true };
        break;
      case 'on_tool_error':
        yield { type: 'tool_result', name: event.name ?? 'desconhecida', success: false };
        break;
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
  
  if (additional?.tool_calls?.length) return false;
  if (additional?.tool_call_chunks?.length) return false;
  
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