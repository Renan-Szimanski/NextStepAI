# Componentes React do Frontend

O frontend do NextStepAI é construído com **React** (Next.js App Router) e organiza os componentes por domínio, principalmente dentro de `src/componentes/chat/`.

Este documento descreve os principais componentes, suas responsabilidades, props e como interagem para fornecer a experiência de chat, upload de currículo, roadmap visual e histórico.

---

## Componentes do Chat

### `ChatContainer`

**Local:** `src/componentes/chat/ChatContainer.tsx`  
**Responsabilidade:** Orquestrador principal da página de chat. Gerencia estado das mensagens, streaming, histórico, verificação de currículo e comunicação com a API de mensagens.

#### Props principais

```ts
{
  userId: string;
  historicoInicial?: MensagemPersistida[];
  conversaId?: string;
}
```

| Prop | Tipo | Descrição |
|---|---|---|
| `userId` | `string` | ID do usuário autenticado |
| `historicoInicial` | `MensagemPersistida[]` | Histórico carregado do banco |
| `conversaId` | `string` | ID da conversa atual |

#### Funcionalidades internas

##### Estado

- `mensagens: Mensagem[]`
- `isStreaming: boolean`
- `currentToolCall: string | null`
- `hasCurriculo: boolean`

Quando não existe histórico, uma mensagem de boas-vindas é criada automaticamente.

##### `enviarMensagem(texto, isAutomatica)`

Fluxo:

```txt
usuário envia texto
        ↓
adiciona mensagem no estado
        ↓
cria placeholder do assistente
        ↓
POST /api/mensagens
        ↓
consome SSE
        ↓
stream token por token
        ↓
salva conversa
        ↓
gera título automático
```

Responsabilidades:

- adiciona mensagem do usuário
- cria placeholder vazio do assistente
- dispara `fetch('/api/mensagens')`
- consome stream via `lerStreamSSE`
- atualiza a última mensagem incrementalmente
- salva conversa no Supabase
- gera título automático em novas conversas

##### `handleUploadSuccess`

Chamado após upload do currículo.

Comportamento:

```txt
upload concluído
        ↓
hasCurriculo = true
        ↓
mensagem automática enviada
```

Mensagem exemplo:

```txt
Já fiz o upload do currículo.
```

#### Renderização

O componente renderiza:

```txt
Header
 ├── ThemeToggle
 └── BotaoLogout

MessageList

MessageInput
```

---

### `MessageList`

**Local:** `src/componentes/chat/MessageList.tsx`

**Responsabilidade:** Iterar sobre o array de mensagens e renderizar cada item via `MessageBubble`.

#### Props

```ts
{
  mensagens: Mensagem[];
  isStreaming: boolean;
  currentToolCall: string | null;
}
```

#### Comportamento

- renderiza lista de mensagens
- adiciona `ref` final para auto-scroll
- mantém viewport sincronizada com streaming

---

### `MessageBubble`

**Local:** `src/componentes/chat/MessageBubble.tsx`

**Responsabilidade:** Renderizar uma mensagem individual do usuário ou assistente.

#### Props

```ts
{
  mensagem: Mensagem;
  isStreaming?: boolean;
  isLast?: boolean;
}
```

#### Funcionalidades

##### Estilo contextual

Usuário:

- cor primária
- alinhado à direita

Assistente:

- fundo neutro
- markdown renderizado

##### Markdown

Respostas do assistente usam:

```txt
MarkdownRenderer
```

##### Roadmap detection

Se a mensagem:

- contém roadmap
- é a última
- streaming terminou

então:

```txt
ModalRoadmap
```

é exibido automaticamente.

##### Rodapé

Mostra:

```txt
HH:mm
```

da mensagem.

---

### `MessageInput`

**Local:** `src/componentes/chat/MessageInput.tsx`

**Responsabilidade:** Campo de entrada, envio de mensagem e upload de currículo.

#### Props

```ts
{
  onSubmit: (texto: string) => void;
  disabled: boolean;
  hasCurriculo: boolean;
  onUploadSuccess: (
    nomeArquivo: string,
    urlLeitura: string
  ) => void;
}
```

#### Funcionalidades

- input controlado
- `Enter` envia mensagem
- botão clip abre `UploadPopover`
- desabilitado durante streaming

---

### `StreamingIndicator`

**Local:** `src/componentes/chat/StreamingIndicator.tsx`

**Responsabilidade:** Feedback visual enquanto o agente ainda não enviou tokens.

#### Props

Nenhuma.

#### Comportamento

Exibe:

```txt
Pathfinder está pensando...
```

ou animação de pontos pulsantes.

---

## Componentes de Roadmap e Diagrama

### `ModalRoadmap`

**Local:** `src/componentes/chat/ModalRoadmap.tsx`

**Responsabilidade:** Detectar roadmap na resposta do agente e abrir visualização interativa.

#### Props

```ts
{
  textoRoadmap: string;
}
```

