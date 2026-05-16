# Rotas da API (Backend)

O NextStepAI expõe **10 endpoints principais**, implementados como **API Routes do Next.js App Router**.

A maioria exige autenticação via **NextAuth** e utiliza runtime **Node.js** (não Edge Runtime), devido a:

- streaming SSE;
- integração com Supabase;
- acesso ao Cloudflare R2;
- bibliotecas de parsing PDF;
- criptografia e autenticação.

---

# Visão Geral dos Endpoints

| Método | Rota | Auth | Descrição |
|---|---|---:|---|
| `POST` | `/api/mensagens` | ✅ | Chat com streaming SSE (Pathfinder) |
| `POST` | `/api/planos/salvar-mensagem` | ✅ | Persiste mensagens |
| `GET` | `/api/planos/[id]` | ✅ | Obtém conversa específica *(não implementado)* |
| `DELETE` | `/api/planos/[id]` | ✅ | Remove conversa *(não implementado)* |
| `GET` | `/api/curriculo` | ✅ | Obtém currículo atual |
| `POST` | `/api/curriculo/presign` | ✅ | Gera URL assinada de upload |
| `POST` | `/api/curriculo` | ✅ | Registra currículo após upload |
| `DELETE` | `/api/curriculo` | ✅ | Remove currículo |
| `POST` | `/api/planos/gerar-titulo` | ✅ | Gera título automático |
| `POST` | `/api/progresso` | ✅ | Gerencia progresso |
| `GET` / `POST` | `/api/auth/*` | ❌ | Rotas do NextAuth |

---

# 1. `POST /api/mensagens`

Chat principal com **streaming SSE**, responsável por comunicar o frontend com o agente Pathfinder.

## Arquivo

```txt
src/app/api/mensagens/route.ts
```

## Runtime

```ts
export const runtime = 'nodejs';
```

## Timeout

| Ambiente | Limite |
|---|---:|
| Vercel Hobby | 10s |
| Vercel Pro | 60s |

---

## Requisição

### Headers

```http
Content-Type: application/json
```

A autenticação é feita via **cookie do NextAuth**.

### Body

```ts
{
  messages: Mensagem[];
  sessionId: string;
}
```

### Tipo `Mensagem`

```ts
type Mensagem = {
  id: string;
  papel:
    | 'user'
    | 'assistant'
    | 'tool'
    | 'system';

  conteudo: string;
  timestamp: number;

  toolName?: string;
};
```

---

## Resposta (SSE)

A rota retorna:

```http
Content-Type: text/event-stream
```

Cada evento segue:

```txt
data: {...}

```

### Tipos de evento

| `type` | Campos extras | Descrição |
|---|---|---|
| `token` | `content` | Fragmento da resposta |
| `tool_call` | `name` | Tool iniciada |
| `tool_result` | `name`, `success` | Tool finalizada |
| `error` | `message` | Erro fatal |
| `done` | — | Final do stream |

### Exemplo

```txt
data: {
  "type":"tool_call",
  "name":"extrair_texto_pdf"
}

data: {
  "type":"token",
  "content":"Olá!"
}

data: {
  "type":"token",
  "content":"Vou analisar seu currículo."
}

data: {
  "type":"tool_result",
  "name":"extrair_texto_pdf",
  "success":true
}

data: {
  "type":"done"
}
```

---

## Comportamento interno

- valida sessão com `auth()`;
- retorna `401` sem autenticação;
- valida payload via **Zod**;
- cria um `ReadableStream`;
- consome `processarMensagem()`;
- usa `req.signal` para abortar desconexões;
- **não persiste mensagens**.

Persistência ocorre no frontend via:

```txt
/api/planos/salvar-mensagem
```

---

# 2. `POST /api/planos/salvar-mensagem`

Persiste mensagens no Supabase.

## Arquivo

```txt
src/app/api/planos/salvar-mensagem/route.ts
```

## Autenticação

✅ Obrigatória

---

## Requisição

```ts
{
  conversaId: string | null;

  papel:
    | 'usuario'
    | 'assistente';

  conteudo: string;

  primeiraMsgTitulo?: string;

  cargoAlvo?: string;
}
```

---

## Resposta

```json
{
  "conversaId": "uuid",
  "mensagemId": "uuid"
}
```

---

## Comportamento

Se `conversaId === null`:

1. cria conversa;
2. gera título inicial;
3. salva primeira mensagem.

Depois:

- insere em `mensagens`;
- atualiza `atualizado_em`;
- usa `SUPABASE_SERVICE_ROLE_KEY`.

---

# 3. `GET /api/curriculo`

Obtém o currículo atual do usuário.

## Arquivo

```txt
src/app/api/curriculo/route.ts
```

(Método `GET`)

---

## Resposta

```json
{
  "curriculo": {
    "id": "uuid",
    "nomeOriginal": "curriculo.pdf",
    "urlLeitura": "https://...",
    "tamanhoBytes": 120000,
    "carregadoEm": "2026-05-16T00:00:00Z"
  }
}
```

