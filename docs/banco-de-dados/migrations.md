```markdown
# Migrações do Banco de Dados

O esquema do banco de dados do NextStepAI é versionado através de **5 migrações SQL** (numeradas de `001` a `005`). Elas devem ser aplicadas **em ordem crescente** no projeto Supabase (via SQL Editor) ou no ambiente local.

Este documento descreve o propósito e o conteúdo de cada migration.

## Ordem de aplicação

1. `001_habilitar_pgvector.sql`
2. `002_criar_vagas.sql`
3. `003_criar_historico.sql`
4. `004_criar_curriculos.sql`
5. `005_criar_progresso.sql`

---

## Migration 001 – Habilitar extensão pgvector

**Arquivo:** `supabase/migrations/001_habilitar_pgvector.sql`

**Objetivo:** Ativar a extensão `vector` no PostgreSQL, necessária para armazenar e pesquisar embeddings de 384 dimensões (modelo HuggingFace MiniLM).

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

- Execução segura (não falha se a extensão já existir).
- Deve ser aplicada antes de qualquer tabela que utilize o tipo `VECTOR`.

---

## Migration 002 – Criar tabela `vagas` e função de busca

**Arquivo:** `supabase/migrations/002_criar_vagas.sql`

**Objetivo:** Criar a tabela que armazena as vagas (reais e sintéticas) e seus embeddings, além da função `match_vagas` para busca por similaridade de cosseno.

### Estrutura da tabela `vagas`

| Coluna | Tipo | Descrição |
|--------|------|------------|
| `id` | UUID | PK, gerado automaticamente |
| `titulo` | TEXT | Título da vaga (ex.: "Engenheiro de Software Sênior") |
| `area` | TEXT | Categoria/área da vaga |
| `descricao` | TEXT | Descrição completa (requisitos, responsabilidades) |
| `origem` | TEXT | `'real'` ou `'sintetica'` |
| `chunk_index` | INTEGER | Índice do chunk (para dividir descrições longas) |
| `embedding` | VECTOR(384) | Vetor gerado pelo modelo MiniLM |
| `criado_em` | TIMESTAMPTZ | Data de inserção |

### Índices

- `vagas_embedding_idx`: índice IVFFlat na coluna `embedding` para busca rápida (cosine distance).
- `idx_vagas_origem`: índice simples para filtrar por origem.

### Função `match_vagas`

```sql
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

- **Parâmetros:** embedding de consulta, número de resultados, limiar de similaridade (padrão 0.5).
- **Retorno:** UUID, título, área, descrição e similaridade (0 a 1).
- **Operador `<=>`** : distância de cosseno (quanto menor, mais similar).

---

## Migration 003 – Criar tabelas de histórico (`conversas`, `mensagens`)

**Arquivo:** `supabase/migrations/003_criar_historico.sql`

**Objetivo:** Implementar o armazenamento das conversas e mensagens dos usuários, com RLS (Row Level Security) e trigger de atualização de timestamp.

### Tabela `conversas`

| Coluna | Tipo | Descrição |
|--------|------|------------|
| `id` | UUID | PK |
| `usuario_id` | TEXT | ID do usuário (NextAuth) |
| `titulo` | TEXT | Título gerado por IA ou primeira mensagem |
| `cargo_alvo` | TEXT | Cargo identificado (opcional) |
| `criado_em` | TIMESTAMPTZ | Data de criação |
| `atualizado_em` | TIMESTAMPTZ | Última modificação |

### Tabela `mensagens`

| Coluna | Tipo | Descrição |
|--------|------|------------|
| `id` | UUID | PK |
| `conversa_id` | UUID | FK para `conversas(id)` com `ON DELETE CASCADE` |
| `papel` | TEXT | `'usuario'` ou `'assistente'` |
| `conteudo` | TEXT | Texto da mensagem (Markdown) |
| `criado_em` | TIMESTAMPTZ | Data da mensagem |

### Índices

- `idx_conversas_usuario_id`
- `idx_mensagens_conversa_id`
- `idx_mensagens_criado_em`

### RLS (habilita e cria políticas)

- `conversas_policy`: usuário só vê/gerencia suas próprias conversas (`usuario_id = auth.uid()`)
- `mensagens_policy`: acesso condicionado à existência da conversa correspondente e pertencimento do usuário.

