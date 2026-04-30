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
 * 1. Tenta o agente principal.
 * 2. Em caso de timeout → erro amigável imediato.
 * 3. Em caso de rate limit ou erro genérico → tenta fallback.
 * 4. Se fallback também falhar → erro amigável.
 */
export async function* processarMensagem(
  messages: Mensagem[],
): AsyncGenerator<EventoStreamSSE> {
  if (messages.length === 0) {
    console.warn(`${PREFIXO} Nenhuma mensagem recebida.`);
    yield { type: 'error', message: 'Nenhuma mensagem foi fornecida.' };
    return;
  }

  console.log(`${PREFIXO} Iniciando processamento com ${messages.length} mensagens.`);

  // ---------- Tentativa 1: agente principal ----------
  try {
    yield* executarAgente(false, messages);
    yield { type: 'done' };
    console.log(`${PREFIXO} Concluído com sucesso (principal).`);
    return;
  } catch (error: unknown) {
    console.error(`${PREFIXO} Erro no agente principal:`, error);

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
      console.warn(`${PREFIXO} Erro genérico. Tentando fallback...`);
    }
  }

  // ---------- Tentativa 2: fallback ----------
  try {
    yield* executarAgente(true, messages);
    yield { type: 'done' };
    console.log(`${PREFIXO} Concluído com sucesso (fallback).`);
  } catch (fallbackError: unknown) {
    console.error(`${PREFIXO} Erro crítico também no fallback:`, fallbackError);
    yield {
      type: 'error',
      message: 'Não foi possível processar sua mensagem. Tente novamente mais tarde.',
    };
  }
}

/**
 * Encapsula a execução do agente e o consumo do stream de eventos.
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
    return msg.includes('timeout') || msg.includes('timed out') || msg.includes('aborted');
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
      msg.includes('429') ||
      msg.includes('too many requests')
    );
  }

  return false;
}