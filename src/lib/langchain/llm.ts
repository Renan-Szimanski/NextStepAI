import { ChatGroq } from "@langchain/groq";
import { BaseMessage } from "@langchain/core/messages";

if (!process.env.GROQ_API_KEY) {
  throw new Error("[LangChain] Falta a variável GROQ_API_KEY");
}

/**
 * Cria a instância do LLM baseada na estratégia (principal ou fallback).
 */
export function criarLLM(modelo: 'principal' | 'fallback' = 'principal'): ChatGroq {
  const modelName = modelo === 'principal' ? 'llama3-70b-8192' : 'llama3-8b-8192'; 
  // Nota: Substitua pelos IDs exatos de modelo suportados pela sua conta Groq, se necessário.
  
  console.log(`[LangChain] Inicializando LLM: ${modelo} (${modelName})`);

  return new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: modelName,
    temperature: 0.4,
    streaming: true,
    maxTokens: 2048,
  });
}

/**
 * Tenta invocar o LLM principal e, em caso de erro, usa o fallback.
 */
export async function invocarComFallback(messages: BaseMessage[]) {
  const llmPrincipal = criarLLM('principal');
  const llmFallback = criarLLM('fallback');

  try {
    return await llmPrincipal.invoke(messages);
  } catch (error) {
    console.error("[LangChain] Erro no LLM principal, tentando fallback...", error);
    return await llmFallback.invoke(messages);
  }
}