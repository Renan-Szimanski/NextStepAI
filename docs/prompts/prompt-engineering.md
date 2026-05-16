# Prompt Engineering — Agente Pathfinder

> **Documento:** `docs/prompts/prompt-engineering.md`  
> **Agente:** Pathfinder — Mentor de Carreira Automatizado  
> **Versão atual do prompt:** `v1.7.1-diagrama-interativo`  
> **Última atualização:** 2026-05-16  

---

## 1. Visão Geral do Agente

O **Pathfinder** é um agente de mentoria de carreira que analisa competências profissionais e gera roadmaps de desenvolvimento personalizados. Ele consulta um banco vetorial de vagas reais e sintéticas para embasar suas recomendações em dados de mercado, em vez de conhecimento genérico.

### Arquivo principal

`pathfinder-system.ts`

### Tools disponíveis

- `consultar_banco_vetorial` (busca semântica)
- `extrair_texto_pdf` (extrai texto de currículo PDF)
- `estruturar_dados_curriculo` (organiza dados do currículo)
- `buscar_recursos_educacionais` (busca web com Tavily)
- `acompanhar_progresso` (registro e consulta de progresso + análise de GitHub)

---

## 2. Histórico de Versões

| Versão | Data | Descrição resumida |
|---|---|---|
| v1.0-mvp | — | Prompt inicial de lançamento (apenas `consultar_banco_vetorial`) |
| v1.1-mvp | — | Ajustes de escopo e regras de segurança |
| v1.2-mvp | 2026-05-05 | Porcentagens, proibição de HTML, fix de abreviação de meses, fix de bug TypeScript |
| v1.3-mvp | 2026-05-08 | Adição dos fluxos: Gap Analysis com currículo, roteamento condicional, regras para novas tools |
| v1.4-mvp | 2026-05-12 | Nova tool `acompanhar_progresso` com registrar/consultar + análise de GitHub |
| v1.5-mvp | 2026-05-12 | Roadmap interativo com diagrama React Flow; instruções de regeneração |
| v1.6-mvp | 2026-05-14 | Porcentagem de compatibilidade currículo-vaga obrigatória (cálculo, exibição, frases) |
| v1.7-mvp | 2026-05-16 | Sugestões exaustivas (sem limite de itens); personalização por horas de estudo e nível de ambição; ajuste dinâmico de prazos |
| v1.7.1-diagrama-interativo | 2026-05-16 | Reforço da porcentagem de compatibilidade; obrigatoriedade de título de refinamento com lista de funcionalidades; correção do uso de hífen normal nos intervalos |

---

## 2.1 Arquivo de referência

O arquivo `pathfinder-system.ts` exporta duas constantes:

- `VERSAO_PROMPT` — string de controle de versão (ex.: `'v1.7.1-diagrama-interativo'`). Deve ser incrementada a cada alteração no system prompt.
- `SYSTEM_PROMPT_PATHFINDER` — o system prompt completo injetado como mensagem de sistema na API.

---

## 2.2 Convenção de versionamento

Padrão adotado: `vMAJOR.MINOR-STAGE`

- **MAJOR** sobe em mudanças estruturais de comportamento (nova tool, mudança de persona).
- **MINOR** sobe em refinamentos e correções de comportamento.
- **STAGE** indica o estágio: `mvp`, `beta`, `prod`.

---

## 2.3 System prompt atual

> System prompt em produção na versão `v1.7.1-diagrama-interativo`.  
> Ver arquivo `src/agentes/prompts/pathfinder-system.ts`.

---

## 3. Iterações de Prompt Engineering

### Iteração 1 — Porcentagens, formato e abreviações (`v1.1-mvp` → `v1.2-mvp`)

#### Problema identificado

Três comportamentos indesejados foram identificados:

1. **Ausência de frequência nas competências**  
   O modelo listava competências técnicas sem indicação de relevância relativa. SQL e uma ferramenta de nicho apareciam com o mesmo peso visual, impossibilitando a priorização pelo usuário.

2. **Uso de HTML nas respostas**  
   Em alguns clientes de renderização, o modelo produzia tags HTML (`<b>`, `<br>`, `<ul>`) em vez de Markdown nativo, quebrando o layout.

3. **Abreviação incorreta de "meses"**  
   O modelo escrevia `Curto prazo (0-3 mes)` em vez de `Curto prazo (0-3 meses)`.

#### Solução aplicada (`v1.2-mvp`)

- Obrigatoriedade de exibir a frequência de cada competência como porcentagem do total de vagas retornadas.
- Proibição explícita de HTML — uso exclusivo de Markdown.
- Correção da palavra "meses" no plural e padronização do formato dos intervalos.

---

### Iteração 2 — Ferramenta de acompanhamento de progresso (`v1.3-mvp` → `v1.4-mvp`)

#### Problema identificado

Os roadmaps gerados eram estáticos. O usuário não tinha como registrar o que já havia estudado, nem como obter uma análise automática de seu GitHub. Isso limitava o acompanhamento contínuo.

#### Solução aplicada (`v1.4-mvp`)

