# Estrutura do Projeto

Este documento descreve a organização dos diretórios e arquivos do **NextStepAI**, explicando a responsabilidade de cada pasta e os principais módulos do sistema.

A estrutura segue o padrão do **Next.js 14 (App Router)**, com separação por domínio, responsabilidades bem definidas e organização orientada a escalabilidade.

## Árvore de Diretórios

```text
NextStepAI/
├── src/
│   ├── agentes/               # Agente Pathfinder e ferramentas
│   │   ├── ferramentas/       # Tools do agente
│   │   │   ├── extrair-pdf.ts
│   │   │   ├── estruturar-curriculo.ts
│   │   │   ├── buscar-vetor.ts
│   │   │   ├── buscar-recursos.ts
│   │   │   └── acompanhar-progresso.ts
│   │   ├── prompts/
│   │   │   └── pathfinder-system.ts
│   │   ├── pathfinder.ts
│   │   └── orquestrador.ts
│   │
│   ├── app/
│   │   ├── api/
│   │   │   ├── mensagens/
│   │   │   │   └── route.ts
│   │   │   ├── curriculo/
│   │   │   ├── planos/
│   │   │   ├── progresso/
│   │   │   └── auth/
│   │   │
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── registro/
│   │   │
│   │   ├── (chat)/
│   │   │   └── page.tsx
│   │   │
│   │   ├── globals.css
│   │   └── layout.tsx
│   │
│   ├── componentes/
│   │   ├── chat/
│   │   ├── sidebar/
│   │   ├── auth/
│   │   ├── ui/
│   │   └── theme-toggle.tsx
│   │
│   ├── contextos/
│   │   ├── ConversaContext.tsx
│   │   ├── CurriculoContext.tsx
│   │   └── TemaContext.tsx
│   │
│   ├── hooks/
│   │   ├── useChat.ts
│   │   ├── useStreaming.ts
│   │   └── useResponsividade.ts
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   ├── r2/
│   │   ├── langchain/
│   │   ├── github/
│   │   ├── stream.ts
│   │   ├── utils.ts
│   │   └── detectar-roadmap.ts
│   │
│   ├── tipos/
│   │   ├── index.ts
│   │   ├── agente.ts
│   │   ├── curriculo.ts
│   │   └── historico.ts
│   │
│   └── middleware.ts
│
├── supabase/
│   └── migrations/
│
├── scripts/
│
├── public/
│
├── docs/
│
├── .env.example
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── package.json
└── vercel.json
```

---

# Organização Geral

A arquitetura do projeto segue os seguintes princípios:

- **Separação por domínio** → agentes, frontend, banco, autenticação e utilitários ficam isolados.
- **Baixo acoplamento** → lógica reutilizável centralizada em `lib/`.
- **Frontend desacoplado do agente** → UI conversa apenas com API routes.
- **App Router do Next.js 14** → páginas e backend convivem em `src/app`.
- **RAG modular** → embeddings, busca vetorial e extração de currículo são independentes.

---

# Aliases de Importação

O projeto usa aliases TypeScript para evitar imports relativos excessivos.

Definido em:

```json
tsconfig.json
```

Mapeamento:

```json
"paths": {
  "@/*": ["./src/*"]
}
```

Exemplos:

```ts
import { supabaseAdmin } from '@/lib/supabase/server'
```

equivale a:

```ts
import { supabaseAdmin } from '../../../lib/supabase/server'
```

Outros exemplos:

```ts
@/componentes/chat/ChatContainer
@/lib/langchain/llm
@/tipos/agente
@/contextos/ConversaContext
```

Isso melhora:

- legibilidade
- refatoração
- autocomplete do editor
- manutenção do código

---

# `src/agentes/`

Contém a inteligência principal do sistema.

É responsável pela orquestração do **Pathfinder**, incluindo:

- prompt do sistema
- tools
- execução do agente
- streaming
- fallback de LLM

Estrutura:

```text
src/agentes/
├── ferramentas/
├── prompts/
├── pathfinder.ts
└── orquestrador.ts
```

## `pathfinder.ts`

Cria a instância do agente LangChain.

Responsabilidades:

- registrar tools
- injetar system prompt
- configurar modelo
- criar executor do agente

Principal função:

```ts
criarAgentePathfinder()
```

---

## `orquestrador.ts`

Camada intermediária entre API e agente.

Responsabilidades:

- receber mensagens do frontend
- iniciar streaming SSE
- propagar `usuarioId`
- controlar fallback entre modelos
- interceptar erros

Também coordena:

```text
Frontend
   ↓
API Route
   ↓
Orquestrador
   ↓
Agente Pathfinder
   ↓
Tools
```

---

## `prompts/pathfinder-system.ts`

Contém o **system prompt principal do agente**.

Define:

