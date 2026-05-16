# Estilos, Temas e Acessibilidade

O NextStepAI utiliza **Tailwind CSS** como framework de estilos utilitários, combinado com **variáveis CSS** para suporte a temas claro/escuro e **componentes shadcn/ui** pré-estilizados.

Este documento descreve:

- arquitetura de estilos;
- implementação do tema dinâmico;
- estilização de conteúdo Markdown;
- blocos de raciocínio;
- práticas de acessibilidade visual.

---

# Tailwind CSS – Configuração e Abordagem

O arquivo `src/app/globals.css` importa as diretivas base do Tailwind e adiciona utilitários customizados:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}
```

## Principais características

### Classes utilitárias

Uso intensivo de classes como:

```txt
flex
bg-background
text-foreground
rounded-xl
```

Isso reduz CSS customizado e mantém consistência visual.

### Camadas (`@layer`)

Organização em:

- `base`
- `components`
- `utilities`

Isso melhora previsibilidade de especificidade CSS.

### Variáveis CSS

Tokens de design (cores, bordas, radius) são definidos em `globals.css`, permitindo troca dinâmica de tema sem re-renderização.

---

# Sistema de Temas (Claro / Escuro)

## Definição das variáveis CSS

### Tema claro (`:root`)

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --border: 214.3 31.8% 91.4%;
}
```

### Tema escuro (`.dark`)

A ativação ocorre pela classe `.dark` aplicada ao elemento `<html>`.

```css
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --primary: 217.2 91.2% 59.8%;
  --border: 217.2 32.6% 17.5%;
}
```

---

## Alternância de tema com `next-themes`

O projeto utiliza:

- `next-themes`
- `ThemeProvider`
- `useTheme()`

para persistir a preferência do usuário no `localStorage`.

### Fluxo de funcionamento

1. `ThemeProvider` envolve a aplicação.
2. `ThemeToggle` chama `useTheme()`.
3. A classe `.dark` é adicionada/removida do `<html>`.
4. As variáveis CSS mudam automaticamente.

### Exemplo do `ThemeToggle`

```tsx
import { useTheme } from 'next-themes';
import { Button } from '@/componentes/ui/button';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() =>
        setTheme(theme === 'dark' ? 'light' : 'dark')
      }
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />

      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}
```

---

## Aplicação nos componentes

Os componentes utilizam variáveis CSS via Tailwind:

| Classe | Finalidade |
|--------|-------------|
| `bg-background` | Fundo principal |
| `text-foreground` | Texto principal |
| `bg-primary` | Destaques e botões |
| `text-primary-foreground` | Texto sobre botões |
| `border-border` | Bordas consistentes |
| `bg-muted` | Fundo secundário |
| `text-muted-foreground` | Texto secundário |

---

# Estilos para Markdown (`.markdown-content`)

As respostas do Pathfinder são renderizadas via `MarkdownRenderer`, que aplica a classe `.markdown-content`.

Os estilos ficam em `globals.css`.

## Exemplo

```css
.markdown-content h1 {
  @apply text-2xl font-bold mt-6 mb-4;
}

.markdown-content p {
  @apply mb-4 leading-relaxed text-foreground/90;
}

.markdown-content ul {
  @apply list-disc list-outside ml-5 mb-4 space-y-1;
}

.markdown-content code {
  @apply bg-muted text-primary px-1.5 py-0.5 rounded-md text-sm font-mono;
}

.markdown-content pre {
  @apply bg-secondary text-secondary-foreground p-4 rounded-xl overflow-x-auto mb-4;
}

.markdown-content a {
  @apply text-primary hover:underline underline-offset-4;
}
```

## Destaques

### Cabeçalhos

- `h1` → destaque principal
- `h2` → subtítulos
- `h3` → subtítulos menores

Todos possuem espaçamento vertical consistente.

### Listas

Usam:

```txt
list-disc
list-outside
ml-5
```

para melhor indentação.

### Código inline

Blocos `code` possuem:

- fundo contrastante;
- fonte monoespaçada;
- padding reduzido.

### Blocos `pre`

Possuem:

- fundo secundário;
- borda arredondada;
- scroll horizontal.

### Links

Links usam:

```txt
text-primary
hover:underline
underline-offset-4
```

para melhorar descobribilidade.

---

# Bloco de Raciocínio (`.thinking-block`)

O Pathfinder envolve raciocínio interno com tags:

```html
<thinking>
  ...
</thinking>
```

Por padrão, o frontend **remove esse conteúdo antes da renderização**, evitando expor raciocínio interno ao usuário.

Em ambiente de desenvolvimento, pode-se renderizar visualmente para debugging.

## Estilo do bloco

```css
.thinking-block {
  background-color: hsl(var(--muted));
  border-left: 4px solid hsl(var(--muted-foreground) / 0.3);
  border-radius: 0.5rem;
  padding: 0.75rem;
  margin-bottom: 1rem;
  color: hsl(var(--muted-foreground));
  font-size: 0.875rem;
  font-style: italic;
  opacity: 0.85;
}
```

## Comportamento esperado

### Produção

```txt
<thinking> removido
```

### Desenvolvimento

```txt
<thinking> renderizado como thinking-block
```

---

# Acessibilidade (WCAG 2.1 AA)

O sistema foi projetado para atender **WCAG 2.1 AA**.

---

## Contraste de cores

As variáveis CSS garantem:

- **4.5:1** para texto normal;
- **3:1** para textos grandes.

Compatível com:

- tema claro;
- tema escuro.

---

## Foco visível

```css
:focus-visible {
  outline: 2px solid hsl(var(--primary));
  outline-offset: 2px;
  border-radius: 4px;
}

button:focus:not(:focus-visible),
a:focus:not(:focus-visible) {
  outline: none;
}
```

### Resultado

- foco aparece apenas em navegação por teclado;
- não interfere no clique via mouse;
- melhora usabilidade para leitores de teclado.

---

## Textos secundários

```css
.text-muted-foreground {
  color: hsl(var(--muted-foreground));
}
```

A cor foi validada para manter contraste suficiente.

Ferramentas utilizadas:

- axe-cli
- Lighthouse
- Contrast Checker

---

## Redimensionamento de texto

O uso de:

```txt
rem
em
```

permite zoom de até **200%** sem quebra significativa de layout.

---

# Ferramentas de Verificação

## axe-cli

Executado localmente:

```bash
npx axe http://localhost:3000
```

Resultado:

```txt
0 violações
```

---

## Lighthouse

Pontuação registrada:

```txt
100/100 em Acessibilidade
```

Referência:

```txt
docs/metricas/lighthouse.md
```

---

## Contrast Checker

Usado para validar combinações como:

```txt
bg-primary + text-primary-foreground
```

---

# Customizações Futuras

## Transições de tema

Adicionar:

```txt
transition-colors duration-200
```

para suavizar troca de tema.

## Alto contraste

Possível implementação:

```css
.high-contrast
```

para acessibilidade ampliada.

## Tamanho de fonte adaptável

Permitir:

- pequeno;
- médio;
- grande.

Ainda não implementado no MVP.

---

**Próximo passo:** Consulte `responsividade.md` para detalhes sobre comportamento mobile e sidebar colapsável.