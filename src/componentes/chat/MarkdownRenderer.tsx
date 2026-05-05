'use client'
/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownRendererProps {
  conteudo: string
}

export function MarkdownRenderer({ conteudo }: MarkdownRendererProps) {
  return (
    <div className="markdown-content">
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
                <code className="bg-slate-100 px-1 py-0.5 rounded text-sm">
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
              className="text-blue-600 underline"
            >
              {children}
            </a>
          ),
        }}
      >
        {conteudo}
      </ReactMarkdown>
    </div>
  )
}