'use client'
/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

interface MarkdownRendererProps {
  conteudo: string
}

function parseThinking(content: string): { thinking: string | null; response: string } {
  const thinkRegex = /<thinking>([\s\S]*?)<\/thinking>/g
  let thinking = null
  let response = content
  
  // 🔧 Correção: converter iterador para array manualmente
  const matches: RegExpExecArray[] = []
  let match: RegExpExecArray | null
  while ((match = thinkRegex.exec(content)) !== null) {
    matches.push(match)
  }
  
  if (matches.length > 0) {
    thinking = matches.map(m => m[1].trim()).join('\n\n')
    response = content.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim()
  }
  return { thinking, response }
}

export function MarkdownRenderer({ conteudo }: MarkdownRendererProps) {
  const { thinking, response } = parseThinking(conteudo)

  return (
    <div className="markdown-content">
      {thinking && (
        <>
          <div className="thinking-block mb-4 p-3 rounded-lg bg-muted/50 border-l-4 border-muted-foreground/30 text-muted-foreground text-sm italic">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{thinking}</ReactMarkdown>
          </div>
          <hr className="my-4 border-t border-border" />
        </>
      )}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="text-2xl font-bold mt-4 mb-2">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-bold mt-3 mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-semibold mt-2 mb-1">{children}</h3>,
          p: ({ children }) => <p className="leading-relaxed mb-2">{children}</p>,
          ul: ({ children }) => <ul className="list-disc ml-6 mb-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal ml-6 mb-2">{children}</ol>,
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
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline">
              {children}
            </a>
          ),
        }}
      >
        {response || '_Nenhuma resposta final._'}
      </ReactMarkdown>
    </div>
  )
}