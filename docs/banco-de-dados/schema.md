```markdown
# Esquema do Banco de Dados

O NextStepAI utiliza **PostgreSQL** com a extensão **pgvector** para busca semântica. O esquema é composto por 5 tabelas principais, organizadas em dois grupos: **histórico de conversas** e **dados do usuário**.

## Diagrama Entidade-Relacionamento (textual)

```
┌─────────────┐         ┌─────────────┐
│  conversas  │────────<│  mensagens  │
└─────────────┘ 1      N └─────────────┘
      │
      │
      ▼
┌─────────────┐         ┌─────────────┐
│  curriculos │         │progresso_   │
└─────────────┘         │  usuario    │
                        └─────────────┘

┌─────────────┐
│    vagas    │ (somente leitura, sem vínculo com usuário)
└─────────────┘
```

## Tabelas

### 1. `conversas` – Armazena os títulos e metadados das conversas

| Coluna | Tipo | Descrição | Restrições |
|--------|------|------------|-------------|
| `id` | UUID | PK, gerado automaticamente | `DEFAULT gen_random_uuid()` |
| `usuario_id` | TEXT | ID do usuário (vindo do NextAuth) | `NOT NULL` |
| `titulo` | TEXT | Título da conversa (gerado por IA ou primeira mensagem) | `NOT NULL` |
| `cargo_alvo` | TEXT | Cargo identificado na conversa (opcional) | - |
| `criado_em` | TIMESTAMPTZ | Data de criação | `DEFAULT now()` |
| `atualizado_em` | TIMESTAMPTZ | Última modificação | `DEFAULT now()` (atualizado por trigger) |

**Índices:**
- `idx_conversas_usuario_id` em `usuario_id`

**Trigger:** Após inserção em `mensagens`, atualiza `atualizado_em` da conversa correspondente.

### 2. `mensagens` – Armazena as mensagens de cada conversa

| Coluna | Tipo | Descrição | Restrições |
|--------|------|------------|-------------|
| `id` | UUID | PK | `DEFAULT gen_random_uuid()` |
| `conversa_id` | UUID | FK para `conversas(id)` | `NOT NULL`, `ON DELETE CASCADE` |
| `papel` | TEXT | Quem enviou a mensagem | `CHECK (papel IN ('usuario', 'assistente'))` |
| `conteudo` | TEXT | Texto da mensagem (Markdown) | `NOT NULL` |
| `criado_em` | TIMESTAMPTZ | Data da mensagem | `DEFAULT now()` |

**Índices:**
- `idx_mensagens_conversa_id` em `conversa_id`
- `idx_mensagens_criado_em` em `criado_em`

**Relacionamento:** `mensagens.conversa_id` → `conversas.id` (ON DELETE CASCADE)

### 3. `curriculos` – Armazena referências e conteúdo extraído dos PDFs

| Coluna | Tipo | Descrição | Restrições |
|--------|------|------------|-------------|
| `id` | UUID | PK | `DEFAULT gen_random_uuid()` |
| `usuario_id` | TEXT | ID do usuário | `NOT NULL` |
| `chave_r2` | TEXT | Caminho do objeto no Cloudflare R2 | `NOT NULL` |
| `nome_original` | TEXT | Nome original do arquivo | `NOT NULL` |
| `tamanho_bytes` | INTEGER | Tamanho em bytes | `NOT NULL` |
| `texto_extraido` | TEXT | Texto bruto extraído do PDF | - |
| `dados_estruturados` | JSONB | Dados estruturados (nome, experiências, habilidades, idiomas) | - |
| `carregado_em` | TIMESTAMPTZ | Data do upload | `DEFAULT now()` |

**Índices:**
- `idx_curriculos_usuario_id` em `usuario_id`

**Formato do JSONB (`dados_estruturados`):**

```json
{
  "nome": "Nome do Usuário",
  "email": "usuario@example.com",
  "telefone": "(11) 99999-9999",
  "formacao": ["Ciência da Computação - Universidade X (2022-2026)"],
  "experiencias": [
    {
      "cargo": "Estagiário de QA",
      "empresa": "Empresa Y",
      "periodo": "2024-2025",
      "descricao": "Testes manuais e automatizados..."
    }
  ],
  "habilidades": ["Cypress", "Selenium", "Java", "Git"],
  "idiomas": ["Inglês Avançado", "Espanhol Básico"],
  "resumo": "Profissional com experiência em..."
}
```

### 4. `progresso_usuario` – Acompanhamento de habilidades estudadas

| Coluna | Tipo | Descrição | Restrições |
|--------|------|------------|-------------|
| `id` | UUID | PK | `DEFAULT gen_random_uuid()` |
| `usuario_id` | TEXT | ID do usuário | `NOT NULL` |
| `habilidade` | TEXT | Nome da habilidade (ex.: "React", "Cypress") | `NOT NULL` |
| `nivel` | TEXT | Nível de proficiência | `DEFAULT 'nao_iniciado'`<br>`CHECK` (5 valores) |
| `porcentagem` | INTEGER | Progresso numérico (0-100) | `DEFAULT 0`, `CHECK (>=0 AND <=100)` |
| `notas` | TEXT | Anotações pessoais do usuário | - |
| `github_url` | TEXT | URL do repositório analisado | - |
| `linguagens_detectadas` | JSONB | Mapa de linguagens e linhas de código | Ex.: `{"JavaScript": 1200, "TypeScript": 800}` |
| `ultimo_acesso_github` | TIMESTAMPTZ | Data da última análise do repositório | - |
| `criado_em` | TIMESTAMPTZ | Data do registro | `DEFAULT now()` |
| `atualizado_em` | TIMESTAMPTZ | Data da última atualização | `DEFAULT now()` (atualizado por trigger) |

**Valores permitidos para `nivel`:**
- `'nao_iniciado'` (0%)
- `'iniciado'` (1-25%)
- `'intermediario'` (26-75%)
- `'avancado'` (76-99%)
- `'dominado'` (100%)

**Índices:**
- `idx_progresso_usuario_id` em `usuario_id`
- `idx_progresso_habilidade` em `habilidade`
- `idx_progresso_nivel` em `nivel`

### 5. `vagas` – Base de conhecimento para busca semântica (somente leitura)

| Coluna | Tipo | Descrição | Restrições |
|--------|------|------------|-------------|
| `id` | UUID | PK | `DEFAULT gen_random_uuid()` |
| `titulo` | TEXT | Título da vaga | `NOT NULL` |
| `area` | TEXT | Área da vaga (ex.: "Back-end", "QA") | `NOT NULL` |
| `descricao` | TEXT | Descrição completa (requisitos, responsabilidades) | `NOT NULL` |
| `origem` | TEXT | `'real'` (raspada) ou `'sintetica'` (gerada por IA) | `NOT NULL` |
| `chunk_index` | INTEGER | Índice do chunk (para vagas longas) | `DEFAULT 0` |
| `embedding` | VECTOR(384) | Vetor de embedding (modelo MiniLM) | - |
| `criado_em` | TIMESTAMPTZ | Data de inserção | `DEFAULT now()` |

**Índices:**
- `vagas_embedding_idx` – IVFFlat para busca de similaridade de cosseno (lists = 100)
- `idx_vagas_origem` – filtro por origem

**Função RPC associada:** `match_vagas(query_embedding, match_count, match_threshold)`

## Row Level Security (RLS)

Todas as tabelas de dados do usuário têm RLS habilitado com as seguintes políticas:

| Tabela | Política | Condição |
|--------|----------|-----------|
| `conversas` | `conversas_policy` | `usuario_id = auth.uid()::text` (SELECT/INSERT/UPDATE/DELETE) |
| `mensagens` | `mensagens_policy` | Existe conversa do mesmo usuário |
| `curriculos` | `curriculos_policy` | `usuario_id = auth.uid()::text` |
| `progresso_usuario` | `progresso_policy` | `usuario_id = auth.uid()::text` |
| `vagas` | `vagas_select_policy` | `FOR SELECT USING (true)` (qualquer usuário autenticado pode ler) |

**Nota:** As API routes utilizam a `service_role key` para bypass RLS em operações como salvar mensagens (evita expor permissões de escrita ao cliente).

## Relacionamentos e Integridade Referencial

- `mensagens.conversa_id` → `conversas.id` com `ON DELETE CASCADE` (remover mensagens ao deletar conversa).
- As demais tabelas não possuem chaves estrangeiras por simplicidade (o `usuario_id` é referencial, mas não há FK para tabela de usuários porque o Supabase Auth gerencia usuários fora do esquema público).

## Considerações de Performance

- Índice IVFFlat em `vagas.embedding` otimizado para ~1000 registros (lists = 100). Para crescimento futuro, ajustar com `ALTER INDEX vagas_embedding_idx SET (lists = 500);`
- Índices em `usuario_id` em tabelas de histórico garantem consultas rápidas por usuário.
- `ON DELETE CASCADE` evita órfãos em `mensagens`.

---

**Próximo passo:** Consulte [migrations.md](migrations.md) para o histórico de versões do esquema.
```