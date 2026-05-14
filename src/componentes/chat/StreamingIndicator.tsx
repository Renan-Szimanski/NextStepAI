'use client'

import { Bot, Loader2 } from 'lucide-react'

interface StreamingIndicatorProps {
  currentToolCall: string | null
}

export function StreamingIndicator({ currentToolCall }: StreamingIndicatorProps) {
  const isConsultandoBanco = currentToolCall === 'consultar_banco_vetorial'

  return (
    <div 
      className="flex items-start gap-2.5 animate-in fade-in duration-300"
      role="status"
      aria-live="polite"
      aria-label={isConsultandoBanco ? "Consultando banco de vagas" : "Pathfinder está processando sua mensagem"}
    >
      <div 
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
        aria-hidden="true"
      >
        <Bot className="h-4 w-4" aria-hidden="true" />
      </div>

      <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3 shadow-sm transition-all">
        {isConsultandoBanco ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>🔍 Consultando banco de vagas...</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Pathfinder está pensando</span>
            <div className="flex items-end gap-1" aria-hidden="true">
              <span className="animate-bounce [animation-delay:0ms]">.</span>
              <span className="animate-bounce [animation-delay:150ms]">.</span>
              <span className="animate-bounce [animation-delay:300ms]">.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}