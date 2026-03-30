# NextStepAI


> Aplicação web inteligente que atua como um mentor de carreira automatizado, mapeando as necessidades reais do mercado e traçando caminhos de desenvolvimento claros e acionáveis.

> ⚠️ **AVISO:** Este arquivo é apenas um esboço inicial do `README.md` do repositório. Ele **não** é o documento oficial de entrega da Etapa 1. Para acessar a proposta, arquitetura e backlog completos (E1), acesse o [Documento da Etapa 1 do Projeto - NextStepAI](https://github.com/Renan-Szimanski/NextStepAI/blob/main/docs/Etapa%201%20-%20Proposta%20do%20Projeto/E1_NextStepAI_VeteranosCC_IA.md).

## Sobre o Projeto

O **NextStepAI** é uma solução voltada para profissionais que desejam evoluir em suas áreas ou migrar de carreira. A partir de uma vaga-alvo informada pelo usuário e do envio opcional de um currículo (PDF), a aplicação utiliza Inteligência Artificial (LLMs) para interpretar requisitos e gerar um plano de ação estratégico.

A IA atua como um agente analítico (Pathfinder) capaz de:
- **Com currículo:** Realizar um *Gap Analysis* rigoroso e identificar lacunas de competências.
- **Sem currículo:** Construir o "Perfil Ideal" da vaga e guiar o usuário desde os fundamentos.
- **Roadmap:** Estruturar um guia prático de desenvolvimento em curto, médio e longo prazo.

---

## Como Executar (Em breve)

*As instruções de instalação, configuração de variáveis de ambiente (`.env`) e execução local serão adicionadas à medida que o projeto avançar.*

---

## Funcionalidades principais

- **Análise de vaga-alvo** — interpreta requisitos reais de mercado via RAG
- **Upload de currículo (PDF)** — gap analysis entre seu perfil e o mercado
- **Roadmap personalizado** — plano de curto, médio e longo prazo
- **Streaming em tempo real** — respostas progressivas token a token
- **Autenticação segura** — login com e-mail/senha ou OAuth
- **Histórico de planos** — consulte análises anteriores a qualquer momento

---

## Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | Next.js 14, Tailwind CSS, shadcn/ui |
| Backend | Next.js API Routes |
| LLM | GPT OSS 120B 128k (via Groq) |
| Orquestração IA | LangChain.js |
| Banco de dados | Supabase (PostgreSQL + pgvector) |
| Autenticação | NextAuth.js v5 |
| Armazenamento | Cloudflare R2 |
| Deploy | Vercel |

---

## Status

> **Em desenvolvimento** — Este projeto está em fase inicial como parte da disciplina de Engenharia de Prompt e Aplicação em IA (8º período CC — Universidade Braz Cubas).

---

## Equipe

- [@Eduardo-Benite](https://github.com/Eduardo-Benite)
- [@LeghoDev](https://github.com/LeghoDev)
- [@Renan-Szimanski](https://github.com/Renan-Szimanski)
- [@RyanDiasRocha](https://github.com/RyanDiasRocha)
- [@vvnqp](https://github.com/vvnqp)

---