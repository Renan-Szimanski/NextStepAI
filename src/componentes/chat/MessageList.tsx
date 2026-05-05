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

  // 🔹 1. Antes do primeiro token
  const mostrarIndicatorInicial =
    isStreaming &&
    ultimaMensagem?.papel === 'assistant' &&
    conteudoVazio

  // 🔹 2. Durante execução de tool
  const mostrarIndicatorTool =
    isStreaming && currentToolCall !== null

  return (
    <ScrollArea className="h-full w-full">
      <div className="mx-auto w-full max-w-[800px] space-y-4 px-4 py-6">
        {/* 🔹 Indicator de tool aparece ANTES da resposta */}
        {mostrarIndicatorTool && (
          <StreamingIndicator currentToolCall={currentToolCall} />
        )}

        {mensagens.map((mensagem) => {
          const ehUltima =
            mensagem.id === ultimaMensagem?.id

          // 🔹 Substitui bolha vazia pelo indicador inicial
          if (ehUltima && mostrarIndicatorInicial) {
            return (
              <StreamingIndicator
                key={mensagem.id}
                currentToolCall={null}
              />
            )
          }

          return (
            <MessageBubble
              key={mensagem.id}
              mensagem={mensagem}
            />
          )
        })}

        {/* 🔹 Caso ainda não tenha criado mensagem do assistant */}
        {isStreaming &&
          ultimaMensagem?.papel === 'user' && (
            <StreamingIndicator currentToolCall={null} />
          )}

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  )
}