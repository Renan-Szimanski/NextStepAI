-- 004_criar_curriculos.sql
-- Criação da tabela de currículos dos usuários
-- Autor: Dev B
-- Data: 2025-01-XX

-- 1. Tabela curriculos
CREATE TABLE IF NOT EXISTS curriculos (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id          TEXT NOT NULL UNIQUE,              -- um currículo por usuário (substituição)
    nome_arquivo        TEXT NOT NULL,                     -- nome original do arquivo
    chave_r2            TEXT NOT NULL,                     -- chave no bucket R2
    tamanho_bytes       INTEGER NOT NULL,                  -- tamanho em bytes
    carregado_em        TIMESTAMPTZ DEFAULT now(),
    processado_em       TIMESTAMPTZ,                       -- preenchido após extração de texto
    texto_extraido      TEXT,                              -- texto bruto extraído do PDF
    dados_estruturados  JSONB                              -- resultado da tool estruturar_dados_curriculo
);

-- 2. Índices
CREATE INDEX IF NOT EXISTS idx_curriculos_usuario_id ON curriculos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_curriculos_processado_em ON curriculos(processado_em);

-- 3. Row Level Security (RLS)
ALTER TABLE curriculos ENABLE ROW LEVEL SECURITY;

-- Política: usuário só vê/gerencia seu próprio currículo
-- O backend usa service_role key para bypass total
CREATE POLICY curriculos_policy ON curriculos
    USING (usuario_id = auth.uid()::text)
    WITH CHECK (usuario_id = auth.uid()::text);

-- 4. Comentários para documentação
COMMENT ON TABLE curriculos IS 'Armazena currículos enviados pelos usuários, incluindo metadados e dados extraídos por IA.';
COMMENT ON COLUMN curriculos.usuario_id IS 'ID do usuário (NextAuth) – único por usuário.';
COMMENT ON COLUMN curriculos.chave_r2 IS 'Caminho do arquivo no bucket Cloudflare R2.';
COMMENT ON COLUMn curriculos.dados_estruturados IS 'JSON estruturado com nome, email, experiências, habilidades etc.';