import { supabaseAdmin } from "../supabase/server";
import { gerarEmbedding } from "./embeddings";
import { VagaComSimilaridade } from "@/tipos/vaga";

/**
 * Busca vagas similares baseadas em uma consulta semântica.
 */
export async function buscarVagasSimilares(
  query: string, 
  k: number = 5
): Promise<VagaComSimilaridade[]> {
  console.log(`[LangChain] Buscando vagas para query: "${query}"`);

  const embedding = await gerarEmbedding(query);

  const { data, error } = await supabaseAdmin.rpc("match_vagas", {
    query_embedding: embedding,
    match_threshold: 0.5, // Similaridade mínima
    match_count: k,
  });

  if (error) {
    console.error("[LangChain] Erro na busca vetorial:", error);
    throw new Error("Falha na consulta ao banco vetorial.");
  }

  return data as VagaComSimilaridade[];
}

/**
 * Formata as vagas recuperadas para serem injetadas no prompt do LLM.
 */
export function formatarVagasParaContexto(vagas: VagaComSimilaridade[]): string {
  if (vagas.length === 0) return "Nenhuma vaga encontrada no mercado.";

  return [
    "## Vagas similares no mercado (recuperadas via RAG)",
    ...vagas.map((vaga, index) => 
      `### Vaga ${index + 1} — ${vaga.titulo} (${vaga.area}) — Similaridade: ${(vaga.similarity * 100).toFixed(0)}%
${vaga.descricao}`
    )
  ].join("\n\n");
}