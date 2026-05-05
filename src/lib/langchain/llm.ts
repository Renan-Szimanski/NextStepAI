import { ChatGroq } from '@langchain/groq';

const PREFIXO_LOG = '[LangChain]';

/**
 * Estratégia de seleção do modelo:
 * - `principal`: modelo maior, melhor qualidade.
 * - `fallback`:  modelo menor/mais rápido, usado em caso de rate limit ou falha.
 */
export type EstrategiaLLM = 'principal' | 'fallback';

/**
 * IDs dos modelos Groq usados pelo MVP do NextStepAI.
 * ⚠️ Validar disponibilidade no plano da conta Groq antes do deploy:
 *    https://console.groq.com/docs/models
 */
const MODELO_PRINCIPAL = 'openai/gpt-oss-120b';
const MODELO_FALLBACK = 'openai/gpt-oss-20b';

const CONFIG_LLM = {
 // temperatura: 0.4,
 // maxTokensSaida: 4096,
 // timeoutMs: 30_000,
 //maxRetries: 2,
  temperatura: 0.4,
  maxTokensSaida: 2048,
  timeoutMs: 30_000,
  maxRetries: 2,
} as const;

/**
 * Cria uma instância configurada do LLM Groq.
 *
 * A validação da `GROQ_API_KEY` é feita dentro da função (não no escopo do módulo)
 * para evitar quebrar o build do Next.js quando a env var não está presente.
 *
 * @param estrategia - 'principal' (padrão) ou 'fallback'.
 * @returns Instância de ChatGroq pronta para uso.
 * @throws Error se `GROQ_API_KEY` não estiver definida no ambiente.
 */
export function criarLLM(estrategia: EstrategiaLLM = 'principal'): ChatGroq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      `${PREFIXO_LOG} Variável de ambiente GROQ_API_KEY não definida.`,
    );
  }

  const modelName =
    estrategia === 'principal' ? MODELO_PRINCIPAL : MODELO_FALLBACK;

  console.log(`${PREFIXO_LOG} Inicializando LLM: ${estrategia} (${modelName})`);

  return new ChatGroq({
    apiKey,
    model: modelName,
    temperature: CONFIG_LLM.temperatura,
    streaming: true,
    maxTokens: CONFIG_LLM.maxTokensSaida,
    timeout: CONFIG_LLM.timeoutMs,
    maxRetries: CONFIG_LLM.maxRetries,
  });
}