'use client'

import type { Mensagem } from '@/tipos'
import { MarkdownRenderer } from './MarkdownRenderer'
import { Bot, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MessageBubbleProps {
  mensagem: Mensagem
}

export function MessageBubble({ mensagem }: MessageBubbleProps) {
  const ehAssistant = mensagem.papel === 'assistant'

  return (
    <div
      className={cn(
        'flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300',
        ehAssistant ? 'justify-start' : 'justify-end',
      )}
    >
      <div
        className={cn(
          'flex max-w-[85%] items-start gap-2.5 sm:max-w-[75%]',
          ehAssistant ? 'flex-row' : 'flex-row-reverse',
        )}
      >
        {/* Avatar */}
        <div
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
            ehAssistant
              ? 'bg-primary text-primary-foreground'
              : 'bg-blue-600 text-white',
          )}
        >
          {ehAssistant ? (
            <Bot className="h-4 w-4" />
          ) : (
            <User className="h-4 w-4" />
          )}
        </div>

        {/* Bolha */}
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm',
            ehAssistant
              ? 'rounded-tl-sm bg-muted text-slate-800' // <-- Corrigido para cinza escuro
              : 'rounded-tr-sm bg-blue-600 text-white',
          )}
        >
          {ehAssistant ? (
            <MarkdownRenderer conteudo={mensagem.conteudo} />
          ) : (
            <p className="whitespace-pre-wrap break-words">{mensagem.conteudo}</p>
          )}

          {/* Timestamp */}
          <p
            className={cn(
              'mt-1 text-right text-[10px]',
              ehAssistant ? 'text-muted-foreground' : 'text-blue-200',
            )}
          >
            {/* Rede de segurança: Se tiver timestamp usa ele, senão usa a hora atual */}
            {(mensagem.timestamp ? new Date(mensagem.timestamp) : new Date()).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>
    </div>
  )
}