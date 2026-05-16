# Diagramas da Arquitetura

Este documento contém representações visuais da estrutura de classes e fluxos do **NextStepAI**, utilizando **Mermaid** para diagramas textuais.

## Diagrama de Classes (UML)

O diagrama abaixo representa os principais componentes do sistema, seus relacionamentos e responsabilidades.

O fluxo arquitetural segue uma abordagem inspirada em **Kanban**, dividida em estágios:

1. **Entrada** — Mensagem do usuário + currículo (se houver)  
2. **Análise** — Extração e estruturação do currículo  
3. **Pesquisa** — Busca semântica de vagas e recursos educacionais  
4. **Geração** — Gap analysis, roadmap, diagrama e PDF  
5. **Conclusão** — Persistência e acompanhamento de progresso  

```mermaid
classDiagram

class Orquestrador {
    +processarMensagem(messages, usuarioId)
    -executarAgente(usarFallback, messages, usuarioId)
}

class AgentePathfinder {
    +criarAgentePathfinder(usarFallback)
    +converterMensagensParaLangChain(mensagens)
    -estimarTokens(mensagens)
}

class Tool {
    <<interface>>
    +invoke(input)
}

class extrair_texto_pdf {
    +invoke()
}

class estruturar_dados_curriculo {
    +invoke(textoCurriculo)
}

class consultar_banco_vetorial {
    +invoke(query)
}

class buscar_recursos_educacionais {
    +invoke(habilidades, nivel)
}

class acompanhar_progresso {
    +invoke(acao, parametros)
}

Orquestrador --> AgentePathfinder : instancia
AgentePathfinder --> Tool : usa

Tool <|-- extrair_texto_pdf
Tool <|-- estruturar_dados_curriculo
Tool <|-- consultar_banco_vetorial
Tool <|-- buscar_recursos_educacionais
Tool <|-- acompanhar_progresso


class ChatContainer {
    -mensagens
    -isStreaming
    -currentToolCall
    -hasCurriculo
    +enviarMensagem(texto)
    +handleUploadSuccess(nomeArquivo)
}

class MessageList
class MessageBubble
class MessageInput
class UploadPopover

class ModalRoadmap {
    +textoRoadmap
}

class DiagramaRoadmapReactFlow {
    +handleSkillClick(nodo)
    +handleToggleSkill(nodo, checked)
}

ChatContainer --> MessageList
MessageList --> MessageBubble
ChatContainer --> MessageInput
MessageInput --> UploadPopover
ChatContainer --> ModalRoadmap
ModalRoadmap --> DiagramaRoadmapReactFlow


class Usuario {
    +id
    +email
}

class Conversa {
    +id
    +titulo
    +cargo_alvo
    +criado_em
}

class Mensagem {
    +id
    +conteudo
    +papel
}

class Curriculo {
    +id
    +nome_original
    +texto_extraido
}

class ProgressoUsuario {
    +habilidade
    +nivel
    +porcentagem
}

class Vaga {
    +id
    +titulo
    +descricao
}

Usuario "1" --> "*" Conversa
Usuario "1" --> "*" Curriculo
Usuario "1" --> "*" ProgressoUsuario
Conversa "1" --> "*" Mensagem

Vaga ..> consultar_banco_vetorial


class R2Storage {
    +gerarUrlUpload()
    +gerarUrlLeitura()
}

class SupabaseClient {
    +buscarCurriculo()
    +salvarMensagem()
    +matchVagas()
}

class LLMProvider {
    +criarLLM()
}

class TavilyAPI {
    +buscar()
}

Orquestrador --> LLMProvider
extrair_texto_pdf --> R2Storage
consultar_banco_vetorial --> SupabaseClient
acompanhar_progresso --> SupabaseClient
buscar_recursos_educacionais --> TavilyAPI
```

## Fluxo Kanban Representado

| Coluna | Classes envolvidas | Responsabilidade |
|---|---|---|
| **Entrada** | `ChatContainer`, `MessageInput`, `UploadPopover` | Usuário envia mensagem e currículo |
| **Análise** | `Orquestrador`, `AgentePathfinder`, `extrair_texto_pdf`, `estruturar_dados_curriculo` | Processamento do currículo |
| **Pesquisa** | `consultar_banco_vetorial`, `buscar_recursos_educacionais` | Busca de vagas e materiais educacionais |
| **Geração** | `AgentePathfinder`, `DiagramaRoadmapReactFlow`, `ModalRoadmap` | Criação do roadmap e visualização |
| **Conclusão** | `acompanhar_progresso`, `SupabaseClient`, `Conversa`, `Mensagem`, `ProgressoUsuario` | Persistência dos dados |

---

## Fluxo Principal com Currículo (Sequência)

```mermaid
sequenceDiagram

participant U as Usuario
participant F as Frontend
participant API as API Route
participant O as Orquestrador
participant A as Agente Pathfinder
participant T1 as Extrair PDF
participant T2 as Estruturar Curriculo
participant T3 as Buscar Vagas
participant T4 as Recursos Educacionais
participant DB as Supabase
participant R2 as Cloudflare R2
participant TV as Tavily

U->>F: Faz upload do curriculo
F->>API: POST presign
API-->>F: URL assinada
F->>R2: Upload PDF
R2-->>F: OK

U->>F: Envia mensagem
F->>API: POST mensagens streaming

API->>O: processarMensagem()
O->>A: criarAgentePathfinder()

A->>T1: extrair texto do PDF
T1->>DB: buscar curriculo
DB-->>T1: metadata
T1->>R2: download PDF
R2-->>T1: arquivo PDF
T1-->>A: texto extraido

A->>T2: estruturar curriculo
T2-->>A: JSON estruturado

A->>T3: consultar vagas
T3->>DB: match vagas embedding
DB-->>T3: vagas similares
T3-->>A: contexto do mercado

A->>T4: buscar recursos
T4->>TV: pesquisar cursos
TV-->>T4: links
T4-->>A: recursos

A->>A: gap analysis + roadmap

A-->>O: stream SSE
O-->>API: tokens
API-->>F: stream frontend

F->>F: renderiza mensagem
F->>F: detecta roadmap
F->>F: abre modal
```

---

## Fluxo de Fallback (Timeout ou Falha)

```mermaid
flowchart TD

A[Inicio processarMensagem]
--> B{Agente principal responde?}

B -->|Sim| C[Streaming normal]
C --> D[Fim]

B -->|Nao| E{Tipo de erro}

E -->|Timeout| F[Mensagem amigavel]

E -->|Rate Limit| G[Ativa fallback]
E -->|Erro interno| G

G --> H[Criar agente fallback]
H --> I[Executa modelo menor]

I -->|Sucesso| J[Streaming fallback]
J --> D

I -->|Falha| K[Erro generico]
K --> D
```

---

## Convenção Visual dos Diagramas

| Cor lógica | Categoria |
|---|---|
| 🟩 Verde | Agente IA e Orquestrador |
| 🟦 Azul | Frontend React |
| 🟨 Amarelo | Banco de Dados |
| 🟪 Roxo | Integrações Externas |

> Os diagramas representam a arquitetura da versão **E3 (MVP Completo)** do sistema.  
> Atualizações futuras devem modificar diretamente os blocos Mermaid deste documento.