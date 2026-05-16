# Tools do Agente Pathfinder

O agente Pathfinder utiliza **5 ferramentas (tools)** para acessar dados externos (currículo, banco de vagas, web, GitHub) e registrar progresso. Cada tool é implementada com o padrão LangChain `tool()` e utiliza schemas Zod para validação de parâmetros.

A lista completa está em:

```ts
// src/agentes/ferramentas/index.ts

export const todasAsTools = [
  consultarBancoVetorial,
  extrairTextoPdf,
  estruturarDadosCurriculo,
  buscarRecursosEducacionais,
  acompanharProgressoTool,
];
```

---

# Arquitetura Geral

```txt
Usuário
   ↓
Agente Pathfinder
   ↓
LangChain React Agent
   ↓
Tools
   ├── extrair_texto_pdf
   ├── estruturar_dados_curriculo
   ├── consultar_banco_vetorial
   ├── buscar_recursos_educacionais
   └── acompanhar_progresso
```

---

# 1. `extrair_texto_pdf`

## Objetivo

Baixar o currículo PDF do usuário (armazenado no Cloudflare R2) e extrair seu texto bruto usando `unpdf`.

O texto extraído é salvo no banco para reutilização posterior.

---

## Quando é utilizada

A tool é invocada quando:

- o usuário informa que enviou um currículo;
- o agente precisa iniciar o Fluxo B (Gap Analysis);
- é necessário reconstruir dados do currículo.

---

## Parâmetros

Nenhum.

O `usuarioId` é propagado automaticamente pelo `RunnableConfig`.

---

## Fluxo interno

```txt
Supabase
   ↓
buscar currículo
   ↓
R2 presigned URL
   ↓
download do PDF
   ↓
unpdf
   ↓
extração de texto
   ↓
limpeza
   ↓
persistência no banco
```

---

## Comportamento interno

- Retry automático de consulta ao banco (até 3 tentativas);
- Download do PDF com timeout de 30 segundos;
- Extração usando:
  - `getDocumentProxy`
  - `extractText`
- Limpeza de:
  - múltiplas quebras de linha;
  - espaços redundantes;
  - caracteres inválidos;
- PDFs com menos de 100 caracteres são considerados escaneados/imagem;
- Atualiza:
  - `texto_extraido`
  - timestamps de processamento.

---

## Exemplo de retorno

### Sucesso

```txt
Texto extraído do currículo (2350 caracteres):

Nome: Vinícius Moreno
Formação: Ciência da Computação (2022-2026)
Experiências:
...
```

### Erro

```txt
Nenhum currículo encontrado.
```

```txt
PDF parece ser uma imagem escaneada.
```

---

# 2. `estruturar_dados_curriculo`

## Objetivo

Transformar o texto bruto do currículo em JSON estruturado usando LLM.

Extrai:

- formação;
- experiências;
- habilidades;
- idiomas;
- nome;
- contato;
- projetos.

O resultado é salvo no banco e retornado ao agente como resumo estruturado.

---

## Quando é utilizada

Sempre após:

```txt
extrair_texto_pdf
```

No Fluxo B.

---

## Parâmetros

```ts
{
  textoCurriculo: string
}
```

---

## Fluxo interno

```txt
texto bruto
   ↓
prompt rígido
   ↓
LLM
   ↓
JSON estruturado
   ↓
validação
   ↓
persistência
   ↓
resumo legível
```

---

## Comportamento interno

- Trunca entrada para 8000 caracteres;
- Utiliza prompt estrito:
  - responder apenas JSON;
- Retry automático em caso de parsing inválido;
- Normaliza arrays vazios;
- Salva em:
  - `dados_estruturados`;
- Gera resumo textual para o agente.

---

## Exemplo de resumo retornado

