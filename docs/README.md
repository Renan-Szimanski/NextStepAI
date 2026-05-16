# Documentação Técnica – NextStepAI

Bem-vindo à documentação completa do **NextStepAI**, um mentor de carreira automatizado que utiliza IA para analisar currículos, comparar com vagas reais e gerar roadmaps personalizados.

## Índice

### Arquitetura
- [Visão Geral da Arquitetura](./arquitetura/visao-geral.md) — Stack tecnológica, fluxos de dados e componentes.
- [Diagramas de Fluxo](./arquitetura/diagramas.md) — Representações visuais dos principais processos.
- [Decisões Técnicas](./arquitetura/decisoes-tecnicas.md) — Por que escolhemos cada tecnologia.

### Configuração
- [Variáveis de Ambiente](./configuracao/ambiente.md) — Lista completa de variáveis e como obtê-las.
- [Deploy na Vercel](./configuracao/deploy.md) — Passo a passo para publicar a aplicação.
- [Configuração do Supabase](./configuracao/supabase.md) — Migrations, RLS, autenticação.

### Desenvolvimento
- [Setup Local](./desenvolvimento/setup-local.md) — Pré-requisitos e comandos para rodar o projeto.
- [Scripts Úteis](./desenvolvimento/scripts.md) — Seed de vagas, testes, etc.
- [Estrutura do Projeto](./desenvolvimento/estrutura-projeto.md) — Explicação da árvore `src/`.

### Agentes e Tools
- [Agente Pathfinder](./agentes/pathfinder.md) — System prompt, fluxos A e B, personalização.
- [Tools do Agente](./agentes/tools.md) — `extrair_texto_pdf`, `estruturar_dados_curriculo`, `consultar_banco_vetorial`, `buscar_recursos_educacionais`, `acompanhar_progresso`.
- [Mecanismo de Fallback](./agentes/fallback.md) — Tolerância a falhas e modelo secundário.

### Frontend
- [Componentes React](./frontend/componentes.md) — Chat, upload, modais, sidebar.
- [Estilos e Temas](./frontend/estilos.md) — Tailwind, tema claro/escuro, acessibilidade.
- [Responsividade](./frontend/responsividade.md) — Suporte mobile e sidebar colapsável.

### Backend e API
- [Rotas da API](./backend/api-routes.md) — Endpoints (chat, currículo, planos, autenticação).
- [Integração com Supabase](./backend/supabase-integracao.md) — Clientes, funções de persistência.
- [Storage Cloudflare R2](./backend/r2-storage.md) — Upload direto, presigned URLs.

### Banco de Dados
- [Esquema do Banco](./banco-de-dados/schema.md) — Tabelas `conversas`, `mensagens`, `curriculos`, `progresso_usuario`.
- [Migrations](./banco-de-dados/migrations.md) — Histórico de versões do schema.
- [Busca Vetorial (pgvector)](./banco-de-dados/pgvector.md) — Embeddings, índice IVFFlat, função `match_vagas`.

### Guias
- [Para Usuários](./guias/para-usuarios.md) — Manual de uso do chat, upload, roadmap.
- [Para Desenvolvedores](./guias/para-desenvolvedores.md) — Como adicionar tools, modificar prompts, testar.
- [Troubleshooting](./guias/troubleshooting.md) — Problemas comuns e soluções.

### Métricas
- [Relatório Lighthouse](./metricas/lighthouse.md) — Performance, acessibilidade e boas práticas.

---

**Última atualização:** Maio de 2026  
**Versão do projeto:** E3 (MVP completo)