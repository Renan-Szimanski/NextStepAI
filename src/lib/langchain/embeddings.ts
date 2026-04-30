import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";

// Agora usamos a classe correta sugerida pelo compilador
export const embeddings = new HuggingFaceInferenceEmbeddings({
  model: "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
  apiKey: process.env.HUGGINGFACEHUB_API_KEY, // Você precisará adicionar essa chave ao seu .env.local
});

export async function gerarEmbedding(texto: string): Promise<number[]> {
  try {
    return await embeddings.embedQuery(texto);
  } catch (error) {
    console.error("[LangChain] Erro ao gerar embedding (HuggingFace):", error);
    throw new Error("Falha ao processar vetor de busca.");
  }
}