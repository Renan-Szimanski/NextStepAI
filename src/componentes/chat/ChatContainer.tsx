'use client'

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { toast } from 'sonner'
import { Bot } from 'lucide-react'

import type { Mensagem } from '@/tipos'
import type { EventoStreamSSE } from '@/tipos/agente'
import { lerStreamSSE } from '@/lib/stream'

import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'

interface ChatContainerProps {
  userId: string
}

const MENSAGEM_BOAS_VINDAS: Mensagem = {
  id: uuidv4(),
  papel: 'assistant',
  conteudo:
    'Olá! Sou o Pathfinder, seu mentor de carreira. Qual cargo ou área você está mirando? Posso analisar o mercado e montar um roadmap para você.',
  timestamp: Date.now(),
  criadoEm: new Date(),
}

export function ChatContainer({ userId }: ChatContainerProps) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([MENSAGEM_BOAS_VINDAS])
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentToolCall, setCurrentToolCall] = useState<string | null>(null)

  const [sessionId] = useState<string>(() => uuidv4())
  const abortControllerRef = useRef<AbortController | null>(null)

  void userId

  async function enviarMensagem(texto: string) {
    if (!texto.trim() || isStreaming) return

    const novaMensagemUsuario: Mensagem = {
      id: uuidv4(),
      papel: 'user',
      conteudo: texto,
      timestamp: Date.now(),
      criadoEm: new Date(),
    }

    const mensagemAssistantPlaceholder: Mensagem = {
      id: uuidv4(),
      papel: 'assistant',
      conteudo: '',
      timestamp: Date.now(),
      criadoEm: new Date(),
    }

    const mensagensAtualizadas = [...mensagens, novaMensagemUsuario]

    setMensagens([...mensagensAtualizadas, mensagemAssistantPlaceholder])
    setIsStreaming(true)
    setCurrentToolCall(null)

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    try {
      const response = await fetch('/api/mensagens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: mensagensAtualizadas,
          sessionId,
        }),
        signal: abortController.signal,
      })

      if (!response.ok) {
        throw new Error('Erro na requisição')
      }
      let ultimoToken = ''
      for await (const evento of lerStreamSSE(response)) {
        switch (evento.type) {
          case 'token':
            if (evento.content === ultimoToken) break

            ultimoToken = evento.content

            setMensagens((prev) => {
              return prev.map((msg, index) => {
                if (index === prev.length - 1 && msg.papel === 'assistant') {
                  return {
                    ...msg,
                    conteudo: msg.conteudo.endsWith(evento.content)
                    ? msg.conteudo
                    : msg.conteudo + evento.content,
                  }
                }
                return msg
              })
            })
            break

          case 'tool_call':
            setCurrentToolCall(evento.name)
            break

          case 'tool_result':
            setCurrentToolCall(null)
            break

          case 'done':
            setIsStreaming(false)
            return

          case 'error':
            toast.error('Erro no processamento da IA')
            setIsStreaming(false)
            return
        }
      }
    } catch (error) {
      console.error(error)

      toast.error('Erro de conexão com o servidor')

      // remove placeholder
      setMensagens((prev) => prev.slice(0, -1))

      setIsStreaming(false)
    }
  }

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 border-b bg-background px-4 py-3 shadow-sm">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Bot className="h-5 w-5" />
        </div>

        <div>
          <h1 className="text-base font-semibold leading-tight">
            Conversa com Pathfinder
          </h1>
          <p className="text-xs text-muted-foreground">
            Mentor de carreira com IA
          </p>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full ${
              isStreaming ? 'animate-pulse bg-amber-400' : 'bg-emerald-400'
            }`}
          />
          <span className="text-xs text-muted-foreground">
            {isStreaming ? 'Pensando...' : 'Online'}
          </span>
        </div>
      </header>

      {/* Mensagens */}
      <div className="min-h-0 flex-1">
        <MessageList
          mensagens={mensagens}
          isStreaming={isStreaming}
          currentToolCall={currentToolCall}
        />
      </div>

      {/* Input */}
      <div className="border-t bg-background px-4 py-3">
        <div className="mx-auto w-full max-w-[800px]">
          <MessageInput onSubmit={enviarMensagem} disabled={isStreaming} />
        </div>
      </div>
    </div>
  )
}