# Decisões Técnicas

Este documento explica as principais escolhas de arquitetura, bibliotecas e serviços do NextStepAI, contextualizando os trade-offs e os motivos que levaram a cada decisão.

## 1. Framework Frontend: Next.js 14 com App Router

**Escolha:** Next.js 14 (App Router) + React Server Components.

**Motivos:**
- **API routes nativas** – Permitem construir endpoints serverless (como `/api/mensagens` para streaming) sem servidor adicional.
- **Streaming integrado** – Suporte nativo a Server-Sent Events (SSE) e `ReadableStream`, essencial para o agente responder em tempo real.
- **Renderização híbrida** – Páginas estáticas (landing, docs) e dinâmicas (chat) no mesmo projeto.
- **Roteamento baseado em pastas** – Organização intuitiva para equipe acadêmica.

**Alternativa rejeitada:** Vite + React Router. Exigiria um backend separado (Express, Fastify) para as API routes, aumentando a complexidade de deploy.

---

## 2. Modelo de Linguagem (LLM): Deepseek

**Escolha:** Deepseek (modelo `deepseek-chat` via API da Deepseek).

### Histórico e razões

| Tentativa | Problema | Motivo da troca |
|-----------|----------|----------------|
| **Groq (Mixtral 8x7B, Llama 3)** | Rate limit extremamente baixo para desenvolvedores gratuitos | Groq fechou o plano gratuito para novas contas durante o desenvolvimento. Limites de 30 req/min inviabilizavam testes simultâneos da equipe. |
| **OpenAI GPT-oss-120b (via Groq)** | Mesmo rate limit do Groq + indisponibilidade do modelo | O modelo `gpt-oss-120b` era experimental e frequentemente removido. |
| **Deepseek** | ✅ Preço baixo (US$ 0,14/1M tokens) / janela de 64k tokens / sem rate limits severos | Escolhido por custo-efetividade, estabilidade e boa performance para tarefas de raciocínio estruturado (gap analysis, roadmap). |

### Benefícios

- Excelente custo-benefício para uso intensivo de prompts.
- Boa capacidade de raciocínio estruturado.
- Compatibilidade adequada com LangChain.js.
- Suporte estável a streaming de tokens.

### Benefício adicional

Deepseek permite uso de tags `<thinking>` no system prompt sem degradação significativa de qualidade, permitindo raciocínio interno controlado durante desenvolvimento e debugging.

### Fallback

Caso a chave Deepseek expire, fique indisponível ou exceda limites, o orquestrador alterna automaticamente para um modelo fallback menor via Groq (Llama 3 8B).

---

## 3. Banco de Dados, Autenticação e Busca Vetorial: Supabase + pgvector

**Escolha:** Supabase (PostgreSQL + extensão pgvector + Supabase Auth).

### Motivos

- **Pgvector nativo** – Busca por similaridade de cosseno com índices IVFFlat, ideal para embeddings de 384 dimensões (HuggingFace MiniLM).
- **Autenticação integrada** – Supabase Auth com autenticação via e-mail e senha.
- **RLS (Row Level Security)** – Controle de acesso simplificado, garantindo isolamento entre usuários.
- **Realtime (não usado ainda)** – Possibilidade futura de roadmap colaborativo e sincronização em tempo real.
- **Custo zero** – Plano gratuito suficiente para o MVP acadêmico.

### Motivo da migração do NextAuth.js para Supabase Auth

Durante as primeiras versões do projeto, a autenticação era gerenciada com **NextAuth.js**, utilizando providers OAuth (GitHub e Google), além de credenciais tradicionais.

Ao longo do desenvolvimento, a equipe decidiu migrar completamente para **Supabase Auth**, centralizando autenticação, sessão e gerenciamento de usuários em uma única plataforma.

### Problemas encontrados com NextAuth + OAuth

- **Sessões inconsistentes** – Em alguns cenários, tokens expiravam silenciosamente e a interface continuava autenticada.
- **Problemas de sincronização** – Múltiplas abas e refresh da aplicação geravam estados divergentes de sessão.
- **Complexidade de callback URLs** – Diferenças entre ambiente local e produção aumentavam falhas de configuração.
- **Maior superfície de bugs** – OAuth + persistência de sessão + gerenciamento externo adicionavam complexidade desnecessária ao MVP.
- **Prazo acadêmico limitado** – Corrigir completamente os fluxos OAuth consumiria tempo desproporcional ao valor agregado.

### Decisão adotada

A equipe optou por:

- remover autenticação via GitHub;
- remover autenticação via Google;
- abandonar o NextAuth.js;
- padronizar autenticação exclusivamente com e-mail e senha via Supabase Auth.

### Trade-off

#### Perda
- Menor conveniência no onboarding (sem login em um clique).

#### Ganho
- Fluxo de autenticação mais previsível.
- Redução significativa de bugs relacionados a sessão.
- Menor complexidade arquitetural.
- Menor custo de manutenção.
- Integração mais simples com RLS e banco de dados.

### Consideração futura

A arquitetura permanece compatível com OAuth via Supabase Auth. Isso significa que GitHub e Google Auth podem ser reativados futuramente sem grandes refatorações.

### Alternativa rejeitada

**Pinecone** (banco vetorial dedicado).

**Motivo da rejeição:**
- aumentaria a complexidade operacional;
- exigiria dois bancos distintos;
- elevaria custos do MVP.

O `pgvector` apresentou performance suficiente para o volume esperado (~10 mil vagas).

---

## 4. Armazenamento de PDFs: Cloudflare R2 (S3-compatible)

**Escolha:** Cloudflare R2.

