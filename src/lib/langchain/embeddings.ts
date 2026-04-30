import { HuggingFaceInferenceEmbeddings } from '@langchain/community/embeddings/hf';

const PREFIXO_LOG = '[Embeddings]';

const CONFIG_EMBEDDINGS = {
  modelo: 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2',
  dimensoes: 384, // ⚠️ deve bater com vector(384) na migration do Supabase
} as const;

let embeddingsCache: HuggingFaceInferenceEmbeddings | null = null;

/**
 * Retorna instância singleton (lazy) do cliente de embeddings da HuggingFace.
 *
 * A validação da HUGGINGFACEHUB_API_KEY é feita aqui (não no escopo do módulo)
 * para não quebrar o build do Next.js quando a env var não está disponível.
 */
export function obterClienteEmbeddings(): HuggingFaceInferenceEmbeddings {
  if (embeddingsCache) return embeddingsCache;

  const apiKey = process.env.HUGGINGFACEHUB_API_KEY;
  if (!apiKey) {
    throw new Error(`${PREFIXO_LOG} HUGGINGFACEHUB_API_KEY não definida.`);
  }

  embeddingsCache = new HuggingFaceInferenceEmbeddings({
    apiKey,
    model: CONFIG_EMBEDDINGS.modelo,
  });

  console.log(
    `${PREFIXO_LOG} Cliente inicializado: ${CONFIG_EMBEDDINGS.modelo} (${CONFIG_EMBEDDINGS.dimensoes}d)`,
  );
  return embeddingsCache;
}

/**
 * Gera o vetor de embedding para um texto único.
 * Usado pela tool RAG (busca de vagas durante a conversa).
 *
 * @param texto - Texto a ser vetorizado.
 * @returns Vetor numérico de 384 posições.
 * @throws Error se o texto for vazio ou se a API falhar.
 */
export async function gerarEmbedding(texto: string): Promise<number[]> {
  if (!texto || texto.trim().length === 0) {
    throw new Error(`${PREFIXO_LOG} Texto vazio não pode ser vetorizado.`);
  }

  try {
    const cliente = obterClienteEmbeddings();
    return await cliente.embedQuery(texto);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`${PREFIXO_LOG} Erro ao gerar embedding:`, msg);
    throw new Error(`Falha ao processar vetor de busca: ${msg}`);
  }
}

/**
 * Gera embeddings em lote (mais eficiente para popular o banco).
 * Usado em `scripts/popular-banco.ts` para processar dezenas de vagas de uma vez.
 *
 * @param textos - Array de textos a serem vetorizados.
 * @returns Array de vetores numéricos (mesma ordem do input).
 * @throws Error se a API falhar.
 */
export async function gerarEmbeddingsLote(
  textos: string[],
): Promise<number[][]> {
  if (textos.length === 0) return [];

  try {
    const cliente = obterClienteEmbeddings();
    return await cliente.embedDocuments(textos);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`${PREFIXO_LOG} Erro ao gerar embeddings em lote:`, msg);
    throw new Error(`Falha ao processar vetores em lote: ${msg}`);
  }
}