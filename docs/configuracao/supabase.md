# Configuração do Supabase

O **Supabase** é utilizado como:

- **Banco de dados principal** (PostgreSQL + pgvector)
- **Sistema de autenticação** (**Supabase Auth – e-mail/senha**)
- **Camada de autorização** via **Row Level Security (RLS)**

Este documento explica como configurar o projeto, aplicar as migrations, habilitar a extensão vetorial e definir as políticas de segurança.

---

# 1. Criar um projeto no Supabase

1. Acesse https://supabase.com
2. Clique em **New Project**
3. Configure:

- **Name:** `nextstepai`
- **Database Password:** senha forte
- **Region:** preferencialmente `South America (São Paulo)`
- **Pricing Plan:** **Free Tier**

4. Aguarde a criação do projeto.

---

# 2. Configurar autenticação (somente e-mail e senha)

O NextStepAI utiliza **exclusivamente autenticação por e-mail e senha**, gerenciada pelo **Supabase Auth**.

## Habilitar login por e-mail

1. Vá em:

**Authentication → Providers**

2. Mantenha **Email** habilitado.

3. Desative quaisquer providers sociais:

- GitHub
- Google
- Discord
- Azure
- Apple
- outros OAuth providers

## Configuração recomendada

Em:

**Authentication → Sign In / Providers → Email**

Configure:

| Configuração | Valor recomendado |
|---|---:|
| Enable Email Signup | `Enabled` |
| Confirm Email | `Enabled` |
| Secure Email Change | `Enabled` |
| Double Confirm Changes | `Enabled` |

### Templates de e-mail (opcional)

Você pode personalizar:

- confirmação de cadastro
- redefinição de senha
- magic link (não utilizado no projeto)

em:

**Authentication → Email Templates**

> O projeto **não utiliza OAuth social (GitHub/Google)** no MVP. Esses providers foram removidos por questões de estabilidade de sessão e redução de bugs durante o desenvolvimento acadêmico.

---

# 3. Obter as chaves de API

Vá em:

**Project Settings → API**

Copie:

| Dashboard Supabase | Variável |
|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| anon public key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| service_role key | `SUPABASE_SERVICE_ROLE_KEY` |

### Segurança

A chave:

```env
SUPABASE_SERVICE_ROLE_KEY
```

possui **acesso administrativo total** ao banco e ignora RLS.

Ela:

✅ deve ficar apenas no servidor

❌ nunca deve ir para o frontend

❌ nunca deve ser commitada

---

# 4. Aplicar migrations

As migrations devem ser executadas na ordem:

```text
001 → 005
```

pelo:

**SQL Editor → New Query**

---

## 4.1 Migration 001 — Habilitar pgvector

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Verifique:

```sql
SELECT * FROM pg_extension
WHERE extname = 'vector';
```

---

## 4.2 Migration 002 — Tabela de vagas + busca vetorial

```sql
CREATE TABLE IF NOT EXISTS vagas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    area TEXT NOT NULL,
    descricao TEXT NOT NULL,
    origem TEXT NOT NULL,
    chunk_index INTEGER DEFAULT 0,
    embedding VECTOR(384),
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS vagas_embedding_idx
ON vagas
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_vagas_origem
ON vagas(origem);

CREATE OR REPLACE FUNCTION match_vagas(
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
AS $$
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
$$;
```

---

## 4.3 Migration 003 — Conversas e mensagens

```sql
CREATE TABLE IF NOT EXISTS conversas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES auth.users(id),
    titulo TEXT NOT NULL,
    cargo_alvo TEXT,
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mensagens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversa_id UUID NOT NULL
        REFERENCES conversas(id)
        ON DELETE CASCADE,
    papel TEXT NOT NULL
        CHECK (papel IN ('usuario', 'assistente')),
    conteudo TEXT NOT NULL,
    criado_em TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_conversas_usuario_id
ON conversas(usuario_id);

CREATE INDEX idx_mensagens_conversa_id
ON mensagens(conversa_id);
```

