import { supabaseAdmin } from '../supabase/server';
import { gerarEmbedding } from './embeddings';
import type { VagaComSimilaridade } from '@/tipos/vaga';

const PREFIXO_LOG = '[VectorStore]';

const CONFIG_BUSCA = {
  //topKPadrao: 5,
  // thresholdPadrao: 0.5,
  // queryMinimaCaracteres: 3,
  // maxCaracteresDescricao: 800,
  topKPadrao: 3,                // 👈 era 5 → vira 3
  thresholdPadrao: 0.5,         // 👈 era 0.5/0.7 → 0.4 calibrado para o MiniLM
  queryMinimaCaracteres: 3,
  maxCaracteresDescricao: 400,  // 👈 era 800 → vira 400
} as const;

/**
 * Busca vagas similares no banco vetorial via RPC `match_vagas` (Supabase + pgvector).
 *
 * Pipeline:
 * 1. Valida a query.
 * 2. Gera o embedding via HuggingFace MiniLM (384d).
 * 3. Chama a função SQL `match_vagas` que retorna as top-k vagas com similaridade
 *    de cosseno acima do threshold.
 *
 * @param query     - Texto em linguagem natural a ser vetorizado e buscado.
 * @param k         - Quantidade máxima de resultados (top-k). Default: 5.
 * @param threshold - Similaridade mínima (0–1). Default: 0.5.
 * @returns Array de vagas ordenadas por similaridade descendente.
 * @throws Error se a query for inválida ou a RPC falhar.
 */
export async function buscarVagasSimilares(
  query: string,
  k: number = CONFIG_BUSCA.topKPadrao,
  threshold: number = CONFIG_BUSCA.thresholdPadrao,
): Promise<VagaComSimilaridade[]> {
  if (!query || query.trim().length < CONFIG_BUSCA.queryMinimaCaracteres) {
    throw new Error(`${PREFIXO_LOG} Query muito curta para busca semântica.`);
  }

  console.log(
    `${PREFIXO_LOG} Buscando vagas para: "${query}" (k=${k}, threshold=${threshold})`,
  );

  const embedding = await gerarEmbedding(query);

  const { data, error } = await supabaseAdmin.rpc('match_vagas', {
    query_embedding: embedding,
    match_count: k,
    match_threshold: threshold,
  });

  if (error) {
    console.error(`${PREFIXO_LOG} Erro na RPC match_vagas:`, error);
    throw new Error(
      `Falha na consulta ao banco vetorial: ${error.message ?? 'erro desconhecido'}`,
    );
  }

  if (!data) {
    console.warn(`${PREFIXO_LOG} RPC retornou data nulo.`);
    return [];
  }

  if (!Array.isArray(data)) {
    console.warn(`${PREFIXO_LOG} RPC retornou formato inesperado:`, data);
    return [];
  }

  console.log(`${PREFIXO_LOG} ${data.length} vaga(s) encontrada(s).`);
  return data as VagaComSimilaridade[];
}

/**
 * Formata as vagas recuperadas em Markdown para serem injetadas no contexto do LLM.
 *
 * O cabeçalho inclui instruções anti-alucinação para reforçar ao agente
 * que ele deve sintetizar padrões em vez de citar vagas individuais.
 *
 * @param vagas - Array retornado por `buscarVagasSimilares`.
 * @returns String em Markdown pronta para ser usada como contexto.
 */
export function formatarVagasParaContexto(
  vagas: VagaComSimilaridade[],
): string {
  if (vagas.length === 0) {
    return 'Nenhuma vaga similar encontrada no banco.';
  }

  const cabecalho =
    `## Vagas similares no mercado (${vagas.length} resultado${vagas.length > 1 ? 's' : ''} via RAG)\n` +
    `_Use estes dados como base factual para a análise. ` +
    `Sintetize padrões — não cite vagas individuais como regra geral._`;

  const corpo = vagas.map(
    (vaga, index) =>
      `### Vaga ${index + 1} — ${vaga.titulo}\n` +
      `**Área:** ${vaga.area}\n` +
      `**Similaridade:** ${(vaga.similarity * 100).toFixed(0)}%\n\n` +
      `**Descrição:**\n${truncar(vaga.descricao, CONFIG_BUSCA.maxCaracteresDescricao)}`,
  );

  return [cabecalho, ...corpo].join('\n\n');
}

/** Trunca texto preservando aproximadamente palavras inteiras. */
function truncar(texto: string, max: number): string {
  if (texto.length <= max) return texto;
  return texto.slice(0, max).trimEnd() + '...';
}