```txt
✅ Currículo estruturado com sucesso.

=== DADOS REAIS DO CURRÍCULO DO USUÁRIO ===

Formação:
- Ciência da Computação — Universidade X (2022-2026)

Experiências:
- Estágio em QA

Habilidades técnicas:
- Cypress
- Selenium
- Java
- Python

Idiomas:
- Inglês C2

⚠️ IMPORTANTE:
Estas são as únicas informações válidas do currículo.
```

---

## Regra crítica

O Pathfinder:

- NÃO pode inventar dados;
- NÃO pode inferir experiências;
- NÃO pode criar habilidades inexistentes.

Toda análise deve usar exclusivamente:

```txt
dados_estruturados
```

---

# 3. `consultar_banco_vetorial`

## Objetivo

Realizar busca semântica em vagas utilizando embeddings e pgvector.

Retorna vagas mais similares ao cargo-alvo informado pelo usuário.

---

## Quando é utilizada

Sempre que o usuário mencionar:

- um cargo;
- objetivo profissional;
- transição de carreira;
- nova direção profissional.

---

## Parâmetros

```ts
{
  query: string
}
```

---

## Fluxo interno

```txt
query
   ↓
embedding
   ↓
pgvector
   ↓
match_vagas()
   ↓
ranking semântico
   ↓
retorno estruturado
```

---

## Comportamento interno

- Embeddings:
  - `Xenova/all-MiniLM-L6-v2`
- RPC:
  - `match_vagas`
- Timeout:
  - 15 segundos;
- Top K:
  - atualmente 3 vagas;
- Em caso de erro:
  - retorna fallback estruturado;
  - NÃO lança exceção fatal.

---

## Exemplo de retorno

```json
{
  "erro": false,
  "vagas": [
    {
      "titulo": "Analista de QA",
      "empresa": "TechCorp",
      "requisitos": "Cypress, SQL, CI/CD",
      "descricao": "Automação de testes..."
    }
  ]
}
```

---

## Como o Pathfinder usa o retorno

O agente NÃO deve:

- listar vagas literalmente;
- copiar descrições;
- citar empresas como regra.

O agente deve:

- extrair padrões;
- calcular frequências;
- identificar competências recorrentes;
- gerar roadmap baseado no mercado.

---

# 4. `buscar_recursos_educacionais`

## Objetivo

Buscar recursos reais de estudo na web usando Tavily.

Tipos de recurso:

- cursos;
- documentação;
- tutoriais;
- artigos;
- vídeos;
- guias práticos.

---

## Quando é utilizada

Quando o usuário pedir:

- "como aprender X";
- "onde estudar";
- "me manda recursos";
- "curso de X";
- "tutorial de Y".

Também pode ser usada:

- ao clicar skills no diagrama;
- para enriquecer roadmaps.

---

## Parâmetros

```ts
{
  habilidades: string[],
  nivel?: 'iniciante' | 'intermediário' | 'avançado'
}
```

---

## Fluxo interno

```txt
skills
   ↓
query dinâmica
   ↓
Tavily Search
   ↓
links reais
   ↓
markdown formatado
```

---

## Comportamento interno

- `maxResults = 5`;
- monta queries automaticamente;
- retorna:
  - título;
  - URL;
  - resumo curto.

---

## Exemplo de retorno

```md
# Recursos encontrados

- [Curso de SQL](https://...)
- [Documentação Cypress](https://...)
- [Guia Postman](https://...)
```

---

## Regra crítica

O Pathfinder:

- NUNCA deve inventar links;
- NUNCA deve sugerir URLs falsas;
- deve usar exclusivamente resultados da tool.

---

# 5. `acompanhar_progresso`

## Objetivo

Registrar, consultar e analisar progresso do usuário.

Também é responsável pela análise de repositórios GitHub.

---

# Modos de operação

---

## A. Registrar progresso

### Parâmetros

```ts
{
  acao: 'registrar',
  habilidade: 'React',
  nivel: 'intermediario',
  porcentagem: 60
}
```

---

## Comportamento