- Nova tool `acompanhar_progresso` com três ações:
  - `registrar`: salva nível e porcentagem de domínio de uma habilidade.
  - `consultar`: recupera o progresso do usuário.
  - `analisar_github`: extrai competências de um repositório público via inferência (linguagens, frameworks, padrões).

- Inclusão de frases sugeridas para o agente usar ao oferecer o recurso.

---

### Iteração 3 — Roadmap interativo e diagrama visual (`v1.4-mvp` → `v1.5-mvp`)

#### Problema identificado

O roadmap era puramente textual. O frontend havia implementado um diagrama React Flow, mas o agente não sabia como interagir com ele nem tirava proveito da interatividade.

#### Solução aplicada (`v1.5-mvp`)

- Adição de seção "Roadmap Interativo e Diagrama Visual" no system prompt.
- Obrigatoriedade de incluir a dica:

```md
💡 **Dica interativa**: No diagrama visual... clique em qualquer skill...
```

ao final de cada roadmap.

- Instrução específica para oferecer **regeneração do roadmap** quando o usuário relatar problemas no diagrama.

---

### Iteração 4 — Porcentagem de compatibilidade currículo-vaga (`v1.5-mvp` → `v1.6-mvp`)

#### Problema identificado

No Fluxo B (gap analysis com currículo), o agente listava pontos fortes e lacunas, mas não fornecia uma métrica objetiva do quanto o perfil do usuário já atendia ao cargo-alvo. O usuário ficava sem noção de sua posição relativa.

#### Solução aplicada (`v1.6-mvp`)

Cálculo **obrigatório** da porcentagem de compatibilidade conforme fórmula:

```text
Compatibilidade (%) =
(Soma dos pesos das habilidades que o usuário POSSUI)
/
(Soma dos pesos de todas as habilidades exigidas)
* 100
```

Regras de ponderação:

- habilidade principal → peso 2
- habilidade secundária → peso 1
- proficiência parcial → 50% do peso

Exibição obrigatória no topo do Gap Analysis, logo abaixo da linha de personalização, com frase adicional conforme a faixa:

- ≥80% → `🎉 Você já tem a maioria das habilidades!`
- ≤40% → `🛤️ Você está no início da jornada.`
- 41%-79% → `📈 Bom progresso! Vamos preencher as lacunas.`

---

### Iteração 5 — Sugestões exaustivas e personalização avançada (`v1.6-mvp` → `v1.7-mvp`)

#### Problema identificado

1. O agente frequentemente limitava o roadmap a 5 itens por fase, omitindo habilidades importantes.
2. Os prazos eram fixos (`3/6/12 meses`), ignorando a carga horária real do usuário.
3. Não havia distinção entre conteúdo para vagas de alto nível (FAANG) e mercado comum.

#### Solução aplicada (`v1.7-mvp`)

##### Sugestões exaustivas

Diretriz explícita para listar **todas** as competências identificadas, sem limite:

- 5 a 15 itens no curto prazo
- 5 a 20 no médio prazo
- 3 a 15 no longo prazo

##### Personalização por horas de estudo

Cálculo dinâmico dos prazos usando fator:

```text
4 / H
```

Onde:

- `H = horas/dia`

Com arredondamento para cima.

##### Personalização por nível de ambição

- Se nível = `alto`:
  - algoritmos avançados
  - system design
  - entrevistas STAR
  - certificações pesadas

- Se nível = `normal`:
  - foco em habilidades práticas

##### Ordem obrigatória de execução

Antes de qualquer roadmap:

1. verificar horas de estudo
2. verificar nível de ambição
3. perguntar ao usuário se faltarem informações

---

### Iteração 6 — Reforço de regras e formatação final (`v1.7-mvp` → `v1.7.1-diagrama-interativo`)

#### Problema identificado

- Apesar de já existir a regra de porcentagem, o agente ainda pulava o cálculo em alguns casos.
- O parser do diagrama era sensível ao tipo de hífen usado nos intervalos (`–` vs `-`), causando falhas silenciosas.
- O título `"✨ O que mais posso fazer por você?"` com a lista de funcionalidades não era incluído consistentemente.

#### Solução aplicada (`v1.7.1-diagrama-interativo`)

- Reforço do texto da porcentagem:

```text
VOCÊ DEVE calcular e exibir esta porcentagem.
NÃO PULE esta etapa.
```

- Especificação exata do caractere:
  - usar **hífen normal (`-`)**
  - nunca en-dash (`–`)
  - nunca em-dash (`—`)

Exemplo correto:

```text
Curto prazo (0-6 meses)
```

- Obrigatoriedade de encerrar **toda resposta que contenha roadmap** com:
  - título `"✨ O que mais posso fazer por você?"`
  - lista de funcionalidades
  - dica do diagrama

- Novo título de refinamento interno:

```text
Porcentagem de Compatibilidade Currículo-Vaga (Fluxo B) – OBRIGATÓRIA
```

com destaque.

---

## 4. Troubleshooting

### Se o problema persistir

Abra uma issue no GitHub anexando:

- logs do console
- capturas de tela
- payload da resposta do agente
- versão do prompt utilizada