### Trigger `atualizar_timestamp_conversa`

Atualiza o campo `atualizado_em` da conversa sempre que uma nova mensagem é inserida.

---

## Migration 004 – Criar tabela `curriculos`

**Arquivo:** `supabase/migrations/004_criar_curriculos.sql`

**Objetivo:** Armazenar os currículos enviados pelos usuários (metadados, texto extraído e dados estruturados).

### Estrutura

| Coluna | Tipo | Descrição |
|--------|------|------------|
| `id` | UUID | PK |
| `usuario_id` | TEXT | ID do usuário |
| `chave_r2` | TEXT | Caminho do objeto no Cloudflare R2 |
| `nome_original` | TEXT | Nome original do PDF |
| `tamanho_bytes` | INTEGER | Tamanho em bytes |
| `texto_extraido` | TEXT | Texto bruto extraído via `unpdf` |
| `dados_estruturados` | JSONB | Dados estruturados (nome, experiências, habilidades, idiomas) |
| `carregado_em` | TIMESTAMPTZ | Data do upload |

### Índices

- `idx_curriculos_usuario_id`

### RLS

Política `curriculos_policy`: usuário só acessa seu próprio currículo (`usuario_id = auth.uid()`).

---

## Migration 005 – Criar tabela `progresso_usuario`

**Arquivo:** `supabase/migrations/005_criar_progresso.sql`

**Objetivo:** Registrar o progresso do usuário em habilidades técnicas, com suporte a análise de repositórios GitHub.

### Estrutura

| Coluna | Tipo | Descrição |
|--------|------|------------|
| `id` | UUID | PK |
| `usuario_id` | TEXT | ID do usuário |
| `habilidade` | TEXT | Nome da habilidade (ex.: "React") |
| `nivel` | TEXT | `nao_iniciado`, `iniciado`, `intermediario`, `avancado`, `dominado` |
| `porcentagem` | INTEGER | 0-100 |
| `notas` | TEXT | Anotações pessoais |
| `github_url` | TEXT | URL do repositório analisado |
| `linguagens_detectadas` | JSONB | Mapa de linguagens e linhas de código |
| `ultimo_acesso_github` | TIMESTAMPTZ | Data da última análise do repositório |
| `criado_em` | TIMESTAMPTZ | Data do registro |
| `atualizado_em` | TIMESTAMPTZ | Data da última atualização |

### Índices

- `idx_progresso_usuario_id`
- `idx_progresso_habilidade`
- `idx_progresso_nivel`

### RLS

Política `progresso_policy`: usuário só acessa seus próprios registros.

### Trigger `atualizar_timestamp_progresso`

Atualiza `atualizado_em` antes de cada atualização (UPDATE).

---

## Como aplicar as migrações

### Ambiente de produção (Supabase remoto)

1. Acesse o dashboard do Supabase → **SQL Editor**.
2. Crie uma nova consulta e cole o conteúdo de cada migration (em ordem).
3. Execute cada uma separadamente (ou todas de uma vez, respeitando a ordem).
4. Verifique se a extensão `vector` foi criada: `SELECT * FROM pg_extension WHERE extname = 'vector';`

### Ambiente local (Docker)

Se estiver usando o Supabase local via CLI, coloque os arquivos SQL na pasta `supabase/migrations/` (nomeados no padrão `{timestamp}_nome.sql`). O comando `supabase db reset` aplica todas as migrações automaticamente.

## Verificação pós-migração

Execute o seguinte SQL para garantir que todas as tabelas e funções foram criadas:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('conversas', 'mensagens', 'curriculos', 'progresso_usuario', 'vagas');

SELECT proname FROM pg_proc WHERE proname = 'match_vagas';
```

Ambas as consultas devem retornar 5 linhas e 1 linha, respectivamente.

## Observações de manutenção

- **Nunca** alterar uma migration já aplicada em produção. Crie uma nova migration (006) para mudanças no esquema.
- A migration 002 cria a função `match_vagas`. Se for necessário modificar seus parâmetros, use `CREATE OR REPLACE` em uma migration posterior.

---

**Próximo passo:** Consulte [pgvector.md](pgvector.md) para detalhes sobre a busca semântica.