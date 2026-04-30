import { createAgent } from 'langchain';
import { criarLLM } from '@/lib/langchain/llm';
import { consultarBancoVetorial } from '@/agentes/ferramentas/buscar-vetor';
import { SYSTEM_PROMPT_PATHFINDER } from '@/agentes/prompts/pathfinder-system';
import {
  HumanMessage,
  AIMessage,
  type BaseMessage,
} from '@langchain/core/messages';
import type { Mensagem } from '@/tipos';

const PREFIXO_LOG = '[Pathfinder]';

/**
 * Cria a instância do agente Pathfinder usando `createAgent` do LangChain v1.
 * Substitui o `createReactAgent` deprecated do `@langchain/langgraph/prebuilt`.
 *
 * @param usarFallback - Se true, utiliza o modelo menor (rate limit / custos).
 * @returns Instância compilada do agente.
 */
export function criarAgentePathfinder(usarFallback: boolean = false) {
  const llm = criarLLM(usarFallback ? 'fallback' : 'principal');
  const tools = [consultarBancoVetorial];

  return createAgent({
    model: llm,
    tools,
    systemPrompt: SYSTEM_PROMPT_PATHFINDER,
  });
}

/**
 * Converte as mensagens da nossa interface (Frontend) para o formato do LangChain.
 *
 * Mapeamento:
 * - 'user'      → HumanMessage
 * - 'assistant' → AIMessage
 * - 'tool'      → ignorada (LangGraph reconstrói o ciclo de tools internamente)
 * - 'system'    → ignorada (já fornecida via `systemPrompt` do createAgent)
 *
 * Mensagens com conteúdo vazio também são ignoradas para não poluir o contexto.
 *
 * @param mensagens - Array de mensagens vindas do frontend/banco.
 * @returns Array formatado de mensagens para o LangChain.
 */
export function converterMensagensParaLangChain(
  mensagens: Mensagem[],
): BaseMessage[] {
  const formatadas: BaseMessage[] = [];

  for (const msg of mensagens) {
    if (!msg.conteudo || msg.conteudo.trim().length === 0) {
      continue;
    }

    switch (msg.papel) {
      case 'user':
        formatadas.push(new HumanMessage(msg.conteudo));
        break;

      case 'assistant':
        formatadas.push(new AIMessage(msg.conteudo));
        break;

      case 'tool':
        // LangGraph gerencia o ciclo de tools internamente; ignorar do histórico.
        break;

      case 'system':
        // System prompt já é injetado via `systemPrompt` do createAgent.
        break;

      default: {
        const _exhaustiveCheck: never = msg.papel;
        console.warn(
          `${PREFIXO_LOG} Papel desconhecido ignorado: ${String(_exhaustiveCheck)}`,
        );
        break;
      }
    }
  }

  return formatadas;
}