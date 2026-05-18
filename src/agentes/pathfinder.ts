// src/agentes/pathfinder.ts
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { criarLLMParaAgente } from '@/lib/langchain/llm';
import { todasAsTools } from '@/agentes/ferramentas';
import { SYSTEM_PROMPT_PATHFINDER } from '@/agentes/prompts/pathfinder-system';
import {
  HumanMessage,
  AIMessage,
  trimMessages,
  type BaseMessage,
} from '@langchain/core/messages';
import type { Mensagem } from '@/tipos';

const PREFIXO_LOG = '[Pathfinder]';

const CONFIG_MEMORIA = {
  maxTokensHistorico: 18000,
} as const;

type ComReasoning = { reasoning_content?: string };

export function criarAgentePathfinder(usarFallback: boolean = false) {
  const llm = criarLLMParaAgente(usarFallback ? 'fallback' : 'principal');

  return createReactAgent({
    llm,
    tools: todasAsTools,
    stateModifier: SYSTEM_PROMPT_PATHFINDER,
  });
}

export async function converterMensagensParaLangChain(
  mensagens: Mensagem[],
): Promise<BaseMessage[]> {
  const formatadas: BaseMessage[] = [];

  for (const msg of mensagens) {
    if (!msg.conteudo || msg.conteudo.trim().length === 0) continue;

    switch (msg.papel) {
      case 'user':
        formatadas.push(new HumanMessage(msg.conteudo));
        break;

      case 'assistant': {
        const aiMsg = new AIMessage({
          content: msg.conteudo,
          additional_kwargs: msg.reasoningContent
            ? { reasoning_content: msg.reasoningContent }
            : {},
        });
        if (msg.reasoningContent) {
          (aiMsg as AIMessage & ComReasoning).reasoning_content = msg.reasoningContent;
        }
        formatadas.push(aiMsg);
        break;
      }

      case 'tool':
      case 'system':
        break;

      default:
        console.warn(
          `${PREFIXO_LOG} Papel desconhecido ignorado: ${String((msg as Mensagem & { papel: string }).papel)}`,
        );
    }
  }

  const aparadas = await trimMessages(formatadas, {
    maxTokens: CONFIG_MEMORIA.maxTokensHistorico,
    strategy: 'last',
    tokenCounter: estimarTokens,
    startOn: 'human',
    includeSystem: false,
  });

  if (aparadas.length < formatadas.length) {
    console.log(
      `${PREFIXO_LOG} Histórico aparado: ${formatadas.length} → ${aparadas.length} mensagens` +
        ` (limite: ${CONFIG_MEMORIA.maxTokensHistorico} tokens).`,
    );
  }

  return aparadas.map((msg) => {
    if (!(msg instanceof AIMessage)) return msg;

    const typed = msg as AIMessage & ComReasoning;
    if (typed.reasoning_content) return msg;

    const original = formatadas.find(
      (f): f is AIMessage => f instanceof AIMessage && f.content === msg.content,
    );

    const reasoning =
      (original as (AIMessage & ComReasoning) | undefined)?.reasoning_content ??
      (original?.additional_kwargs?.reasoning_content as string | undefined);

    if (reasoning) {
      typed.reasoning_content = reasoning;
      msg.additional_kwargs = { ...msg.additional_kwargs, reasoning_content: reasoning };
    }

    return msg;
  });
}

function estimarTokens(mensagens: BaseMessage[]): number {
  return mensagens.reduce((total, msg) => {
    const conteudo = typeof msg.content === 'string' ? msg.content : '';
    return total + Math.ceil(conteudo.length / 4);
  }, 0);
}