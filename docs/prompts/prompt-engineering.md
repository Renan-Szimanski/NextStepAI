# Prompt Engineering — Agente Pathfinder

> **Documento:** `docs/prompts/prompt-engineering.md`
> **Agente:** Pathfinder — Mentor de Carreira Automatizado
> **Versão atual do prompt:** `v1.3-mvp`
> **Última atualização:** 2026-05-13

---

## 1. Visão Geral do Agente

O **Pathfinder** é um agente de mentoria de carreira que analisa competências profissionais e gera roadmaps de desenvolvimento personalizados. Ele consulta um banco vetorial de vagas reais e sintéticas para embasar suas recomendações em dados de mercado, em vez de conhecimento genérico.

**Arquivo principal:** `pathfinder-system.ts`
**Tools disponíveis:**
- `consultar_banco_vetorial` (busca semântica)
- `extrair_texto_pdf` (extrai texto de currículo PDF)
- `estruturar_dados_curriculo` (organiza dados do currículo)
- `buscar_recursos_educacionais` (busca web com Tavily)

---

## 2. Histórico de Versões

| Versão | Data | Descrição resumida |
|--------|------|--------------------|
| v1.0-mvp | — | Prompt inicial de lançamento (apenas `consultar_banco_vetorial`) |
| v1.1-mvp | — | Ajustes de escopo e regras de segurança |
| v1.2-mvp | 2026-05-05 | Porcentagens, proibição de HTML, fix de abreviação de meses, fix de bug TypeScript |
| v1.3-mvp | 2026-05-13 | Adição dos fluxos: Gap Analysis com currículo, roteamento condicional, regras para novas tools |

---

## 2.1 Arquivo de referência

**`pathfinder-system.ts`** exporta duas constantes:

- `VERSAO_PROMPT` — string de controle de versão (ex.: `'v1.3-mvp'`). Deve ser incrementada a cada alteração no system prompt.
- `SYSTEM_PROMPT_PATHFINDER` — o system prompt completo injetado como mensagem de sistema na API.

---

## 2.2 Convenção de versionamento

Padrão adotado: `vMAJOR.MINOR-STAGE`

- **MAJOR** sobe em mudanças estruturais de comportamento (nova tool, mudança de persona).
- **MINOR** sobe em refinamentos e correções de comportamento.
- **STAGE** indica o estágio: `mvp`, `beta`, `prod`.

---

## 2.3 System prompt atual

> System prompt em produção na versão `v1.3-mvp`. Ver arquivo `src/agentes/prompts/pathfinder-system.ts`.

---

## 3. Iterações de Prompt Engineering

### Iteração 1 — Porcentagens, formato e abreviações (`v1.1-mvp` → `v1.2-mvp`)

**Problema identificado:**

Três comportamentos indesejados foram identificados:

1. **Ausência de frequência nas competências**  
   O modelo listava competências técnicas sem indicação de relevância relativa. SQL e uma ferramenta de nicho apareciam com o mesmo peso visual, impossibilitando a priorização pelo usuário.

2. **Uso de HTML nas respostas**  
   Em alguns clientes de renderização, o modelo produzia tags HTML (`<b>`, `<br>`, `<ul>`) em vez de Markdown nativo, quebrando o layout.

3. **Abreviação incorreta de "meses"**  
   O modelo escrevia "Curto prazo (0–3 mes)" em vez de "Curto prazo (0–3 meses)".

**Prompt antes (trechos relevantes — `v1.1-mvp`):**
