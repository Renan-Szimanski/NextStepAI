// src/lib/langchain/llm.ts

import { ChatDeepSeek } from '@langchain/deepseek';

const PREFIXO_LOG = '[LangChain]';

export type EstrategiaLLM = 'principal' | 'fallback';

/**
 * IDs dos modelos DeepSeek usados pelo MVP do NextStepAI.
 * - principal: deepseek-v4-flash — rápido e econômico, ideal para o MVP.
 * - fallback:  deepseek-chat     — alias legado, mais compatível como fallback.
 *
 * Referência: https://platform.deepseek.com/docs
 */
const MODELO_PRINCIPAL = 'deepseek-v4-flash';  // aponta para o modelo mais recente estável
const MODELO_FALLBACK = 'deepseek-v4-flash';   // mesmo modelo como fallback seguro no MVP

const CONFIG_LLM = {
  temperatura: 0.4,
  maxTokensSaida: 4096,
  timeoutMs: 30_000,
  maxRetries: 2,
} as const;

/**
 * Cria uma instância configurada do LLM DeepSeek.
 *
 * @param estrategia - 'principal' (padrão) ou 'fallback'.
 * @returns Instância de ChatDeepSeek pronta para uso.
 * @throws Error se `DEEPSEEK_API_KEY` não estiver definida no ambiente.
 */
export function criarLLM(estrategia: EstrategiaLLM = 'principal'): ChatDeepSeek {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error(
      `${PREFIXO_LOG} Variável de ambiente DEEPSEEK_API_KEY não definida.`,
    );
  }

  const modelName =
    estrategia === 'principal' ? MODELO_PRINCIPAL : MODELO_FALLBACK;

  console.log(`${PREFIXO_LOG} Inicializando LLM: ${estrategia} (${modelName})`);

  return new ChatDeepSeek({
    apiKey,
    model: modelName,
    temperature: CONFIG_LLM.temperatura,
    streaming: true,
    maxTokens: CONFIG_LLM.maxTokensSaida,
    timeout: CONFIG_LLM.timeoutMs,
    maxRetries: CONFIG_LLM.maxRetries,
  });
}