### Motivos

- **Sem custo de egress** – Diferente da AWS S3.
- **Presigned URLs** – Upload direto do frontend sem passar pelo servidor.
- **Integração simples** – Compatível com `@aws-sdk/client-s3`.

### Alternativa rejeitada

**Supabase Storage**

Apesar da integração nativa, o limite gratuito de tráfego e download seria insuficiente para múltiplos usuários acessando currículos.

---

## 5. Extração de Texto de PDF: `unpdf` em vez de `pdf-parse`

**Escolha:** `unpdf` (biblioteca ESM-first).

### Motivos

- Compatibilidade total com Next.js App Router.
- Melhor suporte a ESM.
- Melhor estabilidade em PDFs modernos.
- Projeto mais atualizado e mantido.

### Problema do `pdf-parse`

`pdf-parse` é baseado em CommonJS (CJS), causando conflitos frequentes com ambiente ESM do Next.js 14.

### Resultado

Redução aproximada de 30% nas falhas de extração durante testes internos.

---

## 6. Geração de PDF e Diagrama no Cliente

**Decisão:** geração totalmente client-side usando `jspdf`, canvas e React Flow.

### Motivos

- Redução de carga no backend.
- Melhor experiência interativa.
- Escalabilidade superior.
- Evita processamento pesado nas serverless functions.

### Benefícios adicionais

- Diagrama interativo com zoom e cliques.
- Possibilidade de marcação de progresso.
- Geração instantânea sem fila no servidor.

### Trade-off

Diferenças pequenas de renderização entre navegadores.

Mitigado com:
- canvas;
- medição de texto;
- controle de layout.

---

## 7. Uso de Tags `<thinking>` para Raciocínio Interno

**Decisão:** envolver chain-of-thought em tags `<thinking></thinking>`.

### Motivos

- Facilita debugging.
- Permite inspeção de raciocínio nos logs.
- Evita vazamento do raciocínio interno ao usuário final.

### Implementação

O frontend remove automaticamente essas tags antes da renderização usando regex no `MarkdownRenderer`.

---

## 8. Orquestrador com Fallback e Timeouts

**Decisão:** isolar execução do agente e tratar falhas em múltiplos níveis.

### Estratégias adotadas

1. **Timeout por tool**
   - `Promise.race` com timeout de 15 segundos.

2. **Fallback automático**
   - Caso o modelo principal falhe antes do primeiro token.

3. **Streaming abortável**
   - Cancelamento via `AbortController`.

### Motivo

Evitar que:
- APIs externas lentas;
- consultas vetoriais demoradas;
- falhas de provider

travem completamente a experiência do usuário.

---

## 9. Uso de LangChain.js em vez de chamadas diretas

**Decisão:** utilizar LangChain.js para orquestração do agente e tools.

### Motivos

- Gerenciamento automático do ciclo de tools.
- Facilidade para adicionar novas tools.
- Integração simples com streaming.
- Melhor rastreamento de eventos.

### Benefícios práticos

O frontend consegue exibir estados como:

> "Pathfinder está analisando seu currículo..."

baseado nos eventos `on_tool_start` e `on_tool_end`.

### Alternativa rejeitada

Loop manual de tools com chamadas diretas ao provider LLM.

**Problemas:**
- mais código;
- maior chance de erro;
- manutenção mais difícil.

---

## 10. Persistência Assíncrona de Mensagens

**Decisão:** salvar mensagens após o streaming terminar.

### Motivos

- Melhor performance.
- Menos escritas no banco.
- Menor acoplamento entre streaming e persistência.

### Fluxo

1. Streaming SSE ocorre normalmente.
2. Ao finalizar:
   - frontend envia requisição separada;
   - backend salva mensagens e conversa.

### Trade-off

Se a persistência falhar:
- a conversa pode permanecer apenas em memória.

Para reduzir o problema:
- foi implementado retry com backoff exponencial.

---

## 11. Uso de Variáveis de Ambiente e Separação Cliente/Servidor

### Regras adotadas

#### Variáveis privadas (somente servidor)

- `SUPABASE_SERVICE_ROLE_KEY`
- `DEEPSEEK_API_KEY`
- `TAVILY_API_KEY`
- `R2_SECRET_ACCESS_KEY`

Utilizadas apenas em:
- API routes;
- tools server-side;
- integração com providers externos.

#### Variáveis públicas

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Utilizadas no cliente para:
- autenticação via Supabase Auth;
- operações protegidas por RLS.

### Segurança

Mesmo que a chave pública seja exposta:
- o usuário só consegue acessar seus próprios dados graças ao RLS.

---

## 12. Streaming SSE em vez de WebSockets

**Decisão:** usar Server-Sent Events (SSE) ao invés de WebSockets.

### Motivos

- Implementação mais simples.
- Compatibilidade nativa com Next.js.
- Menor overhead.
- Ideal para comunicação unidirecional (servidor → cliente).

### Trade-off

SSE não é ideal para comunicação bidirecional em tempo real.

Porém:
- o sistema atual não exige isso;
- o modelo de chat funciona perfeitamente com SSE.

---

## 13. Estruturação Modular do Frontend

**Decisão:** separar componentes em:
- `componentes/`
- `hooks/`
- `contextos/`
- `lib/`

### Motivos

- Melhor escalabilidade.
- Facilidade de manutenção.
- Separação clara de responsabilidades.
- Reaproveitamento de lógica.

### Benefício acadêmico

Facilita:
- onboarding da equipe;
- avaliação do projeto;
- compreensão arquitetural.

---

**Última atualização:** Maio de 2026  
