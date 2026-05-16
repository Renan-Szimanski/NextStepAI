-- supabase/migrations/005_criar_progresso.sql
-- Criação da tabela de acompanhamento de progresso do usuário
-- Autor: Dev B
-- Data: 2026-05-17

-- 1. Tabela progresso_usuario
CREATE TABLE IF NOT EXISTS progresso_usuario (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id              TEXT NOT NULL,                    -- ID do usuário (NextAuth)
    habilidade              TEXT NOT NULL,                    -- Nome da habilidade (ex: "React", "Python")
    nivel                   TEXT NOT NULL DEFAULT 'nao_iniciado',
                                                  -- Valores: 'nao_iniciado', 'iniciado', 'intermediario', 'avancado', 'dominado'
    porcentagem             INTEGER DEFAULT 0,                -- 0-100%
    notas                   TEXT,                             -- Anotações pessoais do usuário
    github_url              TEXT,                             -- URL do repositório GitHub relacionado (opcional)
    linguagens_detectadas   JSONB,                            -- { "JavaScript": 1200, "TypeScript": 800 }
    ultimo_acesso_github    TIMESTAMPTZ,                      -- Última vez que analisou o repositório
    criado_em               TIMESTAMPTZ DEFAULT now(),
    atualizado_em           TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT chk_nivel CHECK (nivel IN ('nao_iniciado', 'iniciado', 'intermediario', 'avancado', 'dominado')),
    CONSTRAINT chk_porcentagem CHECK (porcentagem >= 0 AND porcentagem <= 100)
);

-- 2. Índices
CREATE INDEX IF NOT EXISTS idx_progresso_usuario_id ON progresso_usuario(usuario_id);
CREATE INDEX IF NOT EXISTS idx_progresso_habilidade ON progresso_usuario(habilidade);
CREATE INDEX IF NOT EXISTS idx_progresso_nivel ON progresso_usuario(nivel);

-- 3. Row Level Security (RLS)
ALTER TABLE progresso_usuario ENABLE ROW LEVEL SECURITY;

-- Política: usuário só vê/gerencia seu próprio progresso
CREATE POLICY progresso_policy ON progresso_usuario
    USING (usuario_id = auth.uid()::text)
    WITH CHECK (usuario_id = auth.uid()::text);

-- 4. Trigger para manter atualizado_em
CREATE OR REPLACE FUNCTION atualizar_timestamp_progresso()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_progresso
    BEFORE UPDATE ON progresso_usuario
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_timestamp_progresso();

-- 5. Comentários
COMMENT ON TABLE progresso_usuario IS 'Acompanhamento do progresso do usuário em habilidades técnicas, com integração opcional ao GitHub.';
COMMENT ON COLUMN progresso_usuario.nivel IS 'Nível de proficiência: nao_iniciado, iniciado, intermediario, avancado, dominado';
COMMENT ON COLUMN progresso_usuario.linguagens_detectadas IS 'JSON com linguagens e linhas de código detectadas no repositório GitHub.';