- cria ou atualiza progresso;
- persiste no banco;
- permite acompanhamento contínuo.

---

## Exemplo de retorno

```txt
✅ Progresso registrado:
React — intermediário (60%)
```

---

# B. Consultar progresso

## Parâmetros

```ts
{
  acao: 'consultar'
}
```

ou

```ts
{
  acao: 'consultar',
  habilidade: 'React'
}
```

---

## Exemplo de retorno

```txt
📊 React — intermediário (60%)
📊 Cypress — avançado (80%)
```

---

# C. Analisar GitHub

## Parâmetros

```ts
{
  acao: 'analisar_github',
  githubUrl: 'https://github.com/user/repo'
}
```

---

## Fluxo interno

```txt
URL GitHub
   ↓
parse owner/repo
   ↓
GitHub API
   ↓
linguagens
   ↓
inferência de stack
   ↓
nível sugerido
   ↓
recomendações
```

---

## Informações inferidas

A tool identifica:

- linguagens;
- stack principal;
- tamanho do projeto;
- complexidade;
- presença de documentação;
- organização;
- potencial de portfólio.

---

## Exemplo real

### Input

```txt
https://github.com/vvnqp/QP_DevMatch
```

### Output esperado

```md
## 🔍 Análise do repositório

📦 Nome: QP_DevMatch
🛠️ Linguagens:
- Ruby
- HTML
- SCSS
- JavaScript

📊 Nível sugerido:
Iniciante

Habilidades identificadas:
- Ruby
- HTML
- JavaScript
```

---

# Limitações conhecidas

## GitHub Profile Parsing

Atualmente:

### NÃO suportado

```txt
github.com/user
```

### Suportado

```txt
github.com/user/repo
```

---

## Inferência excessiva

O Pathfinder NÃO deve assumir stack apenas pelo nome do projeto.

Exemplo problemático:

```txt
landing-page
```

Inferir HTML/CSS antes da tool retornar dados é incorreto.

O agente deve priorizar:

```txt
evidência da tool
```

antes de inferências.

---

# Fluxos principais envolvendo tools

---

# Fluxo B — Gap Analysis

```txt
upload currículo
      ↓
extrair_texto_pdf
      ↓
estruturar_dados_curriculo
      ↓
resumo do perfil
      ↓
sugestão de cargos
      ↓
usuário escolhe cargo
      ↓
coleta:
- horas/dia
- ambição
      ↓
consultar_banco_vetorial
      ↓
compatibilidade
      ↓
roadmap
```

---

# Fluxo GitHub

```txt
usuário envia repositório
      ↓
acompanhar_progresso
(acao: analisar_github)
      ↓
análise técnica
      ↓
comparação com currículo
      ↓
recomendações
```

---

# Fluxo Registro de Progresso

```txt
usuário informa nível
      ↓
acompanhar_progresso
(acao: registrar)
      ↓
persistência
      ↓
resumo atualizado
```

---

# Tratamento de erros

| Situação | Comportamento |
|---|---|
| PDF inválido | mensagem amigável |
| Timeout vetorial | fallback semântico |
| GitHub inválido | solicitar URL válida |
| Falha no progresso | continuar conversa |
| Tool indisponível | não interromper fluxo |

---

# Estratégia de fallback

O Pathfinder é resiliente.

Mesmo quando tools falham:

- a conversa continua;
- o usuário recebe feedback amigável;
- erros são registrados em logs;
- o agente evita interromper o fluxo principal.

Exemplo real:

```txt
"Parece que o sistema está temporariamente indisponível. Mas anotei tudo!"
```

---

# Observações finais

As tools do Pathfinder são orientadas a:

- recuperação de contexto;
- enriquecimento semântico;
- persistência de progresso;
- personalização dinâmica;
- geração de roadmaps baseados em mercado real.

O comportamento do agente depende criticamente da ordem correta de invocação das tools.

---

**Próximo documento:** `fallback.md`