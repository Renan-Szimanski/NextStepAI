import { criarAgentePathfinder, converterMensagensParaLangChain } from './pathfinder';
import { EventoStreamSSE } from '../tipos/agente';
import { Mensagem } from '../tipos/index';

/**
 * Orquestrador responsável por processar a mensagem do usuário, 
 * gerenciar o stream de eventos do agente e aplicar lógica de fallback.
 * * @param messages - Histórico de mensagens do usuário.
 * @returns Um async generator que emite eventos de stream (token, tool, done, error).
 */
export async function* processarMensagem(messages: Mensagem[]): AsyncGenerator<EventoStreamSSE> {
  console.log(`[Orquestrador] Iniciando processamento com ${messages.length} mensagens.`);

  try {
    // Tenta processar com o agente principal
    yield* executarAgente(false, messages);
  } catch (error) {
    console.error("[Orquestrador] Erro no agente principal, iniciando fallback...", error);
    
    try {
      // Tenta processar com o agente fallback (modelo menor/mais estável)
      yield* executarAgente(true, messages);
    } catch (fallbackError) {
      console.error("[Orquestrador] Erro crítico também no fallback:", fallbackError);
      yield { 
        type: 'error', 
        message: 'Não foi possível processar sua mensagem. Tente novamente mais tarde.' 
      };
    }
  }
}

/**
 * Função privada que encapsula a execução do agente e o consumo do stream.
 */
async function* executarAgente(usarFallback: boolean, messages: Mensagem[]): AsyncGenerator<EventoStreamSSE> {
  const agente = criarAgentePathfinder(usarFallback);
  const langChainMessages = converterMensagensParaLangChain(messages);
  
  // O LangGraph espera um objeto de entrada com a chave 'messages'
  const input = { messages: langChainMessages };

  console.log(`[Orquestrador] Executando agente (fallback=${usarFallback})`);

  // API v2 de eventos do LangChain
  const stream = agente.streamEvents(input, { version: 'v2' });

  for await (const event of stream) {
    // 1. Streaming de Tokens do LLM
    if (event.event === 'on_chat_model_stream') {
      const content = event.data?.chunk?.content;
      if (content) {
        yield { type: 'token', content: content.toString() };
      }
    }

    // 2. Início de Tool Call
    if (event.event === 'on_tool_start') {
      console.log(`[Orquestrador] Tool iniciada: ${event.name}`);
      yield { type: 'tool_call', name: event.name || 'desconhecida' };
    }

    // 3. Fim de Tool Call
    if (event.event === 'on_tool_end') {
      console.log(`[Orquestrador] Tool finalizada: ${event.name}`);
      yield { type: 'tool_result', name: event.name || 'desconhecida', success: true };
    }
  }

  // Sinaliza término
  yield { type: 'done' };
}