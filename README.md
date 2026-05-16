# NextStepAI

> Mentor de carreira automatizado baseado em IA: análise de currículo, gap analysis com mercado real e roadmap personalizado.

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![LangChain](https://img.shields.io/badge/LangChain-0.3-green)](https://langchain.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL+pgvector-orange)](https://supabase.com/)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

## 🎯 Sobre o Projeto

O **NextStepAI** é uma aplicação web inteligente que atua como um mentor de carreira automatizado. O usuário informa um cargo-alvo e, opcionalmente, envia seu currículo em PDF. O sistema:

- Extrai e estrutura os dados do currículo (experiências, habilidades, formação).
- Consulta um **banco vetorial** com centenas de vagas reais e sintéticas para entender o que o mercado exige.
- Realiza um **Gap Analysis** (análise de lacunas) comparando o perfil do usuário com as competências mais pedidas.
- Gera um **roadmap de estudos personalizado** (curto, médio e longo prazo) com base nas horas de estudo disponíveis e no nível de ambição (FAANG/big tech vs. mercado comum).
- Disponibiliza automaticamente **PDF estilizado** e **diagrama interativo** do roadmap.
- Oferece **recursos educacionais atualizados** (cursos, tutoriais) via busca na web (Tavily).

Tudo isso com **streaming de respostas** (SSE), **histórico de conversas** salvo no Supabase, **acessibilidade WCAG 2.1 AA** e **layout responsivo**.

## 🚀 Funcionalidades Principais

| Funcionalidade | Descrição |
|---|---|
| **Upload de currículo** | Envio de PDF para Cloudflare R2 via presigned URL. |
| **Extração de texto** | Leitura do PDF com `unpdf` (compatível com ESM). |
| **Estruturação de dados** | LLM extrai nome, experiências, habilidades e idiomas (JSON). |
| **Busca semântica de vagas** | Embeddings das vagas com pgvector e HuggingFace. |
| **Gap Analysis** | Compara o perfil do usuário com exigências do mercado. |
| **Roadmap personalizado** | Ajusta prazos conforme horas de estudo diárias (padrão: 4h) e nível de ambição (alto/normal). |
| **PDF automático** | Geração no cliente com `jspdf` + canvas. |
| **Diagrama interativo** | Visualização em React Flow com cliques para recursos. |
| **Recursos educacionais** | Busca real na web (Tavily): cursos, documentação e tutoriais. |
| **Histórico** | Conversas salvas no Supabase, retomáveis pela sidebar. |
| **Autenticação** | GitHub OAuth ou e-mail/senha via Supabase Auth. |
| **Acessibilidade** | WCAG 2.1 AA — 0 violações no axe-cli. |
| **Lazy loading** | Componentes pesados carregados sob demanda. |

## 📦 Tecnologias

| Camada | Tecnologias |
|---|---|
| **Frontend** | Next.js 14 (App Router), Tailwind CSS, shadcn/ui, React Flow |
| **Backend IA** | LangChain.js, DeepSeek (LLM), Tavily Search |
| **Banco de dados** | Supabase (PostgreSQL + pgvector) |
| **Armazenamento** | Cloudflare R2 (presigned URLs) |
| **Autenticação** | NextAuth.js v5 (GitHub, e-mail/senha) |
| **Processamento de PDF** | `unpdf` (`pdf-parse` substituído) |
| **Geração de PDF** | `jspdf` + canvas |
| **Deploy** | Vercel |

## 🛠️ Como Executar Localmente

### Pré-requisitos

- Node.js 18+
- npm ou yarn
- Conta no Supabase (gratuita)
- Conta no Cloudflare R2 (gratuita)
- Chave de API do DeepSeek (ou Groq — configurável)

### 1. Clone o repositório

```bash
git clone https://github.com/Renan-Szimanski/NextStepAI.git
cd NextStepAI
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha com suas chaves.

Veja os detalhes em:

```txt
./docs/configuracao/ambiente.md
```

### 4. Configure o Supabase

- Crie um projeto no Supabase.
- Execute as migrations (SQL) disponíveis em `supabase/migrations/` via SQL Editor.
- Habilite a extensão `vector`.

### 5. Popule o banco de vagas (opcional)

```bash
npm run seed:test   # 10 vagas de teste
npm run seed:clean  # todas as vagas 
```

### 6. Inicie o servidor de desenvolvimento

```bash
npm run dev
```

### 7. Acesse

```txt
http://localhost:3000
```

## 📚 Documentação Técnica

Para desenvolvedores eavaliadores, a documentação completa está disponível na pasta `./docs/`.

Inclui:

- Arquitetura e decisões técnicas
- Configuração de ambiente e deploy
- Guia de uso do agente e suas tools
- Manual do usuário e troubleshooting
- Relatórios de performance e acessibilidade

## 🤝 Contribuição

Projeto acadêmico desenvolvido pelos alunos do 8º período de Ciência da Computação da Universidade Braz Cubas.

Sugestões e melhorias são **bem-vindas** via issues ou pull requests.

## 👥 Equipe

- [@Eduardo-Benite](https://github.com/Eduardo-Benite)
- [@LeghoDev](https://github.com/LeghoDev)
- [@Renan-Szimanski](https://github.com/Renan-Szimanski)
- [@RyanDiasRocha](https://github.com/RyanDiasRocha)
- [@vvnqp](https://github.com/vvnqp)

## 📄 Licença

MIT

---

**Última atualização:** Maio de 2026