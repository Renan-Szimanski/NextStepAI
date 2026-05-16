# Visão Geral da Arquitetura

## Stack Tecnológica (macro)

| Camada | Tecnologia | Função |
|---|---|---|
| **Frontend** | Next.js 14 (App Router) + React Server Components | Renderização híbrida (SSR/CSR) |
| **UI** | Tailwind CSS + shadcn/ui | Estilização e componentes acessíveis |
| **Agente IA** | LangChain.js + DeepSeek (LLM) | Orquestração, raciocínio e tools |
| **Banco de dados** | Supabase (PostgreSQL + pgvector) | Dados estruturados + busca semântica |
| **Storage** | Cloudflare R2 (S3-compatible) | Armazenamento de PDFs de currículos |
| **Autenticação** | NextAuth.js v5 (GitHub + e-mail/senha) | Gerenciamento de sessão |
| **Deploy** | Vercel | Serverless Functions + Edge Runtime |

## Fluxo Principal (com currículo)

```text
[Usuário]
   │
   ├─(1) Faz login (GitHub ou e-mail)
   │
   ├─(2) Envia PDF do currículo → Frontend (upload)
   │         │
   │         └─ Gera presigned URL (API Route) → Cloudflare R2
   │                   │
   │                   └─ Upload direto do frontend → R2
   │
   ├─(3) Digita mensagem:
   │     "Quero ser engenheiro de software sênior"
   │
   └─(4) Inicia conversa no chat
         → POST /api/mensagens (streaming)
```

### Detalhamento do passo 4 (backend)

1. A **API Route** `src/app/api/mensagens/route.ts` recebe:
   - mensagem do usuário;
   - `conversationId`;
   - currículo (caso exista).

2. O **Orquestrador** (`src/agentes/orquestrador.ts`) instancia o agente LangChain com suas tools.

3. O **Agente Pathfinder** executa o fluxo:

   - Se houver currículo → extrai texto via `unpdf` (tool `extrair_texto_pdf`);
   - Estrutura os dados do currículo via LLM (tool `estruturar_dados_curriculo`);
   - Busca vagas semanticamente relevantes no Supabase (tool `consultar_banco_vetorial`);
   - Compara habilidades → executa **Gap Analysis**;
   - Solicita horas de estudo e nível de ambição (caso não informados);
   - Gera roadmap em JSON:
     - curto prazo;
     - médio prazo;
     - longo prazo;
     - links educacionais via `buscar_recursos_educacionais`.

4. A resposta é enviada ao frontend em **streaming SSE (Server-Sent Events)**.

5. A persistência ocorre de forma assíncrona:
   - mensagens → tabelas `conversas` e `mensagens`;
   - currículo processado → tabela `curriculos`;
   - PDF → armazenado no Cloudflare R2.

## Fluxo Alternativo (sem currículo)

- O usuário não envia currículo;
- O agente Pathfinder atua apenas com:
  - cargo-alvo;
  - conhecimento interno;
  - vagas similares recuperadas semanticamente.

Nesse cenário:

- ainda pode haver busca semântica de vagas para contextualizar o mercado;
- não existe **Gap Analysis individualizada**;
- o roadmap é **genérico**, baseado nas competências típicas do cargo desejado.

## Fluxo de Geração do Roadmap Visual

Após o término do streaming, o frontend:

1. Extrai o JSON do roadmap da resposta do agente (`<roadmap>...</roadmap>`).
2. Renderiza um diagrama interativo com **React Flow** (`DiagramaRoadmapReactFlow`).
3. Permite clicar em cada nó:
   - abrir recursos educacionais;
   - usar links já retornados pelo agente.
4. Gera um PDF estilizado com `jspdf` + canvas.

## Diagrama de Sequência (textual)

```text
Usuário → Frontend (Next.js)
          ↓ POST /api/mensagens
       API Route (serverless)
          ↓ instancia
       Orquestrador LangChain
          ↓ executa tools
       → extrair_texto_pdf (R2 → texto)
       → estruturar_dados_curriculo (LLM)
       → consultar_banco_vetorial (Supabase pgvector)
       → buscar_recursos_educacionais (Tavily API)
          ↓ gera resposta final
       Agente Pathfinder → streaming SSE
          ↓ frontend recebe chunks
       Atualiza UI (MessageBubble, StreamingIndicator)
          ↓ ao final
       Salva conversa (Supabase)
       Gera roadmap visual
```

## Componentes da Arquitetura (`src/`)

| Pasta | Responsabilidade |
|---|---|
| `src/agentes/` | Definição do agente, tools e fallback |
| `src/app/` | Rotas Next.js (API e páginas) |
| `src/componentes/` | Componentes React (chat, modais, sidebar e diagrama) |
| `src/lib/` | Utilitários (Supabase, R2, LangChain client, PDF etc.) |
| `src/contextos/` | Contextos React (tema, conversa e currículo) |
| `src/hooks/` | Hooks customizados (`useChat`, `useStreaming` etc.) |
| `src/tipos/` | Definições TypeScript compartilhadas |

## Segurança e Isolamento

- **RLS (Row Level Security)** no Supabase:
  cada usuário acessa apenas suas próprias conversas, mensagens e currículos.

- **Variáveis de ambiente apenas no servidor**:
  chaves do DeepSeek, Tavily e Supabase Service Role nunca são expostas ao cliente.

- **Presigned URLs do R2**:
  uploads acontecem diretamente do frontend sem expor credenciais de storage.

- **Validação de sessão**:
  aplicada em todas as API Routes (exceto endpoints públicos, se existirem).

## Observabilidade e Logs

- Logs estruturados no backend (Vercel Functions);
- Falhas de tools e fallback registrados no servidor;
- Erros de rede e timeout tratados no frontend com mensagens amigáveis;
- Possibilidade de futura integração com observabilidade (Sentry, Logtail ou OpenTelemetry).

---

**Última atualização:** Maio de 2026