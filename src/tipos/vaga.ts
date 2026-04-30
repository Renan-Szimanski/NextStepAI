/**
 * Representa a estrutura base de uma vaga armazenada no banco de dados vetorial.
 */
export interface Vaga {
  id: string;
  titulo: string;
  area: string;
  descricao: string;
  origem: 'real' | 'sintetica'; // ← novo
  embedding?: number[];
  criado_em?: string;
}

/**
 * Representa o resultado de uma busca semântica (RAG), estendendo a estrutura
 * de Vaga para incluir a pontuação matemática de proximidade vetorial.
 */
export interface VagaComSimilaridade extends Vaga {
  similarity: number;
}