# Responsividade e Suporte Mobile

O NextStepAI foi projetado para funcionar em dispositivos móveis, tablets e desktops, utilizando uma abordagem **mobile-first** com Tailwind CSS e componentes adaptativos.

Este documento descreve:

- estratégia de responsividade;
- comportamento da sidebar colapsável;
- breakpoints utilizados;
- ajustes específicos para chat, roadmap e upload.

---

# Breakpoints e Grid (Tailwind)

O projeto utiliza os breakpoints padrão do Tailwind, configurados em `tailwind.config.js`.

| Breakpoint | Largura mínima | Alvo principal |
|------------|----------------|----------------|
| `sm` | 640px | Smartphones em landscape / pequenos tablets |
| `md` | 768px | Tablets / dispositivos médios |
| `lg` | 1024px | Desktops / notebooks |
| `xl` | 1280px | Monitores largos |

## Classes utilitárias comuns

```tsx
flex flex-col md:flex-row
```

Empilha verticalmente em mobile e horizontalmente em tablet/desktop.

```tsx
w-full md:w-auto
```

Largura total em mobile, ajustável em telas maiores.

```tsx
hidden md:flex
```

Oculta em mobile e exibe a partir de `md`.

```tsx
p-4 md:p-6 lg:p-8
```

Espaçamento progressivo conforme a largura da tela.

---

# Layout Principal: Chat + Sidebar

O layout da rota `/chat` é composto por dois elementos principais:

1. **Sidebar de histórico**
   - lista de conversas;
   - navegação entre chats;
   - criação de nova conversa.

2. **Área principal do chat**
   - `ChatContainer`;
   - mensagens;
   - input;
   - upload de currículo;
   - roadmap.

## Comportamento por tamanho de tela

| Tela | Sidebar | Chat |
|---|---|---|
| **Mobile** (`<768px`) | Colapsada (oculta por padrão) | Largura total (`100vw`) |
| **Tablet** (`768px–1024px`) | Visível (~260px) | Largura restante |
| **Desktop** (`≥1024px`) | Visível (~300px) | Centralizado |

---

# Sidebar Colapsável (Mobile)

Em dispositivos móveis, a sidebar utiliza o componente `Sheet` do **shadcn/ui**, criando um painel deslizante lateral.

## `SidebarHistorico`

**Local:** `src/componentes/sidebar/SidebarHistorico.tsx`

### Comportamento

#### Em `md` ou superior

- sidebar fixa;
- alinhada à esquerda;
- largura fixa;
- lista de conversas sempre visível.

#### Em mobile (`< md`)

- botão hambúrguer (`Menu`);
- sidebar oculta inicialmente;
- abre via `Sheet`.

## Exemplo simplificado

```tsx
'use client';

import { useMediaQuery } from '@/hooks/use-media-query';
import {
  Sheet,
  SheetContent,
  SheetTrigger
} from '@/componentes/ui/sheet';

import { Button } from '@/componentes/ui/button';
import { Menu } from 'lucide-react';

export function SidebarHistorico() {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (isDesktop) {
    return <SidebarContent className="w-72 border-r" />;
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="left"
        className="w-72 p-0"
      >
        <SidebarContent />
      </SheetContent>
    </Sheet>
  );
}
```

---

# Hook `useMediaQuery`

**Local:** `src/hooks/use-media-query.ts`

Utiliza `window.matchMedia` para detectar breakpoints de forma reativa.

## Exemplo

```ts
import { useEffect, useState } from 'react';

export function useMediaQuery(
  query: string
): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);

    setMatches(media.matches);

    const listener = (
      e: MediaQueryListEvent
    ) => {
      setMatches(e.matches);
    };

    media.addEventListener(
      'change',
      listener
    );

    return () =>
      media.removeEventListener(
        'change',
        listener
      );
  }, [query]);

  return matches;
}
```

---

# Cabeçalho e Menu Hambúrguer

O cabeçalho (`Header`) dentro do `ChatContainer` contém:

- logotipo do Pathfinder;
- indicador de status;
- menu hambúrguer (mobile);
- `ThemeToggle`;
- `BotaoLogout`.

## Comportamento responsivo

### Mobile (`< md`)

- menu hambúrguer visível;
- botões compactados;
- logout exibido apenas como ícone.

### Tablet/Desktop

- menu oculto (`hidden md:flex`);
- botões completos;
- logout pode exibir texto (`Sair`).

---

# Ajustes Específicos do Chat

## `MessageBubble`

### Responsividade

```tsx
max-w-[90%] md:max-w-[80%]
```

- mobile → `90%`
- tablet/desktop → `80%`

### Padding

Assistente:

```tsx
px-5 py-4
```

Usuário:

```tsx
px-5 py-3
```

### Avatar

Tamanho fixo:

```tsx
h-8 w-8
```

Não escala com viewport.

---

## `MessageInput`

### Comportamento

- ocupa largura total;
- botão de envio ao lado;
- botão de anexo integrado.

### Mobile

Botões podem usar tamanho maior:

```tsx
h-10 w-10
```

### `UploadPopover`

Posicionamento:

```tsx
bottom-full
```

Largura:

```tsx
w-[80vw] max-w-[320px]
```

---

# `ModalRoadmap` e Diagrama

## Modal

### Mobile

```tsx
90vw
90vh
```

### Desktop

```tsx
80vw
85vh
```

## `DiagramaRoadmapReactFlow`

Ajustes responsivos:

- `min-width` e `min-height`;
- scroll interno;
- zoom adaptável;
- botões menores em mobile.

### Tamanho dos controles

Mobile:

```tsx
h-7 w-7
```

Desktop:

```tsx
h-8 w-8
```

### Texto dos nós

Usa truncamento:

```tsx
line-clamp-2
```

Evita overflow horizontal.

---

# Testes de Responsividade

A aplicação foi validada nos seguintes cenários:

| Dispositivo | Resultado |
|---|---|
| **iPhone SE (375×667)** | Sidebar colapsável, chat legível |
| **iPad Mini (768×1024)** | Sidebar fixa, roadmap funcional |
| **Desktop 1366×768** | Layout confortável |
| **Desktop 1920×1080** | Chat centralizado |

Container principal:

```tsx
max-w-[1200px] mx-auto
```

Evita linhas excessivamente longas.

---

# Boas Práticas Aplicadas

## Mobile-first

Estilos base:

```tsx
classe-base
```

Sobrescritos com:

```tsx
md:
lg:
xl:
```

---

## Área mínima de toque

Botões respeitam:

```txt
44×44px
```

Recomendação WCAG 2.1.

---

## Overflow controlado

`MessageList` utiliza:

```tsx
overflow-y-auto min-h-0
```

Permite scroll independente.

---

## Viewport

Meta configurada como:

```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1"
/>
```

Evita zoom inesperado sem bloquear acessibilidade.

---

# Melhorias Futuras

- suporte melhor ao modo landscape;
- ajuste do teclado virtual com `visualViewport`;
- layout dual-column para tablets grandes;
- `Drawer` mobile para upload;
- animações responsivas otimizadas.

---

**Próximo passo:** Consulte [`../backend/api-routes.md`](../backend/api-routes.md) para entender os endpoints do backend.