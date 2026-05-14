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

export function MessageList({
  mensagens,
  isStreaming,
  currentToolCall,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens, isStreaming, currentToolCall])

  const ultimaMensagem = mensagens[mensagens.length - 1]

  const conteudoVazio =
    !ultimaMensagem?.conteudo ||
    ultimaMensagem?.conteudo.trim() === ''

  const mostrarIndicatorInicial =
    isStreaming &&
    ultimaMensagem?.papel === 'assistant' &&
    conteudoVazio

  const mostrarIndicatorTool =
    isStreaming && currentToolCall !== null

  return (
    <ScrollArea className="h-full w-full">
      <div className="mx-auto w-full max-w-[800px] flex flex-col space-y-6 px-4 pt-8 pb-10">
        
        {mostrarIndicatorTool && (
          <div className="animate-in fade-in slide-in-from-bottom-2">
            <StreamingIndicator currentToolCall={currentToolCall} />
          </div>
        )}

        <ul role="list" className="space-y-6">
          {mensagens.map((mensagem) => {
            const ehUltima = mensagem.id === ultimaMensagem?.id
            const ehAssistantStreaming = ehUltima && isStreaming && mensagem.papel === 'assistant' && !conteudoVazio

            if (ehUltima && mostrarIndicatorInicial) {
              return (
                <li key={mensagem.id} className="list-none">
                  <StreamingIndicator currentToolCall={null} />
                </li>
              )
            }

            return (
              <li key={mensagem.id} className="list-none">
                <MessageBubble
                  mensagem={mensagem}
                  isStreaming={ehAssistantStreaming}
                  isLast={ehUltima}
                />
              </li>
            )
          })}
        </ul>

        {isStreaming && ultimaMensagem?.papel === 'user' && (
          <div className="animate-in fade-in slide-in-from-bottom-2">
            <StreamingIndicator currentToolCall={null} />
          </div>
        )}

        <div ref={bottomRef} className="h-px" aria-hidden="true" />
      </div>
    </ScrollArea>
  )
}