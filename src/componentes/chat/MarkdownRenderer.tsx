// src/componentes/chat/MarkdownRenderer.tsx 

'use client'
/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

interface MarkdownRendererProps {
  conteudo: string
  isThinking?: boolean
}

// Insere quebras de linha duplas em pontos de mudança de tópico
function formatThinkingText(text: string): string {
  // Padrões que indicam início de novo passo no raciocínio
  const patterns = [
    /(\.\s+)(Agora|Vou|Então|Primeiro|Segundo|Terceiro|Em seguida|Por fim|Para isso|Vamos|Preciso|Precisamos|Vou tentar|Vou corrigir)/gi,
    /(\n)(Agora|Vou|Então|Primeiro)/gi,
    /(\.\s+)(No entanto|Contudo|Todavia|Porém|Além disso|Ademais|Dessa forma|Assim)/gi,
  ]
  let formatted = text
  for (const pattern of patterns) {
    formatted = formatted.replace(pattern, (match, p1, p2) => {
      return `\n\n${p2}`
    })
  }
  // Remove quebras excessivas (mais de 2 linhas em branco)
  formatted = formatted.replace(/\n{3,}/g, '\n\n')
  return formatted
}

export function MarkdownRenderer({ conteudo, isThinking = false }: MarkdownRendererProps) {
  // Aplica formatação de quebra de linha apenas durante o thinking
  const processedContent = isThinking ? formatThinkingText(conteudo) : conteudo

  return (
    <div className={cn('markdown-content', isThinking && 'thinking-text')}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mt-4 mb-2">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold mt-3 mb-2">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold mt-2 mb-1">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="leading-relaxed mb-2">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc ml-6 mb-2">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal ml-6 mb-2">{children}</ol>
          ),
          code({ node, inline, className, children, ...props }: any) {
            if (inline) {
              return (
                <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">
                  {children}
                </code>
              )
            }
            return (
              <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto text-sm">
                <code>{children}</code>
              </pre>
            )
          },
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 underline"
            >
              {children}
            </a>
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  )
}