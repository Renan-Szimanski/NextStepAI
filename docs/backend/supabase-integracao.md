# Integração com Supabase

O NextStepAI utiliza o Supabase como **banco de dados principal** (PostgreSQL + pgvector) e **serviço de autenticação** (apenas e-mail/senha). Este documento descreve os dois clientes utilizados (server e browser), as funções de acesso a dados e a arquitetura de persistência.

## 1. Clientes Supabase

### Cliente do Servidor (`supabaseAdmin`)

**Arquivo:** `src/lib/supabase/cliente.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
```

**Características:**

- Utiliza a **chave `service_role`** (bypass total das políticas RLS).
- Usado **exclusivamente em API routes** (servidor).
- Não mantém sessão de autenticação — cada requisição é autônoma.
- Operações típicas:
  - Inserir mensagens
  - Atualizar currículos
  - Popular vagas (seed)

### Cliente do Navegador (`createClient`)

**Arquivo:** `src/lib/supabase/browser.ts`

```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**Características:**

- Utiliza a **chave pública `anon`**.
- Respeita as políticas de **RLS**.
- Usado no frontend para consultas seguras (ex.: histórico do usuário).
- Integrado ao NextAuth para obter o `access_token` do usuário autenticado.

---

## 2. Funções de Acesso a Dados

Todas as funções que interagem com o Supabase estão organizadas em `src/lib/supabase/`, separadas por domínio.

### `historico.ts` – Conversas e mensagens

| Função | Descrição |
|--------|------------|
| `listarConversas(usuarioId: string)` | Retorna todas as conversas do usuário, ordenadas por `atualizado_em DESC`. |
| `obterConversa(conversaId: string, usuarioId: string)` | Obtém uma conversa específica validando pertencimento via RLS. |
| `salvarMensagem(conversaId: string, papel: 'usuario' \| 'assistente', conteudo: string)` | Insere mensagem e atualiza `atualizado_em`. |
| `criarConversa(usuarioId: string, titulo: string, cargoAlvo?: string)` | Cria nova conversa e retorna o ID. |

### Exemplo de uso (backend)

```typescript
export async function salvarMensagem(
  conversaId: string,
  papel: 'usuario' | 'assistente',
  conteudo: string
) {
  const { data, error } = await supabaseAdmin
    .from('mensagens')
    .insert({
      conversa_id: conversaId,
      papel,
      conteudo,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(
      `Erro ao salvar mensagem: ${error.message}`
    );
  }

  return data.id;
}
```

---

### `curriculo.ts` – Gerenciamento de currículos

| Função | Descrição |
|--------|------------|
| `buscarCurriculo(usuarioId: string)` | Retorna o currículo atual do usuário. |
| `atualizarTextoCurriculo(curriculoId: string, textoExtraido: string, dadosEstruturados: DadosCurriculo)` | Atualiza `texto_extraido` e `dados_estruturados`. |
| `inserirCurriculo(usuarioId: string, chaveR2: string, nomeOriginal: string, tamanhoBytes: number)` | Insere novo currículo (substitui anterior). |
| `removerCurriculo(usuarioId: string)` | Remove registro do banco. |

### Exemplo de uso

```typescript
export async function buscarCurriculo(
  usuarioId: string
) {
  const { data, error } =
    await supabaseAdmin
      .from('curriculos')
      .select(`
        id,
        chave_r2,
        nome_original,
        tamanho_bytes,
        texto_extraido,
        dados_estruturados
      `)
      .eq('usuario_id', usuarioId)
      .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
```

---

### `progresso.ts` – Acompanhamento de progresso

| Função | Descrição |
|--------|------------|
| `registrarProgresso(usuarioId: string, habilidade: string, nivel: string, porcentagem: number)` | Cria ou atualiza progresso. |
| `consultarProgresso(usuarioId: string, habilidade?: string)` | Lista progresso do usuário. |
| `analisarRepositorio(githubUrl: string)` | Analisa um repositório GitHub (não usa Supabase). |

### Exemplo de uso

```typescript
export async function registrarProgresso(
  usuarioId: string,
  habilidade: string,
  nivel: string,
  porcentagem: number
) {
  const { error } =
    await supabaseAdmin
      .from('progresso_usuario')
      .upsert(
        {
          usuario_id: usuarioId,
          habilidade,
          nivel,
          porcentagem,
          atualizado_em:
            new Date().toISOString(),
        },
        {
          onConflict:
            'usuario_id,habilidade',
        }
      );

  if (error) {
    throw new Error(error.message);
  }
}
```

---

## 3. Row Level Security (RLS)

Todas as tabelas com dados do usuário possuem **RLS habilitado**:

- `conversas`
- `mensagens`
- `curriculos`
- `progresso_usuario`

As políticas garantem que:

- Um usuário só pode acessar registros onde:

```sql
usuario_id = auth.uid()
```

- O cliente do navegador (`anon`) **obedece** RLS.
- O cliente do servidor (`service_role`) **ignora** RLS.

### Exemplo de política (`conversas`)

```sql
CREATE POLICY conversas_policy
ON conversas
USING (
  usuario_id = auth.uid()::text
)
WITH CHECK (
  usuario_id = auth.uid()::text
);
```

### Tabela `vagas`

A tabela `vagas` possui **leitura pública autenticada**, pois não contém dados sensíveis.

---

## 4. Fluxo de Persistência de Mensagens

O salvamento é **assíncrono** e **separado do streaming**.

### Fluxo

1. O frontend envia uma mensagem.
2. O backend retorna streaming SSE.
3. Quando recebe `type: 'done'`, o frontend salva a resposta.
4. O backend persiste a mensagem no Supabase.

### Payload enviado

```json
{
  "conversaId": "uuid",
  "papel": "assistente",
  "conteudo": "resposta completa"
}
```

### Por que não salvar durante o streaming?

- Evita escrita excessiva no banco.
- Reduz custo.
- Evita persistência parcial caso haja falha.
- O usuário já visualiza a resposta antes da persistência terminar.

---

## 5. Integração com NextAuth (E-mail/Senha)

O NextAuth usa **Credentials Provider**, delegando autenticação ao Supabase Auth.

**Arquivo:** `src/lib/auth.ts`

```typescript
import CredentialsProvider
from 'next-auth/providers/credentials';

import {
  createClient
} from '@supabase/supabase-js';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Email e Senha',

      credentials: {
        email: {},
        password: {},
      },

      async authorize(credentials) {
        const supabase =
          createClient(
            process.env
              .NEXT_PUBLIC_SUPABASE_URL!,
            process.env
              .NEXT_PUBLIC_SUPABASE_ANON_KEY!
          );

        const {
          data,
          error,
        } =
          await supabase.auth
            .signInWithPassword({
              email:
                credentials.email,
              password:
                credentials.password,
            });

        if (
          error ||
          !data.user
        ) {
          return null;
        }

        return {
          id: data.user.id,
          email: data.user.email,
          name: data.user.email,
        };
      },
    }),
  ],

  session: {
    strategy: 'jwt',
  },

  callbacks: {
    async jwt({
      token,
      user,
    }) {
      if (user) {
        token.id = user.id;
      }

      return token;
    },

    async session({
      session,
      token,
    }) {
      if (token.id) {
        session.user.id =
          token.id as string;
      }

      return session;
    },
  },
};
```

O `usuarioId` obtido da sessão é propagado:

```text
NextAuth
   ↓
