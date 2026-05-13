// src/componentes/chat/MessageList.tsx (modificado - passar isStreaming e isLast)
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

        {mensagens.map((mensagem) => {
          const ehUltima = mensagem.id === ultimaMensagem?.id
          const ehAssistantStreaming = ehUltima && isStreaming && mensagem.papel === 'assistant' && !conteudoVazio

          if (ehUltima && mostrarIndicatorInicial) {
            return (
              <div key={mensagem.id} className="animate-in fade-in slide-in-from-bottom-2">
                 <StreamingIndicator currentToolCall={null} />
              </div>
            )
          }

          return (
            <MessageBubble
              key={mensagem.id}
              mensagem={mensagem}
              isStreaming={ehAssistantStreaming}
              isLast={ehUltima}
            />
          )
        })}

        {isStreaming && ultimaMensagem?.papel === 'user' && (
          <div className="animate-in fade-in slide-in-from-bottom-2">
             <StreamingIndicator currentToolCall={null} />
          </div>
        )}

        <div ref={bottomRef} className="h-px" />
      </div>
    </ScrollArea>
  )
}