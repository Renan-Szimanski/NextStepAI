// src/agentes/pathfinder.ts
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { criarLLM } from '@/lib/langchain/llm';
import { todasAsTools } from '@/agentes/ferramentas'; // ← importa todas as tools
import { SYSTEM_PROMPT_PATHFINDER } from '@/agentes/prompts/pathfinder-system';
import {
  HumanMessage,
  AIMessage,
  trimMessages,
  type BaseMessage,
} from '@langchain/core/messages';
import type { Mensagem } from '@/tipos';

const PREFIXO_LOG = '[Pathfinder]';

/**
 * Configuração da janela de histórico (Estratégia 2: trim por tokens).
 *
 * - `maxTokensHistorico`: orçamento de tokens reservado para mensagens passadas.
 *   Não inclui system prompt, schemas de tools nem a resposta gerada.
 *   Ajustar conforme a janela do modelo principal e o custo/latência tolerados.
 */
const CONFIG_MEMORIA = {
  maxTokensHistorico: 18000,
} as const;

/**
 * Cria a instância do agente Pathfinder usando `createReactAgent` do LangGraph.
 *
 * @param usarFallback - Se true, utiliza o modelo menor (rate limit / custos).
 * @returns Instância compilada do agente ReAct.
 */
export function criarAgentePathfinder(usarFallback: boolean = false) {
  const llm = criarLLM(usarFallback ? 'fallback' : 'principal');
  const tools = todasAsTools; // ← agora inclui buscarVetor e extrairTextoPdf

  return createReactAgent({
    llm,
    tools,
    stateModifier: SYSTEM_PROMPT_PATHFINDER,
  });
}

/**
 * Converte as mensagens da nossa interface (Frontend) para o formato do LangChain
 * e aplica janela deslizante por tokens (Estratégia 2).
 *
 * Mapeamento:
 * - 'user'      → HumanMessage
 * - 'assistant' → AIMessage
 * - 'tool'      → ignorada (LangGraph reconstrói o ciclo de tools internamente)
 * - 'system'    → ignorada (já fornecida via `stateModifier` do createReactAgent)
 *
 * Mensagens com conteúdo vazio também são ignoradas para não poluir o contexto.
 *
 * Após a conversão, `trimMessages` garante que o histórico não exceda
 * `CONFIG_MEMORIA.maxTokensHistorico`. A estratégia mantém as mensagens
 * mais recentes e força que a primeira mensagem preservada seja humana,
 * evitando começar o contexto com uma resposta solta do assistente.
 *
 * @param mensagens - Array de mensagens vindas do frontend/banco.
 * @returns Array formatado e aparado de mensagens para o LangChain.
 */
export async function converterMensagensParaLangChain(
  mensagens: Mensagem[],
): Promise<BaseMessage[]> {
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
        // System prompt já é injetado via `stateModifier` do createReactAgent.
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

  // Estratégia 2: janela deslizante por tokens.
  const aparadas = await trimMessages(formatadas, {
    maxTokens: CONFIG_MEMORIA.maxTokensHistorico,
    strategy: 'last',
    tokenCounter: estimarTokens,
    startOn: 'human',
    includeSystem: false,
  });

  if (aparadas.length < formatadas.length) {
    console.log(
      `${PREFIXO_LOG} Histórico aparado: ${formatadas.length} → ${aparadas.length} mensagens ` +
        `(limite: ${CONFIG_MEMORIA.maxTokensHistorico} tokens).`,
    );
  }

  return aparadas;
}

/**
 * Estimativa de tokens baseada na heurística de ~4 caracteres por token.
 */
function estimarTokens(mensagens: BaseMessage[]): number {
  return mensagens.reduce((total, msg) => {
    const conteudo = typeof msg.content === 'string' ? msg.content : '';
    return total + Math.ceil(conteudo.length / 4);
  }, 0);
}