- comportamento do Pathfinder
- regras de resposta
- formato do roadmap
- obrigatoriedade das tools
- tom do assistente
- estratégias de gap analysis

Versão atual documentada:

```text
v1.7.1
```

---

## `ferramentas/`

Cada tool do agente é isolada em um arquivo.

### `extrair-pdf.ts`

Responsável por:

- baixar currículo do Cloudflare R2
- extrair texto via `unpdf`
- retornar conteúdo textual ao agente

Entrada:

```text
usuarioId
```

Saída:

```text
texto do currículo
```

---

### `estruturar-curriculo.ts`

Transforma o texto bruto do PDF em JSON estruturado.

Extrai:

- experiências
- habilidades
- formação
- tecnologias
- idiomas
- certificações

Saída:

```ts
DadosCurriculo
```

---

### `buscar-vetor.ts`

Executa busca vetorial no Supabase (`pgvector`).

Responsabilidades:

- gerar embedding da query
- chamar `match_vagas`
- retornar vagas semanticamente similares

Utilizado para:

```text
"Quais skills preciso aprender?"
```

---

### `buscar-recursos.ts`

Busca materiais externos.

Pode retornar:

- cursos
- vídeos
- documentação
- roadmap de aprendizado
- artigos

Usa:

```text
Tavily Search
```

---

### `acompanhar-progresso.ts`

Analisa progresso do usuário.

Responsabilidades:

- verificar skills concluídas
- inferir senioridade
- analisar GitHub
- salvar progresso

Integra:

```text
GitHub API
+
Supabase
```

---

# `src/app/`

Contém:

- páginas
- layouts
- API routes

Segue o padrão do **App Router** do Next.js.

Cada pasta pode conter:

```text
page.tsx
layout.tsx
loading.tsx
error.tsx
route.ts
```

---

## `src/app/api/`

Backend do sistema.

As API routes funcionam como endpoints HTTP.

### `api/mensagens/route.ts`

Principal endpoint do chat.

Rota:

```http
POST /api/mensagens
```

Responsabilidades:

- receber mensagem do usuário
- invocar orquestrador
- iniciar streaming SSE
- devolver tokens progressivamente

Configuração importante:

```ts
export const runtime = 'nodejs'
```

Necessário para:

```text
streaming
LangChain
long-running requests
```

---

### `api/curriculo/`

Gerencia currículos.

Endpoints típicos:

| Método | Função |
|--------|---------|
| `POST` | registrar upload |
| `GET` | buscar currículo |
| `DELETE` | remover currículo |

Também gera:

```text
presigned URLs
```

para upload no Cloudflare R2.

---

### `api/planos/`

Responsável por persistência do histórico.

Inclui:

- salvar mensagens
- gerar títulos automáticos
- atualizar conversa

---

### `api/progresso/`

Persistência do progresso do usuário.

Exemplos:

```text
skills aprendidas
nível
porcentagem
github_url
```

---

### `api/auth/`

Autenticação do sistema.

Fluxo atual:

```text
Email + senha
```

O login é delegado ao:

```text
Supabase Auth
```

Não há OAuth social ativo.

---

## `(auth)/`

Grupo de rotas autenticadas.

Exemplo:

```text
/login
/registro
```

Responsável por:

- login
- cadastro
- recuperação de sessão

---

## `(chat)/`

Área principal do sistema.

Página:

```text
page.tsx
```

Renderiza:

```tsx
<ChatContainer />
```

É o núcleo da experiência do usuário.

---

## `layout.tsx`

Root layout da aplicação.

Responsabilidades:

- providers globais
- sessão
- tema
- estrutura base do HTML

---

## `globals.css`

Estilos globais.

Inclui:

- Tailwind base
- variáveis CSS
- reset visual
- animações globais

---

# `src/componentes/`

Componentes React reutilizáveis.

Organizados por domínio.

---

## `chat/`

UI principal da conversa.

Componentes relevantes:

| Arquivo | Responsabilidade |
|----------|------------------|
| `ChatContainer.tsx` | container principal |
| `MessageBubble.tsx` | render de mensagens |
| `MessageList.tsx` | lista de mensagens |
| `MessageInput.tsx` | input do chat |
| `StreamingIndicator.tsx` | indicador de geração |
| `MarkdownRenderer.tsx` | render markdown |
| `UploadPopover.tsx` | upload de currículo |
| `ModalRoadmap.tsx` | modal do roadmap |
| `DiagramaRoadmapReactFlow.tsx` | roadmap interativo |
| `DiagramaRoadmapSvg.tsx` | fallback visual |
| `TooltipResumoSkill.tsx` | resumo de habilidades |

---

## `sidebar/`

Histórico de conversas.

Exemplo:

```text
SidebarHistorico.tsx
```

Funções:

- listar conversas
- trocar conversa
- deletar histórico