#### Fluxo

```txt
texto da resposta
        ↓
parsearRoadmap()
        ↓
extrair grafo
        ↓
abrir Dialog
        ↓
renderizar React Flow
```

Utiliza:

```txt
src/lib/parsear-roadmap.ts
```

---

### `DiagramaRoadmapReactFlow`

**Local:** `src/componentes/chat/DiagramaRoadmapReactFlow.tsx`

**Responsabilidade:** Renderizar roadmap interativo usando **React Flow**.

#### Props

```ts
{
  textoRoadmap: string;
  usuarioId?: string;
  onSkillToggle?: (
    skill: string,
    concluido: boolean
  ) => void;
}
```

#### Funcionalidades internas

##### Parsing

```txt
parsearRoadmap()
```

↓

```txt
NodoRoadmap[]
Aresta[]
```

##### Layout automático

```txt
raiz
 ↓
fases
 ↓
skills
```

Posicionamento:

- raiz à esquerda
- fases em colunas
- skills abaixo

##### Progresso

Estado:

```ts
skillsConcluidas: Set<string>
```

Persistência:

```txt
fetch('/api/progresso')
```

quando checkbox muda.

##### Interações

Suporta:

- zoom
- pan
- clique em skill
- marcação de concluído

##### Tooltip

Clique em skill abre:

```txt
TooltipResumoSkill
```

---

### `TooltipResumoSkill`

**Local:** `src/componentes/chat/TooltipResumoSkill.tsx`

**Responsabilidade:** Mostrar detalhes didáticos da skill.

#### Props

```ts
{
  skill: string;
  resumo: string;
  carregando: boolean;
  concluida: boolean;
  onClose: () => void;
  onToggleConcluido: (
    checked: boolean
  ) => void;
}
```

#### Funcionalidades

Exibe:

- resumo da skill
- botão concluir
- botão buscar materiais

Integração:

```txt
/api/buscar-recursos
```

---

## Componentes de Upload

### `UploadPopover`

**Local:** `src/componentes/chat/UploadPopover.tsx`

**Responsabilidade:** Upload de currículo PDF para Cloudflare R2.

#### Props

```ts
{
  onUploadSuccess: (
    nomeArquivo: string,
    urlLeitura: string
  ) => void;

  onClose: () => void;
}
```

#### Fluxo de Upload

```txt
selecionar PDF
        ↓
validar tamanho
        ↓
POST /curriculo/presign
        ↓
upload direto R2
        ↓
registrar no banco
        ↓
callback sucesso
        ↓
fechar popover
```

#### Regras

Limites:

- máximo `5MB`
- apenas `PDF`

#### Operações

##### Upload

Implementado via:

```txt
XMLHttpRequest
```

para permitir progresso visual.

##### Remoção

```http
DELETE /api/curriculo
```

---

## Componentes de Sidebar e Histórico

### `SidebarHistorico`

**Local:** `src/componentes/sidebar/SidebarHistorico.tsx`

**Responsabilidade:** Exibir histórico de conversas.

#### Funcionalidades

Busca:

```http
GET /api/planos
```

Navegação:

```ts
router.push(
  `/chat?conversaId=${id}`
)
```

#### Responsividade

Desktop:

```txt
sidebar fixa
```

Mobile:

```txt
Sheet (hambúrguer)
```

---

## Componentes Base (`shadcn/ui`)

O projeto utiliza:

:contentReference[oaicite:0]{index=0}

### Componentes utilizados

| Componente | Uso |
|---|---|
| `Button` | Botões |
| `Dialog` | Modal do roadmap |
| `Progress` | Upload |
| `Checkbox` | Skills |
| `Badge` | Fases |
| `Sheet` | Sidebar mobile |

Localização:

```txt
src/componentes/ui/
```

Customização via:

```txt
tailwind.config.js
```

---

## Lazy Loading e Performance

### `DiagramaRoadmapReactFlow`

Carregado sob demanda:

```ts
dynamic(() => import(...), {
  ssr: false
})
```

Motivo:

> React Flow não suporta SSR.

### `MarkdownRenderer`

Pode ser lazy-loaded para reduzir bundle inicial.

### Upload

Usa:

```txt
XMLHttpRequest
```

para manter UI responsiva.

---

## Acessibilidade (WCAG 2.1 AA)

Todos os componentes seguem práticas acessíveis.

### Implementações

- `role` semântico
- `aria-label`
- navegação por teclado
- contraste validado
- foco visível
- fechamento com `Escape`

### Navegação

Atalhos:

```txt
Enter → enviar mensagem
Tab → navegar
Esc → fechar modal
```

---

## Referências

### Arquivos relevantes

```txt
src/componentes/chat/
src/componentes/sidebar/
src/componentes/ui/
src/lib/parsear-roadmap.ts
```

---

**Próximo passo:** consulte `estilos.md` para detalhes sobre Tailwind, temas e blocos de raciocínio.