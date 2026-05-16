```markdown
# Guia para Desenvolvedores

Este guia é destinado a desenvolvedores que desejam contribuir com o NextStepAI, entender o funcionamento interno, adicionar novas funcionalidades ou depurar problemas. Pressupõe familiaridade com Next.js, TypeScript, LangChain e Supabase.

## Sumário

1. [Configuração do ambiente de desenvolvimento](#1-configuração-do-ambiente-de-desenvolvimento)
2. [Estrutura do projeto – visão para contribuidores](#2-estrutura-do-projeto--visão-para-contribuidores)
3. [Adicionando uma nova tool ao agente](#3-adicionando-uma-nova-tool-ao-agente)
4. [Modificando o system prompt do Pathfinder](#4-modificando-o-system-prompt-do-pathfinder)
5. [Adicionando uma nova rota de API](#5-adicionando-uma-nova-rota-de-api)
6. [Testando alterações](#6-testando-alterações)
7. [Depuração com logs](#7-depuração-com-logs)
8. [Executando scripts úteis](#8-executando-scripts-úteis)
9. [Boas práticas de commit e pull request](#9-boas-práticas-de-commit-e-pull-request)

---

## 1. Configuração do ambiente de desenvolvimento

Siga o [guia de setup local](../desenvolvimento/setup-local.md) para preparar o ambiente. Além disso:

- **Node.js 20+** é obrigatório.
- **Docker** (opcional) para rodar Supabase localmente – recomendado para evitar poluir o ambiente de produção durante testes.
- **Variáveis de ambiente:** Nunca faça commit do `.env.local`. Use `.env.example` como base.

**Comandos iniciais após clonar:**

```bash
npm install
cp .env.example .env.local
# preencha .env.local com suas credenciais
npm run dev
```

## 2. Estrutura do projeto – visão para contribuidores

As pastas mais relevantes para desenvolvimento:

| Pasta | O que contém | Quando mexer |
|-------|--------------|--------------|
| `src/agentes/` | Lógica do agente Pathfinder, tools, orquestrador | Para modificar comportamento da IA, adicionar tools, ajustar fallback. |
| `src/agentes/ferramentas/` | Implementação de cada tool | Para criar nova tool ou alterar existente. |
| `src/app/api/` | Rotas de backend (API routes) | Para criar novos endpoints ou alterar os existentes. |
| `src/componentes/chat/` | Componentes React do chat e roadmap | Para alterar UI/UX da conversa, diagrama, upload. |
| `src/lib/` | Utilitários (Supabase, R2, LangChain, GitHub) | Para modificar acesso a dados, integrações externas. |
| `src/lib/supabase/` | Funções de acesso ao banco | Para alterar consultas ao Supabase. |
| `src/lib/r2/` | Operações Cloudflare R2 | Para modificar geração de URLs assinadas. |
| `supabase/migrations/` | SQL migrations | Para alterar esquema do banco (criar nova migration). |
| `scripts/` | Scripts auxiliares (seed, testes) | Para popular dados, testar funções isoladamente. |

## 3. Adicionando uma nova tool ao agente

As tools são funções que o agente LangChain pode invocar. Para adicionar uma nova:

**Passo 1:** Criar o arquivo da tool em `src/agentes/ferramentas/minha-nova-tool.ts`

```typescript
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

export const minhaNovaTool = tool(
  async ({ parametro1, parametro2 }) => {
    // Implementação da lógica
    console.log(`Executando tool com ${parametro1} e ${parametro2}`);
    // Pode acessar o config para obter usuarioId, etc.
    return `Resultado: ${parametro1} + ${parametro2}`;
  },
  {
    name: 'minha_nova_tool',
    description: 'Descrição clara do que a tool faz. O agente usará isso para decidir quando chamá-la.',
    schema: z.object({
      parametro1: z.string().describe('Explicação do parâmetro 1'),
      parametro2: z.number().optional().describe('Explicação do parâmetro 2 (opcional)'),
    }),
  }
);
```

**Passo 2:** Registrar a tool no arquivo de índice `src/agentes/ferramentas/index.ts`

```typescript
import { minhaNovaTool } from './minha-nova-tool';

export const todasAsTools = [
  consultarBancoVetorial,
  extrairTextoPdf,
  estruturarDadosCurriculo,
  buscarRecursosEducacionais,
  acompanharProgressoTool,
  minhaNovaTool, // ← adicionar aqui
];
```

**Passo 3:** (Opcional) Se a tool precisar acessar o `usuarioId` ou outras informações do `RunnableConfig`, use o segundo parâmetro da função:

```typescript
async (input, config) => {
  const usuarioId = config?.configurable?.usuarioId as string;
  // ...
}
```

**Passo 4:** Atualizar o system prompt (`pathfinder-system.ts`) para descrever quando o agente deve usar a nova tool. Exemplo:

```
## Ferramentas disponíveis

