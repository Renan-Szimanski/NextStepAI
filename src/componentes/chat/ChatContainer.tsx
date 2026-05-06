'use client'

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { toast } from 'sonner'
import { Compass } from 'lucide-react'

import type { Mensagem } from '@/tipos'
import type { EventoStreamSSE } from '@/tipos/agente'
import { lerStreamSSE } from '@/lib/stream'

import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'

import BotaoLogout from '@/componentes/auth/BotaoLogout'
import { ThemeToggle } from '@/componentes/theme-toggle'

interface ChatContainerProps {
  userId: string
}

const MENSAGEM_BOAS_VINDAS: Mensagem = {
  id: uuidv4(),
  papel: 'assistant',
  conteudo:
    'Olá! Sou o **Pathfinder**, seu mentor de carreira guiado por IA. Qual cargo ou área você está mirando no momento? Posso analisar o mercado e montar um roadmap de desenvolvimento profissional sob medida para você.',
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

      for await (const evento of lerStreamSSE(response)) {
        switch (evento.type) {
          case 'token':
            setMensagens((prev) =>
              prev.map((msg, index) => {
                if (index === prev.length - 1 && msg.papel === 'assistant') {
                  return { ...msg, conteudo: msg.conteudo + evento.content }
                }
                return msg
              })
            )
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
    <div className="flex h-full flex-col bg-background relative">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border/40 bg-background/80 backdrop-blur-md px-4 py-3 shadow-sm transition-colors">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
          <Compass className="h-5 w-5" />
        </div>

        <div className="flex-1">
          <h1 className="text-sm font-semibold tracking-tight text-foreground">
            Pathfinder
          </h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`h-2 w-2 rounded-full ${
                isStreaming ? 'animate-pulse bg-amber-500' : 'bg-emerald-500'
              }`}
            />
            <p className="text-xs font-medium text-muted-foreground">
              {isStreaming ? 'Processando...' : 'Mentor IA Online'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <div className="border-l border-border pl-4">
            <BotaoLogout />
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 bg-background/50">
        <MessageList
          mensagens={mensagens}
          isStreaming={isStreaming}
          currentToolCall={currentToolCall}
        />
      </div>

      <div className="border-t border-border/40 bg-gradient-to-t from-background to-background/95 px-4 py-4 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-[800px]">
          <MessageInput onSubmit={enviarMensagem} disabled={isStreaming} />
        </div>
      </div>
    </div>
  )
}