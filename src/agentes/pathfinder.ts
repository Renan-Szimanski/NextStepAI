import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { criarLLM } from '@/lib/langchain/llm';
import { consultarBancoVetorial } from '@/agentes/ferramentas/buscar-vetor';
import { SYSTEM_PROMPT_PATHFINDER } from '@/agentes/prompts/pathfinder-system';
import { 
  HumanMessage, 
  AIMessage, 
  SystemMessage, 
  BaseMessage 
} from '@langchain/core/messages';
import { Mensagem } from '@/tipos/agente'; // Ajuste o caminho se necessário

/**
 * Cria a instância do agente Pathfinder.
 * O LangGraph utiliza a estrutura ReAct para decidir quando chamar tools.
 * * @param usarFallback - Se true, utiliza o modelo menor para economizar custos/rate limits.
 * @returns Instância configurada do agente.
 */
export function criarAgentePathfinder(usarFallback: boolean = false) {
  const llm = criarLLM(usarFallback ? 'fallback' : 'principal');
  
  // Define as ferramentas disponíveis para o agente
  const tools = [consultarBancoVetorial];

  // Cria o agente configurado com o System Prompt (stateModifier)
  return createReactAgent({
    llm,
    tools,
    stateModifier: SYSTEM_PROMPT_PATHFINDER,
  });
}

/**
 * Converte as mensagens da nossa interface (Frontend) para o formato do LangChain.
 * Filtra mensagens de tool, pois o LangGraph gerencia o ciclo de vida das tools internamente.
 * * @param mensagens - Array de mensagens recebidas do banco de dados/frontend.
 * @returns Array formatado de mensagens para o LangChain.
 */
export function converterMensagensParaLangChain(mensagens: Mensagem[]): BaseMessage[] {
  // Prepara o array com o System Prompt como a primeira mensagem (se necessário, 
  // embora o stateModifier já o faça no createReactAgent)
  const formatadas: BaseMessage[] = [];

  for (const msg of mensagens) {
    switch (msg.role) {
      case 'user':
        formatadas.push(new HumanMessage(msg.content));
        break;
      case 'ai':
        formatadas.push(new AIMessage(msg.content));
        break;
      case 'tool':
        // O LangGraph gerencia chamadas de tools automaticamente.
        // Ignoramos mensagens de 'tool' vindo do histórico salvo.
        break;
      default:
        console.warn(`[Pathfinder] Papel desconhecido ignorado: ${msg.role}`);
    }
  }

  return formatadas;
}