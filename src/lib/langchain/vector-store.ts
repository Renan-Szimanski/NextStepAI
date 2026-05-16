// src/lib/langchain/vector-store.ts
import { supabaseAdmin } from '../supabase/server';
import { gerarEmbedding } from './embeddings';
import type { VagaComSimilaridade } from '@/tipos/vaga';

const PREFIXO_LOG = '[VectorStore]';

// Bug 2 fix: timeout máximo para cada operação remota (embedding + RPC).
// Se qualquer await ultrapassar esse limite, lança TimeoutError em vez de ficar preso.
const TIMEOUT_MS = 12_000; // 12 s — deixa 3 s de margem para o timeout de 15 s da tool

const CONFIG_BUSCA = {
  topKPadrao: 3,
  thresholdPadrao: 0.5,
  queryMinimaCaracteres: 3,
  maxCaracteresDescricao: 400,
} as const;

/**
 * Cria uma Promise que rejeita após `ms` milissegundos com um TimeoutError.
 * Usada em Promise.race para impor limite de tempo em operações externas.
 */
function criarTimeout(ms: number, operacao: string): Promise<never> {
  return new Promise((_, rejeitar) =>
    setTimeout(
      () => rejeitar(new Error(`Timeout (${ms}ms) atingido em: ${operacao}`)),
      ms,
    ),
  );
}

/**
 * Busca vagas similares no banco vetorial via RPC `match_vagas` (Supabase + pgvector).
 *
 * Pipeline:
 * 1. Valida a query.
 * 2. Gera o embedding via HuggingFace MiniLM (384d) — com timeout.
 * 3. Chama a função SQL `match_vagas` — com timeout.
 *
 * Correção Bug 2: cada operação de I/O agora compete contra um timeout via
 * Promise.race, evitando que a tool fique presa indefinidamente caso a API
 * de embeddings ou o Supabase não respondam.
 *
 * @param query     - Texto em linguagem natural a ser vetorizado e buscado.
 * @param k         - Quantidade máxima de resultados (top-k). Default: 3.
 * @param threshold - Similaridade mínima (0–1). Default: 0.5.
 * @returns Array de vagas ordenadas por similaridade descendente.
 * @throws Error se a query for inválida, timeout ou a RPC falhar.
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

  // ── Etapa 1: gerar embedding com timeout ────────────────────────────────
  // Bug 2 fix: se a API do HuggingFace travar, a Promise.race rejeita em
  // TIMEOUT_MS em vez de deixar o agente esperando indefinidamente.
  let embedding: number[];
  try {
    embedding = await Promise.race([
      gerarEmbedding(query),
      criarTimeout(TIMEOUT_MS, 'gerarEmbedding'),
    ]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`${PREFIXO_LOG} Falha ao gerar embedding:`, msg);
    // Relança com mensagem clara para que buscar-vetor.ts possa capturar
    throw new Error(`Falha ao gerar embedding: ${msg}`);
  }

  // ── Etapa 2: consultar pgvector com timeout ──────────────────────────────
  // Bug 2 fix: se o Supabase não responder, a corrida garante rejeição limpa.
  const rpcPromise = supabaseAdmin.rpc('match_vagas', {
    query_embedding: embedding,
    match_count: k,
    match_threshold: threshold,
  });

  let data: VagaComSimilaridade[] | null;
  let rpcError: { message?: string } | null;

  try {
    const resultado = await Promise.race([
      rpcPromise,
      criarTimeout(TIMEOUT_MS, 'rpc match_vagas'),
    ]);
    data = resultado.data as VagaComSimilaridade[] | null;
    rpcError = resultado.error as { message?: string } | null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`${PREFIXO_LOG} Falha na RPC (timeout ou rede):`, msg);
    throw new Error(`Falha na consulta ao banco vetorial: ${msg}`);
  }

  if (rpcError) {
    console.error(`${PREFIXO_LOG} Erro na RPC match_vagas:`, rpcError);
    throw new Error(
      `Falha na consulta ao banco vetorial: ${rpcError.message ?? 'erro desconhecido'}`,
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