---

## `auth/`

UI de autenticação.

Exemplos:

- formulário de login
- formulário de registro
- logout

---

## `ui/`

Componentes base do:

```text
shadcn/ui
```

Exemplos:

```text
Button
Card
Dialog
Input
DropdownMenu
Tooltip
```

Customizados com:

```text
Tailwind CSS
```

---

## `theme-toggle.tsx`

Alternador de tema:

```text
claro
escuro
sistema
```

---

# `src/contextos/`

Gerenciamento de estado global.

---

## `ConversaContext.tsx`

Armazena:

- conversa atual
- mensagens
- streaming
- loading
- conversaId

---

## `CurriculoContext.tsx`

Gerencia:

```text
currículo enviado
```

Estado:

- upload concluído
- dados estruturados
- presença do PDF

---

## `TemaContext.tsx`

Gerenciamento de tema.

Pode ser substituído por:

```text
next-themes
```

---

# `src/hooks/`

Hooks reutilizáveis.

---

## `useChat.ts`

Abstrai:

- envio de mensagem
- persistência
- loading
- integração SSE

---

## `useStreaming.ts`

Processa eventos do stream.

Tipos:

```text
token
tool_call
tool_result
done
error
```

---

## `useResponsividade.ts`

Detecta breakpoints.

Usado para:

```text
sidebar responsiva
mobile layout
```

---

# `src/lib/`

Lógica compartilhada do projeto.

---

## `supabase/`

Acesso ao banco.

Responsabilidades:

- cliente browser
- cliente server
- CRUD
- histórico
- progresso
- currículo

---

## `r2/`

Integração com Cloudflare R2.

Funções:

```text
gerar upload URL
gerar URL de leitura
deletar arquivo
```

---

## `langchain/`

Camada de IA.

Responsabilidades:

- criação do LLM
- embeddings
- busca vetorial

Exemplos:

```text
llm.ts
embeddings.ts
vector-store.ts
```

---

## `github/`

Analisador de repositórios.

Extrai:

- linguagens
- atividade
- senioridade estimada

---

## `stream.ts`

Leitor SSE do frontend.

Função:

```ts
lerStreamSSE()
```

---

## `detectar-roadmap.ts`

Extrai JSON do roadmap do markdown do agente.

Exemplo:

```xml
<roadmap>
{
  "fases": []
}
</roadmap>
```

---

# `src/tipos/`

Tipos TypeScript globais.

---

## `index.ts`

Tipos compartilhados.

Exemplo:

```ts
Mensagem
Conversa
Usuario
```

---

## `agente.ts`

Eventos SSE:

```ts
EventoStreamSSE
```

Inclui:

```text
token
tool_call
tool_result
done
error
```

---

## `curriculo.ts`

Modelos de currículo:

```ts
DadosCurriculo
ExperienciaProfissional
Formacao
Skill
```

---

## `historico.ts`

Tipos do banco:

```ts
MensagemPersistida
```

---

# `supabase/migrations/`

Contém migrations SQL versionadas.

Responsáveis por:

- tabelas
- índices
- funções SQL
- pgvector
- RLS

Executadas na ordem:

```text
001 → 005
```

---

# `scripts/`

Scripts administrativos.

| Arquivo | Responsabilidade |
|----------|------------------|
| `popular-banco.ts` | seed vetorial |
| `testar-extrair-pdf.ts` | teste PDF |
| `testar-embeddings.ts` | valida embeddings |
| `testar-vetor.ts` | busca vetorial |
| `criar-usuario-teste.ts` | usuário fake |

---

# `public/`

Arquivos estáticos.

Exemplos:

```text
/favicon.ico
/images/
```

Acessíveis diretamente pela URL.

---

# Arquivos de Configuração da Raiz

| Arquivo | Propósito |
|---------|------------|
| `next.config.js` | configuração do Next.js |
| `tailwind.config.js` | customização do Tailwind |
| `tsconfig.json` | TypeScript + aliases |
| `postcss.config.js` | PostCSS |
| `.eslintrc.json` | ESLint |
| `.env.example` | variáveis de ambiente |
| `vercel.json` | deploy Vercel |

---

# Considerações de Build

Durante produção:

```text
src/ → compilado → .next/
```

Observações:

- `middleware.ts` roda no Edge Runtime
- `/api/mensagens` usa `runtime = 'nodejs'`
- streaming SSE exige runtime Node
- o frontend nunca conversa diretamente com o Supabase admin

Fluxo simplificado:

```text
Frontend
    ↓
API Route
    ↓
Orquestrador
    ↓
Agente Pathfinder
    ↓
Tools
    ↓
Supabase / R2 / Tavily / LLM
```

---

**Próximo passo:** Consulte `../agentes/pathfinder.md` para entender a arquitetura do agente, prompt e ferramentas.