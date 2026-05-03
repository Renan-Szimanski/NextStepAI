'use client'

interface MarkdownRendererProps {
  conteudo: string
}

// Placeholder simples — será refinado com react-markdown no PROMPT 2.8
export function MarkdownRenderer({ conteudo }: MarkdownRendererProps) {
  return <div className="prose prose-sm max-w-none dark:prose-invert">{conteudo}</div>
}