# Configuração de Ambiente – Variáveis de Ambiente

Este documento lista todas as variáveis de ambiente necessárias para executar o **NextStepAI** localmente ou em produção, explica onde obtê-las e fornece um exemplo completo de arquivo `.env.local`.

## Variáveis Obrigatórias

### Supabase (Banco de Dados + Autenticação)

| Variável | Descrição | Como obter |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL pública do projeto Supabase | Dashboard → **Project Settings → API → Project URL** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anônima pública (cliente) | Dashboard → **API → anon/public key** |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave `service_role` (servidor) — **nunca exponha no cliente** | Dashboard → **API → service_role key** |

> ⚠️ **Importante:** `SUPABASE_SERVICE_ROLE_KEY` deve ser utilizada **apenas no backend** (API Routes, Server Actions e jobs internos). Nunca exponha essa chave ao frontend.

---

### DeepSeek (LLM principal)

| Variável | Descrição | Como obter |
|---|---|---|
| `DEEPSEEK_API_KEY` | Chave da API do modelo `deepseek-chat` | https://platform.deepseek.com → **Create API Key** |

#### Configuração padrão

- **Modelo principal:** `deepseek-chat`
- **Fallback opcional:** `GROQ_API_KEY`
- **Uso:** análise de currículo, gap analysis, roadmap personalizado e geração de respostas do mentor.

---

### Cloudflare R2 (Armazenamento de PDFs)

| Variável | Descrição | Como obter |
|---|---|---|
| `R2_ENDPOINT` | Endpoint do bucket R2 | Cloudflare → **R2 → Overview → Endpoint** |
| `R2_ACCESS_KEY_ID` | Access Key ID | **Manage R2 API Tokens → Create Token** |
| `R2_SECRET_ACCESS_KEY` | Secret Key correspondente | Gerada junto ao token |
| `R2_BUCKET_NAME` | Nome do bucket | Cloudflare → **Buckets** |

#### Configuração recomendada

Crie um bucket chamado:

```txt
nextstepai-curriculos
```

Recomenda-se manter **leitura pública desabilitada**, pois os arquivos são acessados exclusivamente via **presigned URLs**.

---

### Autenticação (E-mail + Senha)

| Variável | Descrição | Como obter |
|---|---|---|
| `NEXTAUTH_URL` | URL base da aplicação | Defina conforme ambiente |
| `NEXTAUTH_SECRET` | Segredo para assinatura da sessão/JWT | Gere localmente com OpenSSL |

#### Gerando um segredo seguro

```bash
openssl rand -base64 32
```

#### Configuração

Ambiente local:

```txt
http://localhost:3000
```

Ambiente de produção:

```txt
https://seudominio.com
```

> O **NextStepAI** utiliza autenticação **somente por e-mail e senha**. Providers externos (GitHub, Google etc.) foram removidos do fluxo de autenticação.

---

### Tavily Search (Recursos Educacionais)

| Variável | Descrição | Como obter |
|---|---|---|
| `TAVILY_API_KEY` | Chave para busca web | https://app.tavily.com → **API Key** |

#### Uso

A tool `buscar_recursos_educacionais` utiliza a Tavily para buscar:

- cursos;
- documentações;
- tutoriais;
- materiais de estudo atualizados;
- recursos alinhados ao roadmap.

O plano gratuito costuma ser suficiente para desenvolvimento e testes.

---

## Variáveis Opcionais

| Variável | Valor padrão | Descrição |
|---|---|---|
| `GROQ_API_KEY` | — | Chave do modelo fallback (Llama 3) |
| `R2_PRESIGN_EXPIRATION_SECONDS` | `3600` | Tempo de expiração das URLs assinadas |
| `MAX_UPLOAD_SIZE_MB` | `5` | Tamanho máximo permitido para upload de PDFs |

---

## Exemplo de `.env.local`

```bash
# ------------------------------------------------------------------------------
# NextStepAI - Ambiente de Desenvolvimento Local
# Copie este arquivo para .env.local e substitua os valores
# ------------------------------------------------------------------------------

# ==============================================================================
# SUPABASE
# ==============================================================================

NEXT_PUBLIC_SUPABASE_URL=https://seuprojeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...

# ==============================================================================
# DEEPSEEK
# ==============================================================================

DEEPSEEK_API_KEY=sk-...

# ==============================================================================
# CLOUDFLARE R2
# ==============================================================================

R2_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=abc123...
R2_SECRET_ACCESS_KEY=xyz789...
R2_BUCKET_NAME=nextstepai-curriculos

# ==============================================================================
# AUTENTICAÇÃO
# ==============================================================================

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=umSegredoMuitoForte32Bytes

# ==============================================================================
# TAVILY
# ==============================================================================

TAVILY_API_KEY=tvly-...

# ==============================================================================
# OPCIONAL - FALLBACK
# ==============================================================================

# GROQ_API_KEY=gsk_...

# ==============================================================================
# CONFIGURAÇÕES OPCIONAIS
# ==============================================================================

R2_PRESIGN_EXPIRATION_SECONDS=3600
MAX_UPLOAD_SIZE_MB=5
```

---

## Verificação de Configuração

Após configurar o `.env.local`, execute alguns testes básicos para validar a infraestrutura.

### Teste de extração de PDF

```bash
npm run test:extrair-pdf
```

Verifica:

- conexão com o Cloudflare R2;
- permissões do bucket;
- download do arquivo;
- extração correta do texto do currículo.

### Teste de busca vetorial

```bash
npm run test:vetor
```

Verifica:

- conexão com Supabase;
- extensão `pgvector`;
- funcionamento da busca semântica de vagas.

---

## Segurança

### Nunca faça commit do `.env.local`

Certifique-se de que o `.gitignore` contenha:

```gitignore
.env.local
.env
.env.*
```

### Produção (Vercel)

Adicione todas as variáveis no painel do projeto:

```txt
Project Settings → Environment Variables
```

### Variáveis sensíveis

As seguintes variáveis **não devem aparecer em logs nem ser expostas ao cliente**:

- `SUPABASE_SERVICE_ROLE_KEY`
- `R2_SECRET_ACCESS_KEY`
- `NEXTAUTH_SECRET`
- `DEEPSEEK_API_KEY`

---

## Solução de Problemas Comuns

| Erro | Possível causa | Solução |
|---|---|---|
| `Supabase client error: 401` | Service Role inválida | Gere uma nova chave no painel do Supabase |
| `R2: Access Denied` | Credenciais R2 incorretas | Verifique permissões (`Object Read + Write`) |
| `DeepSeek API: 401` | API key inválida | Gere nova chave no painel da DeepSeek |
| `JWT malformed` | `NEXTAUTH_SECRET` inválido | Gere um novo segredo com 32+ bytes |
| `Upload failed: 403` | Presigned URL expirada | Gere nova URL ou aumente o tempo de expiração |

---

## Próximos Passos

Após configurar as variáveis:

### Setup local

```txt
docs/desenvolvimento/setup-local.md
```

### Deploy

```txt
docs/configuracao/deploy.md
```

---

**Última atualização:** Maio de 2026