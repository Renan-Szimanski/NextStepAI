-- 003_criar_historico.sql
-- Criação das tabelas de histórico de conversas e mensagens


-- 1. Tabela conversas
CREATE TABLE IF NOT EXISTS conversas (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id   TEXT NOT NULL,                     -- ID do usuário (NextAuth)
    titulo       TEXT NOT NULL,                     -- Primeiras palavras da 1ª mensagem (truncado)
    cargo_alvo   TEXT,                              -- Cargo identificado na conversa (opcional)
    criado_em    TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela mensagens
CREATE TABLE IF NOT EXISTS mensagens (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversa_id  UUID NOT NULL REFERENCES conversas(id) ON DELETE CASCADE,
    papel        TEXT NOT NULL CHECK (papel IN ('usuario', 'assistente')),
    conteudo     TEXT NOT NULL,
    criado_em    TIMESTAMPTZ DEFAULT now()
);

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_conversas_usuario_id ON conversas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_conversa_id ON mensagens(conversa_id);
CREATE INDEX IF NOT EXISTS idx_mensagens_criado_em ON mensagens(criado_em);

-- 4. Row Level Security (RLS)
ALTER TABLE conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens ENABLE ROW LEVEL SECURITY;

-- Política para conversas: usuário só vê/gerencia suas próprias conversas
-- O backend usa service_role key para bypass total, estas policies protegem acesso via client-side (futuro)
CREATE POLICY conversas_policy ON conversas
    USING (usuario_id = auth.uid()::text)
    WITH CHECK (usuario_id = auth.uid()::text);

-- Política para mensagens: acesso apenas se o usuário for dono da conversa relacionada
CREATE POLICY mensagens_policy ON mensagens
    USING (
        EXISTS (
            SELECT 1 FROM conversas
            WHERE conversas.id = mensagens.conversa_id
            AND conversas.usuario_id = auth.uid()::text
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM conversas
            WHERE conversas.id = mensagens.conversa_id
            AND conversas.usuario_id = auth.uid()::text
        )
    );

-- 5. Trigger para manter atualizado_em em conversas quando uma mensagem é inserida
CREATE OR REPLACE FUNCTION atualizar_timestamp_conversa()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversas
    SET atualizado_em = now()
    WHERE id = NEW.conversa_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_conversa
    AFTER INSERT ON mensagens
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_timestamp_conversa();