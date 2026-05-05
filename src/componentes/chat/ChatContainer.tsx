'use client'

import { useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { Mensagem } from '@/tipos'
import { MessageList } from './MessageList'
import { MessageInput } from './MessageInput'
import { Bot } from 'lucide-react'

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
  // sessionId gerado uma única vez por montagem do componente
  const [sessionId] = useState<string>(() => uuidv4())

  // Suprime warning de variável não utilizada no MVP — será usado na integração real
  void userId
  void sessionId

  async function enviarMensagem(texto: string) {
    const novaMensagemUsuario: Mensagem = {
      id: uuidv4(),
      papel: 'user',
      conteudo: texto,
      timestamp: Date.now(),
      criadoEm: new Date(),
    }

    setMensagens((prev) => [...prev, novaMensagemUsuario])
    setIsStreaming(true)
    setCurrentToolCall(null)

    // Simulação: será substituído pelo fetch SSE real no próximo prompt
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const respostaMock: Mensagem = {
      id: uuidv4(),
      papel: 'assistant',
      conteudo: `Entendido! Estou analisando o mercado para **"${texto}"**. Em breve terei um roadmap completo para você. *(resposta mock — integração real em breve)*`,
      timestamp: Date.now(),
      criadoEm: new Date(),
    }

    setMensagens((prev) => [...prev, respostaMock])
    setIsStreaming(false)
    setCurrentToolCall(null)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header fixo */}
      <header className="flex items-center gap-3 border-b bg-background px-4 py-3 shadow-sm">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-base font-semibold leading-tight">Conversa com Pathfinder</h1>
          <p className="text-xs text-muted-foreground">Mentor de carreira com IA</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full ${isStreaming ? 'animate-pulse bg-amber-400' : 'bg-emerald-400'}`}
          />
          <span className="text-xs text-muted-foreground">
            {isStreaming ? 'Pensando...' : 'Online'}
          </span>
        </div>
      </header>

      {/* Área de mensagens — ocupa o espaço restante */}
      <div className="min-h-0 flex-1">
        <MessageList
          mensagens={mensagens}
          isStreaming={isStreaming}
          currentToolCall={currentToolCall}
        />
      </div>

      {/* Input fixo no rodapé */}
      <div className="border-t bg-background px-4 py-3">
        <div className="mx-auto w-full max-w-[800px]">
          <MessageInput onSubmit={enviarMensagem} disabled={isStreaming} />
        </div>
      </div>
    </div>
  )
}