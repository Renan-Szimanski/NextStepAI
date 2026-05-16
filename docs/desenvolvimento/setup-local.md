# Configuração do Ambiente de Desenvolvimento Local

Este guia cobre os passos necessários para executar o **NextStepAI** localmente usando:

- **Next.js 14**
- **Supabase (Auth + PostgreSQL + pgvector)**
- **Cloudflare R2**
- **Deepseek API**
- **Tavily Search**

---

# Pré-requisitos

Antes de começar, instale:

- **Node.js 20.x ou superior** (recomendado)
- **npm** (incluso com Node.js)
- **Git**
- Conta no **Supabase**
- Conta no **Cloudflare R2**
- Chaves de API:
  - Deepseek
  - Tavily

### Verificar instalação

```bash
node -v
npm -v
git --version
```

---

# 1. Clonar o repositório

```bash
git clone https://github.com/Renan-Szimanski/NextStepAI.git

cd NextStepAI
```

---

# 2. Instalar dependências

```bash
npm install
```

Após instalar:

```bash
npm audit fix
```

(opcional)

---

# 3. Configurar variáveis de ambiente

Copie o arquivo de exemplo:

```bash
cp .env.example .env.local
```

Edite o arquivo `.env.local`.

## Variáveis obrigatórias

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Deepseek
DEEPSEEK_API_KEY=

# Tavily
TAVILY_API_KEY=

# Cloudflare R2
R2_ENDPOINT=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
```

### Observação

O projeto utiliza **Supabase Auth (e-mail/senha)**.

Não é necessário configurar:

- GitHub OAuth
- Google OAuth
- NextAuth

Toda autenticação é feita diretamente pelo Supabase.

Consulte:

`docs/configuracao/ambiente.md`

para detalhes completos.

---

# 4. Configurar o Supabase

Você pode usar:

### Opção A — Supabase remoto (recomendado)

Mais simples e recomendado para começar.

## Criar projeto

1. Acesse:

https://supabase.com

2. Crie um projeto.

3. Copie:

- Project URL
- anon public key
- service_role key

4. Configure no `.env.local`.

---

## Aplicar migrations

Abra:

**SQL Editor → New Query**

Execute as migrations na ordem:

```text
001 → 005
```

Consulte:

`docs/configuracao/supabase.md`

---

## Popular vagas

Após as migrations:

### Seed leve (desenvolvimento)

```bash
npm run seed:test
```

### Seed completa

```bash
npm run seed:prod
```

---

### Opção B — Supabase local (Docker)

Para desenvolvimento totalmente isolado.

## Instalar CLI

```bash
npm install supabase --save-dev
```

ou:

```bash
npm install -g supabase
```

---

## Inicializar Supabase

```bash
npx supabase init
```

---

## Rodar ambiente local

```bash
npx supabase start
```

Isso iniciará:

- PostgreSQL
- Supabase Auth
- REST API
- Studio
- Storage
- Realtime

---

## Aplicar migrations localmente

```bash
npx supabase db reset
```

ou:

```bash
npx supabase migration up
```

---

## Configurar `.env.local`

O comando:

```bash
npx supabase start
```

mostra:

- URL local
- anon key
- service_role key

Configure essas credenciais no `.env.local`.

### Observação sobre pgvector

O **Supabase local possui suporte ao `pgvector`**.

A extensão é habilitada pela migration:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Não é necessário setup adicional.

---

# 5. Rodar a aplicação

Inicie o servidor:

```bash
npm run dev
```

Abra:

```text
http://localhost:3000
```

---

# 6. Validar o setup

## 6.1 Criar conta

1. Abra a aplicação.
2. Crie uma conta com **e-mail e senha**.
3. Confirme o e-mail (se habilitado no Supabase).
4. Faça login.

Se isso funcionar, o **Supabase Auth** está configurado corretamente.

---

## 6.2 Testar upload de currículo

Faça upload de um PDF.

Verifique:

- upload concluído;
- registro salvo no banco;
- URL assinada funcionando.

No Cloudflare R2, o arquivo deve aparecer no bucket.

---

## 6.3 Testar extração de PDF

No chat:

```text
Quero ser engenheiro de software
```

O agente deve:

1. localizar o currículo;
2. extrair o texto;
3. estruturar os dados;
4. responder com análise inicial.

Também é possível testar isoladamente:

```bash
npm run test:extrair-pdf
```

---

## 6.4 Testar busca vetorial

Pergunte no chat:

```text
Quais são as skills mais pedidas para desenvolvedor React?
```

A tool:

```text
consultar_banco_vetorial
```

deve retornar vagas semanticamente similares.

Teste isolado:

```bash
npm run test:vetor
```

---

## 6.5 Testar roadmap

Com um currículo enviado:

```text
Gere um roadmap para eu me tornar engenheiro de software sênior
```

O sistema deve:

- executar gap analysis;
- buscar vagas relacionadas;
- buscar recursos educacionais;
- gerar roadmap;
- renderizar diagrama interativo.

---

# 7. Verificar build de produção

Antes de fazer commit:

```bash
npm run build
```

O build deve concluir sem erros.

Depois:

```bash
npm run lint
```

(se habilitado no projeto)

---

# 8. Debug e observabilidade

### Logs do servidor

Aparecem no terminal:

```bash
npm run dev
```

---

### Logs do navegador

Abra:

```text
F12 → Console
```

Verifique:

- requests SSE
- erros de autenticação
- upload de PDF
- erros do React Flow

---

### Logs do Supabase

No dashboard:

**Logs → Database / Auth**

---

# 9. Problemas comuns

| Problema | Causa provável | Solução |
|---|---|---|
| `401 Unauthorized` | credenciais Supabase inválidas | verificar `.env.local` |
| `R2: Access Denied` | chave R2 incorreta | validar token do bucket |
| `Deepseek 401` | chave inválida | regenerar API key |
| `Deepseek 429` | rate limit | usar fallback Groq |
| Upload de PDF falha | erro de CORS no bucket | revisar configuração do R2 |
| `match_vagas` retorna vazio | tabela não populada | rodar `npm run seed:test` |
| Streaming não funciona | runtime incorreto | confirmar `runtime = 'nodejs'` |
| Login falha | confirmação de e-mail pendente | validar inbox do usuário |

---

# 10. Encerrar ambiente

Parar o Next.js:

```bash
CTRL + C
```

Parar Supabase local:

```bash
npx supabase stop
```

---

## Ambiente de produção

Para deploy:

Consulte:

`docs/configuracao/deploy.md`

---

## Scripts úteis

Veja:

`docs/desenvolvimento/scripts.md`