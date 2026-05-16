# Deploy na Vercel

Este documento descreve o processo de deploy do **NextStepAI** na plataforma **Vercel**, incluindo configurações necessárias, variáveis de ambiente e observações sobre runtime, streaming e limitações do plano gratuito.

## Pré-requisitos

Antes do deploy, certifique-se de possuir:

- Conta na Vercel (Hobby ou Pro);
- Repositório do projeto hospedado no GitHub, GitLab ou Bitbucket;
- Projeto Supabase configurado;
- Bucket Cloudflare R2 configurado;
- Chaves de API do DeepSeek e Tavily.

---

## 1. Conectar o Repositório à Vercel

1. Acesse:

```txt
https://vercel.com/new
```

2. Selecione o repositório do projeto (`NextStepAI`);
3. Mantenha o framework preset como:

```txt
Next.js
```

A Vercel detectará automaticamente a estrutura do App Router.

---

## 2. Configurar Variáveis de Ambiente

No painel do projeto:

```txt
Settings → Environment Variables
```

Adicione as seguintes variáveis:

| Nome | Onde obter |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API (`service_role`) |
| `DEEPSEEK_API_KEY` | DeepSeek Platform |
| `TAVILY_API_KEY` | Tavily Dashboard |
| `R2_ENDPOINT` | Cloudflare R2 → Overview |
| `R2_ACCESS_KEY_ID` | Cloudflare → R2 API Tokens |
| `R2_SECRET_ACCESS_KEY` | Mesmo token |
| `R2_BUCKET_NAME` | Cloudflare → Buckets |
| `NEXTAUTH_URL` | URL final do deploy |
| `NEXTAUTH_SECRET` | Segredo da aplicação |

### Exemplo

```env
NEXTAUTH_URL=https://nextstepai.vercel.app
```

Para gerar um segredo seguro:

```bash
openssl rand -base64 32
```

### Observação sobre autenticação

O **NextStepAI** utiliza autenticação **somente por e-mail e senha**.

Providers sociais (**GitHub**, **Google**, etc.) foram removidos do MVP devido a problemas de consistência de sessão e limitações de tempo do projeto.

A arquitetura permanece compatível com OAuth para possível reativação futura.

---

## 3. Configurações de Build

Em:

```txt
Settings → General → Build & Development Settings
```

Utilize:

| Campo | Valor |
|---|---|
| Build Command | `npm run build` |
| Install Command | `npm install` |
| Output Directory | `.next` |

Os valores padrão da Vercel normalmente já são suficientes.

---

## 4. Configurar Runtime das API Routes

A API principal (`/api/mensagens`) utiliza:

- **streaming SSE**;
- APIs Node.js (`stream`, `crypto`);
- processamento de PDF;
- chamadas externas (DeepSeek, Tavily, Supabase).

Por isso, **não deve rodar no Edge Runtime**.

Crie um arquivo `vercel.json` na raiz do projeto:

```json
{
  "functions": {
    "app/api/mensagens/route.ts": {
      "runtime": "nodejs20.x",
      "maxDuration": 60
    }
  }
}
```

### Recomendação adicional

No próprio arquivo da route (`route.ts`):

```ts
export const runtime = "nodejs";
export const maxDuration = 60;
```

Isso reduz incompatibilidades futuras da Vercel.

---

## 5. Limitações do Plano Hobby

O plano gratuito possui restrições importantes.

| Limitação | Impacto |
|---|---|
| Timeout (~10s) | Pode interromper extração de PDF |
| Cold starts | Primeira requisição pode ser lenta |
| Recursos limitados | Streaming pode degradar em horários de pico |

### Recomendação

Para demonstração final ou uso mais intenso:

```txt
Vercel Pro
```

O plano Pro reduz timeouts e melhora estabilidade do streaming.

---

## 6. Executar Migrations no Supabase

Antes de acessar o deploy, replique o banco do ambiente local.

### Passo 1 — Abrir SQL Editor

No dashboard do Supabase:

```txt
SQL Editor
```

### Passo 2 — Executar migrations

Execute, em ordem:

```txt
supabase/migrations/001
supabase/migrations/002
supabase/migrations/003
supabase/migrations/004
supabase/migrations/005
```

### Passo 3 — Habilitar pgvector

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Passo 4 — Popular vagas (opcional)

```bash
npm run seed:prod
```

Isso adiciona vagas reais/sintéticas para busca semântica.

---

## 7. Testar o Deploy

Após o build:

1. Acesse a URL da aplicação:

```txt
https://nextstepai.vercel.app
```

2. Crie uma conta com **e-mail e senha**;
3. Confirme o e-mail enviado pelo Supabase Auth;
4. Faça upload de um currículo PDF;
5. Inicie uma conversa com o mentor.

Exemplo:

```txt
Quero me tornar Engenheira de Software Sênior
```

---

## Considerações de Segurança

### Row Level Security (RLS)

Cada usuário acessa apenas:

- suas conversas;
- seus currículos;
- seu histórico;
- seu progresso.

### Chaves privadas

Estas variáveis **nunca devem ser expostas ao cliente**:

- `SUPABASE_SERVICE_ROLE_KEY`
- `DEEPSEEK_API_KEY`
- `R2_SECRET_ACCESS_KEY`
- `NEXTAUTH_SECRET`

### Cloudflare R2

O acesso aos currículos ocorre por:

```txt
Presigned URLs
```

As URLs expiram automaticamente e não permitem listagem de arquivos.

---

## Problemas Comuns em Produção

| Problema | Causa provável | Solução |
|---|---|---|
| `502 / Function Timeout` | Runtime excedeu tempo limite | Use plano Pro ou reduza operações pesadas |
| Upload de PDF falha | Credenciais R2 incorretas | Verifique variáveis `R2_*` |
| Login não funciona | `NEXTAUTH_URL` incorreta | Confirme URL HTTPS da aplicação |
| Busca vetorial vazia | Banco não populado | Execute `npm run seed:prod` |
| Streaming travado | Route rodando no Edge | Forçar `runtime = "nodejs"` |

---

## Deploy Contínuo

A cada push na branch principal:

```txt
main
```

A Vercel realiza deploy automaticamente.

### Recomendações

- Utilize branches de preview para testes;
- Execute migrations antes de deploys grandes;
- Teste streaming após cada alteração no agente.

---

## Próximos Passos

Após o deploy:

```txt
docs/configuracao/supabase.md
```

para configurar:

- RLS;
- tabelas;
- políticas;
- pgvector;
- migrations.

---

**Última atualização:** Maio de 2026