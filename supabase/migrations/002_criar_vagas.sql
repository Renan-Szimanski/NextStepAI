-- Criação da tabela de vagas para busca semântica
CREATE TABLE IF NOT EXISTS vagas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    area TEXT NOT NULL,
    descricao TEXT NOT NULL,
    chunk_index INTEGER DEFAULT 0,
    embedding VECTOR(1536), -- Dimensão compatível com text-embedding-3-small
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Comentário explicativo na tabela
COMMENT ON TABLE vagas IS 'Armazena descrições de vagas e seus respectivos embeddings para busca semântica.';

-- Criação de um índice IVFFlat para otimizar a busca vetorial
-- O operador vector_cosine_ops é usado para similaridade de cosseno
-- 'lists = 100' é uma recomendação inicial comum para conjuntos de dados médios
CREATE INDEX IF NOT EXISTS vagas_embedding_idx ON vagas 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Função PL/pgSQL para realizar a busca semântica via RPC (Remote Procedure Call)
-- Esta função será chamada pelo LangChain.js ou diretamente pelo Supabase Client
CREATE OR REPLACE FUNCTION match_vagas (
  query_embedding VECTOR(1536),
  match_count INT
)
RETURNS TABLE (
  id UUID,
  titulo TEXT,
  area TEXT,
  descricao TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    vagas.id,
    vagas.titulo,
    vagas.area,
    vagas.descricao,
    -- Calcula a similaridade: 1 - Distância de Cosseno (<=>)
    1 - (vagas.embedding <=> query_embedding) AS similarity
  FROM vagas
  ORDER BY vagas.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;