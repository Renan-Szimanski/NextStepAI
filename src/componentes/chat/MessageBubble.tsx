'use client'

import type { Mensagem } from '@/tipos'
import { MarkdownRenderer } from './MarkdownRenderer'
import { Compass, User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MessageBubbleProps {
  mensagem: Mensagem
  isStreaming?: boolean
  isLast?: boolean
}

export function MessageBubble({ mensagem, isStreaming = false, isLast = false }: MessageBubbleProps) {
  const ehAssistant = mensagem.papel === 'assistant'
  const conteudoVazio = !mensagem.conteudo || mensagem.conteudo.trim() === ''
  const isThinkingMode = ehAssistant && isStreaming && isLast && !conteudoVazio

  return (
    <div
      role="article"
      aria-label={ehAssistant ? 'Resposta do Pathfinder' : 'Mensagem do usuário'}
      className={cn(
        'flex w-full group animate-in fade-in slide-in-from-bottom-2 duration-300',
        ehAssistant ? 'justify-start' : 'justify-end',
      )}
    >
      <div
        className={cn(
          'flex max-w-[90%] md:max-w-[80%] items-end gap-3',
          ehAssistant ? 'flex-row' : 'flex-row-reverse',
        )}
      >
        {/* Avatar */}
        <div
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm shadow-sm ring-1 ring-border/20',
            ehAssistant
              ? 'bg-primary/10 text-primary mb-1'
              : 'bg-primary text-primary-foreground mb-1',
          )}
          aria-hidden="true"
        >
          {ehAssistant ? (
            <Compass className="h-4 w-4" aria-hidden="true" />
          ) : (
            <User className="h-4 w-4" aria-hidden="true" />
          )}
        </div>

        {/* Mensagem */}
        <div
          className={cn(
            'flex flex-col gap-1 overflow-hidden transition-all',
            ehAssistant
              ? 'rounded-2xl rounded-bl-sm bg-muted/60 border border-border/40 px-5 py-4 text-foreground'
              : 'rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-5 py-3 shadow-md',
            isThinkingMode && 'opacity-70'
          )}
        >
          <div className="text-sm leading-relaxed">
            {ehAssistant ? (
              conteudoVazio ? null : (
                <MarkdownRenderer conteudo={mensagem.conteudo} />
              )
            ) : (
              <p className="whitespace-pre-wrap break-words">
                {mensagem.conteudo}
              </p>
            )}
          </div>

          <span
            className={cn(
              'text-[10px] opacity-60 mt-1 select-none',
              ehAssistant ? 'text-left' : 'text-right text-primary-foreground/80'
            )}
            aria-hidden="true"
          >
            {(mensagem.timestamp
              ? new Date(mensagem.timestamp)
              : new Date()
            ).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>
    </div>
  )
}