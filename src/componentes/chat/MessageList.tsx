'use client'

import { useEffect, useRef } from 'react'
import { ScrollArea } from '@/componentes/ui/scroll-area'
import type { Mensagem } from '@/tipos'
import { MessageBubble } from './MessageBubble'
import { StreamingIndicator } from './StreamingIndicator'

interface MessageListProps {
  mensagens: Mensagem[]
  isStreaming: boolean
  currentToolCall: string | null
}

export function MessageList({ mensagens, isStreaming, currentToolCall }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll para o final sempre que mensagens mudarem ou streaming iniciar
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens, isStreaming])

  const ultimaMensagem = mensagens[mensagens.length - 1]
  const exibirIndicador =
    isStreaming &&
    ultimaMensagem?.papel === 'assistant' &&
    ultimaMensagem?.conteudo.trim() === ''

  return (
    <ScrollArea className="h-full w-full">
      <div className="mx-auto w-full max-w-[800px] space-y-4 px-4 py-6">
        {mensagens.map((mensagem) => {
          // Se for a última mensagem do assistant vazia durante streaming,
          // renderiza o indicador no lugar da bolha
          const ehUltimaVazia =
            exibirIndicador && mensagem.id === ultimaMensagem.id

          if (ehUltimaVazia) {
            return (
              <div key={mensagem.id} className="flex items-start gap-3">
                <StreamingIndicator currentToolCall={currentToolCall} />
              </div>
            )
          }

          return <MessageBubble key={mensagem.id} mensagem={mensagem} />
        })}

        {/* Indicador quando streaming começa antes de qualquer mensagem vazia */}
        {isStreaming && ultimaMensagem?.papel === 'user' && (
          <div className="flex items-start gap-3">
            <StreamingIndicator currentToolCall={currentToolCall} />
          </div>
        )}

        {/* Âncora para auto-scroll */}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  )
}