Ou:

```json
{
  "curriculo": null
}
```

---

## Comportamento

- busca currículo do usuário;
- gera **presigned URL**;
- validade: **1 hora**;
- retorna `null` se inexistente.

---

# 4. `POST /api/curriculo/presign`

Gera URL assinada para upload no **Cloudflare R2**.

## Arquivo

```txt
src/app/api/curriculo/presign/route.ts
```

---

## Requisição

```json
{
  "nomeArquivo": "curriculo.pdf",
  "tamanhoBytes": 400000
}
```

---

## Resposta

```json
{
  "urlUpload": "https://...",
  "chave": "curriculos/userId/file.pdf"
}
```

---

## Validações

### Tamanho máximo

```txt
5 MB
```

### Extensão obrigatória

```txt
.pdf
```

### Sanitização

Remove:

- acentos;
- espaços inválidos;
- caracteres especiais.

---

# 5. `POST /api/curriculo`

Registra o currículo após upload.

## Arquivo

```txt
src/app/api/curriculo/route.ts
```

(Método `POST`)

---

## Requisição

```json
{
  "chave": "curriculos/...",
  "nomeOriginal": "curriculo.pdf",
  "tamanhoBytes": 123456
}
```

---

## Resposta

```json
{
  "id": "uuid",
  "mensagem": "Currículo registrado com sucesso"
}
```

---

## Comportamento

- registra no Supabase;
- associa ao usuário;
- remove currículo antigo;
- **não realiza upload**.

O upload já aconteceu diretamente no R2.

---

# 6. `DELETE /api/curriculo`

Remove currículo do usuário.

## Arquivo

```txt
src/app/api/curriculo/route.ts
```

(Método `DELETE`)

---

## Resposta

```json
{
  "mensagem": "Currículo removido com sucesso"
}
```

---

## Comportamento

1. localiza registro;
2. remove do R2;
3. remove do banco;
4. retorna confirmação.

---

# 7. `POST /api/planos/gerar-titulo`

Gera automaticamente um título da conversa.

## Arquivo

```txt
src/app/api/planos/gerar-titulo/route.ts
```

---

## Requisição

```json
{
  "conversaId": "uuid"
}
```

---

## Resposta

```json
{
  "titulo": "Roadmap para QA"
}
```

---

## Comportamento

- busca primeira mensagem;
- chama Deepseek;
- limita a:

```txt
máx. 6 palavras
```

- atualiza coluna `titulo`.

---

# 8. `POST /api/progresso`

Gerencia progresso do usuário.

## Arquivo

```txt
src/app/api/progresso/route.ts
```

---

## Registrar progresso

### Requisição

```json
{
  "acao": "registrar",
  "habilidade": "Cypress",
  "nivel": "intermediario",
  "porcentagem": 60
}
```

---

## Consultar progresso

### Requisição

```json
{
  "acao": "consultar",
  "habilidade": "Cypress"
}
```

Campo opcional.

---

## Resposta

```json
{
  "progresso": [
    {
      "habilidade": "Cypress",
      "nivel": "intermediario",
      "porcentagem": 60
    },
    {
      "habilidade": "SQL",
      "nivel": "iniciante",
      "porcentagem": 20
    }
  ]
}
```

---

## Comportamento

- upsert em `progresso_usuario`;
- atualiza timestamp;
- consulta individual ou total.

---

# 9. Rotas NextAuth

## Arquivo

```txt
src/app/api/auth/[...nextauth]/route.ts
```

---

## Provider

Apenas:

```txt
credentials
```

(E-mail + senha)

Sem OAuth:

- GitHub ❌
- Google ❌

---

## Rotas disponíveis

| Método | Endpoint |
|---|---|
| `POST` | `/api/auth/callback/credentials` |
| `POST` | `/api/auth/signout` |
| `GET` | `/api/auth/session` |
| `GET` | `/api/auth/csrf` |

---

## Variáveis obrigatórias

```env
NEXTAUTH_URL=
NEXTAUTH_SECRET=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

---

# 10. Endpoints não implementados

Os endpoints abaixo são apenas referências futuras:

| Endpoint | Status |
|---|---|
| `GET /api/planos/[id]` | Não implementado |
| `DELETE /api/planos/[id]` | Não implementado |
| `POST /api/buscar-recursos` | Não necessário |

`buscar_recursos_educacionais` chama Tavily diretamente.

---

# Códigos de erro comuns

| Status | Significado |
|---|---|
| `400` | Payload inválido |
| `401` | Não autenticado |
| `404` | Recurso inexistente |
| `429` | Rate limit |
| `500` | Erro interno |

### `429`

O fallback do Pathfinder é acionado automaticamente.

---

**Próximo passo:** Consulte [`./supabase-integracao.md`](./supabase-integracao.md) para entender a integração do backend com o banco de dados.