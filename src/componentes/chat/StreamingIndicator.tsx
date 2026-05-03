'use client'

import { Bot } from 'lucide-react'

interface StreamingIndicatorProps {
  currentToolCall: string | null
}

export function StreamingIndicator({ currentToolCall }: StreamingIndicatorProps) {
  return (
    <div className="flex items-start gap-2.5 animate-in fade-in duration-300">
      {/* Avatar do assistant */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Bot className="h-4 w-4" />
      </div>

      {/* Bolha com indicador */}
      <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3 shadow-sm">
        {currentToolCall ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="animate-spin text-base">⚙️</span>
            <span>
              Consultando: <strong className="text-foreground">{currentToolCall}</strong>
            </span>
          </div>
        ) : (
          // Três pontos pulsantes
          <div className="flex items-center gap-1.5 py-0.5">
            <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
          </div>
        )}
      </div>
    </div>
  )
}