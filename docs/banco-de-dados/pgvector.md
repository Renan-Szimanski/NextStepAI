```markdown
# Busca Vetorial com pgvector

O NextStepAI utiliza a extensão **pgvector** do PostgreSQL para armazenar e consultar **embeddings** de vagas, permitindo busca semântica por similaridade de cosseno. Este documento explica a arquitetura, a geração de embeddings, os índices e a função de busca utilizada pelo agente.

## 1. Extensão pgvector

Pgvector é uma extensão oficial do PostgreSQL que adiciona suporte a tipos de dados vetoriais e operadores de相似dade. No NextStepAI, a extensão é habilitada na migration `001_habilitar_pgvector.sql`:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Após habilitada, o tipo `VECTOR(384)` está disponível – usado na tabela `vagas` para armazenar embeddings de 384 dimensões.

## 2. Modelo de Embeddings

**Modelo escolhido:** `Xenova/all-MiniLM-L6-v2` (via Transformers.js / HuggingFace)

- **Dimensão:** 384 floats
- **Tamanho aproximado por embedding:** ~1,5 KB (384 * 4 bytes)
- **Qualidade:** bom equilíbrio entre precisão semântica e custo computacional
- **Suporte:** nativo no LangChain (`HuggingFaceEmbeddings`) e no script de seed

### Geração de embeddings no backend

O embedding é gerado no servidor (ou script) usando o pacote `@xenova/transformers`:

```typescript
import { pipeline } from '@xenova/transformers';

const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
const result = await embedder(texto, { pooling: 'mean', normalize: true });
const embedding = Array.from(result.data); // Float32Array de 384 elementos
```

O vetor resultante já está normalizado (norma L2 = 1), o que permite usar diretamente a distância de cosseno (`<=>`).

## 3. Tabela `vagas` e coluna `embedding`

```sql
CREATE TABLE vagas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    area TEXT NOT NULL,
    descricao TEXT NOT NULL,
    origem TEXT NOT NULL,
    chunk_index INTEGER DEFAULT 0,
    embedding VECTOR(384),
    criado_em TIMESTAMPTZ DEFAULT NOW()
);
```

- A coluna `embedding` aceita vetores de exatamente 384 dimensões. Valores com dimensão incorreta geram erro.
- Índice IVFFlat otimiza consultas de similaridade.

## 4. Índice IVFFlat

```sql
CREATE INDEX vagas_embedding_idx ON vagas
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

**Parâmetros:**
- `lists = 100` – número de listas (clusters) no índice. Para ~1000 registros, 100 listas é adequado. Para mais de 10 mil registros, aumentar para `lists = sqrt(n_registros)`.
- `vector_cosine_ops` – usa distância de cosseno (`<=>`).

**Como funciona:** O IVFFlat particiona os vetores em clusters. A busca percorre apenas algumas listas mais próximas, reduzindo drasticamente o tempo de consulta. Para recuperação exata (menor latência), pode-se usar `hnsw` (não implementado por simplicidade).

**Manutenção:** Após inserir muitas vagas, executar `REINDEX INDEX vagas_embedding_idx;` para otimizar o índice.

## 5. Função `match_vagas` (busca semântica)

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

**Operador `<=>`** : distância de cosseno (range 0 a 2). Quanto menor, mais similar.  
**Conversão para similaridade:** `similarity = 1 - distance` (range 0 a 1).

**Exemplo de uso na tool `consultar_banco_vetorial` (backend):**

```typescript
const { data: vagas } = await supabaseAdmin.rpc('match_vagas', {
  query_embedding: embedding,  // vetor de 384 floats
  match_count: 3,
  match_threshold: 0.5
});
```

Retorna até 3 vagas com similaridade > 0.5, ordenadas da mais similar à menos similar.

## 6. Estratégia de Busca no Agente

O agente Pathfinder chama `consultar_banco_vetorial` com uma `query` em linguagem natural (ex.: "QA com Cypress e SQL"). O backend:

1. Gera o embedding da `query` usando o mesmo modelo.
2. Chama `match_vagas` com `match_count = 3` e `match_threshold = 0.5`.
3. Retorna um JSON estruturado com os resultados.
4. Se não houver resultados ou ocorrer timeout/erro, retorna fallback (conhecimento geral).

**Por que threshold 0.5?**  
- Garante que vagas com pouca relevância (similaridade baixa) sejam ignoradas, evitando ruído no contexto do LLM.
- Valor empírico baseado em testes com 200 vagas.

## 7. Populando a Tabela `vagas` (Seed)

O script `scripts/popular-banco.ts` lê arquivos JSON (`vagas_reais.json` e `vagas_sinteticas.json`), gera embeddings e insere no Supabase.

**Fluxo do seed:**

1. Para cada vaga, concatenar `titulo` + `area` + `descricao` em um único texto.
2. Se o texto ultrapassar 5000 caracteres, fazer chunking (dividir em partes menores, cada uma com seu próprio embedding).
3. Gerar embedding usando `Xenova/all-MiniLM-L6-v2`.
4. Inserir linha na tabela `vagas` com `origem = 'real'` ou `'sintetica'`.

**Comandos disponíveis:**

```bash
npm run seed:test   # 10 vagas sintéticas (rápido)
npm run seed        # todas as vagas (com confirmação)
```

## 8. Performance e Limites

| Métrica | Valor |
|---------|-------|
| Tamanho médio do embedding | 1,5 KB |
| Tempo de geração de embedding (CPU) | ~100 ms por vaga (depende do hardware) |
| Tempo de consulta (match_vagas) | ~20-50 ms (com índice IVFFlat) |
| Número de vagas suportado | Até 10.000 com boa performance (plano gratuito Supabase) |

**Gargalos conhecidos:**
- A geração de embeddings durante o seed pode ser lenta em CPUs fracas. Para produção, recomenda-se gerar embeddings em lote com GPU ou serviço externo (não implementado).
- O índice IVFFlat degrada após muitas inserções; executar `REINDEX` periodicamente.

## 9. Fallback e Tratamento de Erros

Conforme documentado em [fallback.md](../agentes/fallback.md), a tool `consultar_banco_vetorial` possui **timeout de 15 segundos** e, em caso de falha, retorna JSON de fallback:

```json
{
  "erro": true,
  "tipoErro": "timeout",
  "mensagem": "A busca no banco de vagas demorou demais... Continue a resposta usando seu conhecimento geral."
}
```

Isso evita que a conversa trave completamente se o banco ou a API de embedding estiverem lentos.

## 10. Monitoramento e Logs

- Logs da tool incluem `[Tool: consultar_banco_vetorial]` com detalhes da query e número de resultados.
- No Supabase, o log de consultas pode ser visualizado em **Database → Query Performance**.
- Para depuração local, execute `npm run test:vetor` para testar a função `match_vagas` com uma query fixa.

---

**Próximo passo:** Consulte [para-usuarios.md](../guias/para-usuarios.md) para o manual de uso da aplicação.