- 'minha_nova_tool': [descrição e quando usar]
```

**Passo 5:** Testar a tool isoladamente (opcional, mas recomendado): crie um script em `scripts/testar-minha-tool.ts` e execute com `npx ts-node scripts/testar-minha-tool.ts`.

## 4. Modificando o system prompt do Pathfinder

O system prompt está em `src/agentes/prompts/pathfinder-system.ts`. Ao alterá-lo, respeite:

- **Versão:** Incremente a constante `VERSAO_PROMPT` (ex.: `v1.8.0-nova-feature`).
- **Tags obrigatórias:** Mantenha `<thinking>` e as regras de formato.
- **Tools listadas:** Sempre atualize a seção "Ferramentas disponíveis" se adicionar/remover tools.
- **Regras de fluxo:** Fluxo A (sem currículo) e Fluxo B (com currículo) devem estar claros.

**Teste pós-alteração:** Inicie uma conversa e verifique se o agente segue as novas instruções. Monitore os logs para ver se o raciocínio dentro de `<thinking>` está correto.

## 5. Adicionando uma nova rota de API

Para criar um novo endpoint (ex.: `GET /api/estatisticas`):

1. Crie a pasta `src/app/api/estatisticas/`.
2. Dentro, crie `route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET() {
  const sessao = await auth();
  if (!sessao?.user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  // sua lógica aqui
  return NextResponse.json({ dados: [] });
}
```

3. Se o endpoint exigir `runtime = 'nodejs'` (por usar streams ou bibliotecas que não funcionam no Edge), exporte essa constante.
4. Para métodos `POST`, valide o body com Zod.

## 6. Testando alterações

### Testes manuais (recomendados para frontend e integração)

- **Chat:** Use o navegador em modo anônimo para testar com diferentes usuários.
- **Upload de PDF:** Teste com arquivos pequenos (<1 MB) e grandes (próximo de 5 MB) para validar limite.
- **Diagrama:** Verifique o comportamento em mobile (DevTools → Modo dispositivo).
- **Fallback:** Desligue temporariamente a chave `DEEPSEEK_API_KEY` para forçar o fallback.

### Scripts de teste existentes

```bash
npm run test:extrair-pdf   # testa extração de PDF local (sem R2)
npm run test:vetor         # testa match_vagas com query fixa
npm run test:r2            # testa credenciais do R2 (lista bucket)
```

### Teste do agente isolado (não há script padrão – crie um se necessário)

Exemplo de script `scripts/testar-agente.ts`:

```typescript
import { processarMensagem } from '@/agentes/orquestrador';
import type { Mensagem } from '@/tipos';

const mockMessages: Mensagem[] = [
  { id: '1', papel: 'user', conteudo: 'Quero ser QA', timestamp: Date.now(), criadoEm: new Date() }
];

for await (const evento of processarMensagem(mockMessages, 'usuario-teste-id')) {
  console.log(evento);
}
```

Execute com `npx ts-node scripts/testar-agente.ts`.

## 7. Depuração com logs

O sistema usa `console.log` e `console.error` com prefixos por módulo:

| Prefixo | Módulo |
|---------|--------|
| `[Pathfinder]` | `pathfinder.ts` (conversão de mensagens, trim) |
| `[Orquestrador]` | `orquestrador.ts` (streaming, fallback) |
| `[Tool: extrair_texto_pdf]` | Tool de extração |
| `[Tool: consultar_banco_vetorial]` | Tool de busca vetorial |
| `[api/mensagens]` | API route de chat |

**Como visualizar logs localmente:**  
Os logs aparecem no terminal onde `npm run dev` está rodando. Para logs do cliente, abra o console do navegador (F12).

**Em produção (Vercel):**  
Acesse o projeto na Vercel → **Functions** → escolha a função (ex.: `api/mensagens`) → aba **Logs**.

**Dica:** Para depurar uma tool específica, adicione `console.log` dentro dela e recrie o cenário que a invoca.

## 8. Executando scripts úteis

Além dos scripts listados em [scripts.md](../desenvolvimento/scripts.md), você pode criar scripts ad hoc em `scripts/`. Exemplo de script para limpar dados de teste:

```typescript
// scripts/limpar-conversas-teste.ts
import { supabaseAdmin } from '@/lib/supabase/cliente';

async function limpar() {
  const { error } = await supabaseAdmin
    .from('conversas')
    .delete()
    .ilike('titulo', '%teste%');
  if (error) console.error(error);
  else console.log('Conversas de teste removidas');
}
limpar();
```

Execute com: `npx ts-node scripts/limpar-conversas-teste.ts`

## 9. Boas práticas de commit e pull request

- **Commits atômicos:** Cada commit deve representar uma mudança lógica e funcional.
- **Mensagens:** Use o formato `tipo(escopo): descrição` (ex.: `feat(agent): add tool for GitHub analysis`).
- **Testes:** Sempre teste localmente antes de abrir um PR.
- **Documentação:** Se adicionar uma nova feature, atualize a documentação relevante na pasta `docs/`.
- **Não quebrar o build:** Execute `npm run build` localmente para verificar se não há erros de tipo ou dependências faltando.
- **Migrations:** Ao alterar o esquema do banco, crie uma nova migration (ex.: `006_nova_feature.sql`) e adicione o arquivo em `supabase/migrations/`.

---

**Próximo passo:** Consulte [troubleshooting.md](troubleshooting.md) para problemas comuns e soluções.