### Trigger de atualização automática

```sql
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
```

---

## 4.4 Migration 004 — Currículos

```sql
CREATE TABLE IF NOT EXISTS curriculos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES auth.users(id),
    chave_r2 TEXT NOT NULL,
    nome_original TEXT NOT NULL,
    tamanho_bytes INTEGER NOT NULL,
    texto_extraido TEXT,
    dados_estruturados JSONB,
    carregado_em TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_curriculos_usuario_id
ON curriculos(usuario_id);
```

---

## 4.5 Migration 005 — Progresso do usuário

```sql
CREATE TABLE IF NOT EXISTS progresso_usuario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES auth.users(id),
    habilidade TEXT NOT NULL,
    nivel TEXT NOT NULL DEFAULT 'nao_iniciado',
    porcentagem INTEGER DEFAULT 0,
    notas TEXT,
    linguagens_detectadas JSONB,
    criado_em TIMESTAMPTZ DEFAULT now(),
    atualizado_em TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT chk_nivel
    CHECK (
        nivel IN (
            'nao_iniciado',
            'iniciado',
            'intermediario',
            'avancado',
            'dominado'
        )
    ),

    CONSTRAINT chk_porcentagem
    CHECK (
        porcentagem >= 0
        AND porcentagem <= 100
    )
);
```

---

# 5. Configurar RLS (Row Level Security)

Ative RLS:

```sql
ALTER TABLE conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE progresso_usuario ENABLE ROW LEVEL SECURITY;
```

---

## Conversas

```sql
CREATE POLICY conversas_select
ON conversas
FOR SELECT
USING (usuario_id = auth.uid());

CREATE POLICY conversas_insert
ON conversas
FOR INSERT
WITH CHECK (usuario_id = auth.uid());

CREATE POLICY conversas_update
ON conversas
FOR UPDATE
USING (usuario_id = auth.uid());

CREATE POLICY conversas_delete
ON conversas
FOR DELETE
USING (usuario_id = auth.uid());
```

---

## Mensagens

```sql
CREATE POLICY mensagens_policy
ON mensagens
FOR ALL
USING (
    EXISTS (
        SELECT 1
        FROM conversas
        WHERE conversas.id = mensagens.conversa_id
        AND conversas.usuario_id = auth.uid()
    )
);
```

---

## Currículos

```sql
CREATE POLICY curriculos_policy
ON curriculos
FOR ALL
USING (usuario_id = auth.uid());
```

---

## Progresso

```sql
CREATE POLICY progresso_policy
ON progresso_usuario
FOR ALL
USING (usuario_id = auth.uid());
```

---

## Vagas (somente leitura)

```sql
ALTER TABLE vagas ENABLE ROW LEVEL SECURITY;

CREATE POLICY vagas_select_policy
ON vagas
FOR SELECT
USING (true);
```

---

# 6. Popular vagas (seed)

```bash
npm run seed:test
```

ou:

```bash
npm run seed:prod
```

Os embeddings usam:

```text
Xenova/all-MiniLM-L6-v2
```

(384 dimensões)

---

# 7. Verificação pós-configuração

Teste o login:

1. Crie uma conta
2. Confirme o e-mail
3. Faça login
4. Faça upload de currículo
5. Inicie uma conversa

Teste RLS:

Um usuário **não deve conseguir acessar dados de outro**.

---

# 8. Segurança

- Use sempre RLS.
- Nunca exponha `service_role`.
- Não desabilite confirmação de e-mail em produção.
- Restrinja CORS da aplicação.

---

## Componentes do Supabase utilizados

| Recurso | Uso |
|---|---|
| PostgreSQL | Banco relacional |
| pgvector | Busca semântica |
| Auth (email/password) | Login |
| RLS | Isolamento de dados |
| Service Role Key | Operações server-side |

---

**Próximo passo:** configurar o ambiente local em `docs/desenvolvimento/setup-local.md`.