API Route
   ↓
RunnableConfig
   ↓
Tools do agente
```

---

## 6. Exemplo Completo: Salvando uma Conversa

### Frontend (`ChatContainer.tsx`)

```typescript
async function salvarMensagemNoHistorico(
  papel,
  conteudo,
  primeiraMsgTitulo,
  conversaIdParam
) {
  const response =
    await fetch(
      '/api/planos/salvar-mensagem',
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/json',
        },

        body: JSON.stringify({
          conversaId:
            conversaIdParam,
          papel,
          conteudo,
          primeiraMsgTitulo,
        }),
      }
    );

  const data =
    await response.json();

  if (
    !conversaIdParam &&
    data.conversaId
  ) {
    setConversaId(
      data.conversaId
    );
  }

  return data.conversaId;
}
```

### Backend (API Route simplificada)

```typescript
export async function POST(
  req: Request
) {
  const sessao =
    await auth();

  if (!sessao?.user) {
    return new Response(
      'Unauthorized',
      { status: 401 }
    );
  }

  const {
    conversaId,
    papel,
    conteudo,
    primeiraMsgTitulo,
  } = await req.json();

  let finalConversaId =
    conversaId;

  if (!finalConversaId) {
    const { data } =
      await supabaseAdmin
        .from('conversas')
        .insert({
          usuario_id:
            sessao.user.id,
          titulo:
            primeiraMsgTitulo,
        })
        .select('id')
        .single();

    finalConversaId =
      data.id;
  }

  await supabaseAdmin
    .from('mensagens')
    .insert({
      conversa_id:
        finalConversaId,
      papel,
      conteudo,
    });

  return Response.json({
    conversaId:
      finalConversaId,
  });
}
```

---

## 7. Migrations e Evolução do Esquema

As migrations ficam em:

```text
supabase/migrations/
```

Devem ser aplicadas **na ordem (`001 → 005`)**.

Caso contrário, erros como:

```text
relation "vagas" does not exist
```

podem ocorrer.

### Verificar estado atual do banco

```sql
SELECT *
FROM information_schema.tables
WHERE table_name IN (
  'conversas',
  'mensagens',
  'curriculos',
  'progresso_usuario',
  'vagas'
);
```

---

## 8. Tratamento de Erros e Retry

### Timeout na busca vetorial

Já tratado na tool:

```text
consultar_banco_vetorial
```

com fallback.

### Falha de conexão com Supabase

As funções lançam exceções, e o orquestrador pode acionar fallback.

### Retry em operações críticas

Exemplo:

```text
buscarCurriculoComRetry
```

Utiliza delays progressivos:

```text
0ms → 600ms → 1400ms
```

---

**Próximo passo:** Consulte [r2-storage.md](r2-storage.md) para entender o armazenamento de PDFs no Cloudflare R2.