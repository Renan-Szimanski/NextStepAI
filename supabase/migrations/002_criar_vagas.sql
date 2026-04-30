-- supabase/migrations/002_criar_vagas.sql

-- Garantia: extensão pgvector habilitada
CREATE EXTENSION IF NOT EXISTS vector;

-- Remove versões anteriores (caso a migration já tenha rodado com 1536)
DROP TABLE IF EXISTS vagas CASCADE;

-- Criação da tabela de vagas para busca semântica
CREATE TABLE vagas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    area TEXT NOT NULL,
    descricao TEXT NOT NULL,
    chunk_index INTEGER DEFAULT 0,
    embedding VECTOR(384), -- Dimensão do paraphrase-multilingual-MiniLM-L12-v2 (HuggingFace)
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE vagas IS 'Armazena descrições de vagas e seus embeddings (HuggingFace MiniLM 384d) para busca semântica.';

-- Índice IVFFlat para busca por similaridade de cosseno
CREATE INDEX IF NOT EXISTS vagas_embedding_idx ON vagas
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Função RPC com suporte a threshold (alinhada ao vector-store.ts)
CREATE OR REPLACE FUNCTION match_vagas (
  query_embedding VECTOR(384),
  match_count INT DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  id UUID,
  titulo TEXT,
  area TEXT,
  descricao TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS 
$$
BEGIN
  RETURN QUERY
  SELECT
    vagas.id,
    vagas.titulo,
    vagas.area,
    vagas.descricao,
    1 - (vagas.embedding <=> query_embedding) AS similarity
  FROM vagas
  WHERE vagas.embedding IS NOT NULL
    AND 1 - (vagas.embedding <=> query_embedding) > match_threshold
  ORDER BY vagas.embedding <=> query_embedding
  LIMIT match_count;
END;
$$
;