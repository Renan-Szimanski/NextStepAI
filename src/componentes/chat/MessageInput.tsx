'use client'

import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import { Button } from '@/componentes/ui/button'
import { Textarea } from '@/componentes/ui/textarea'
import { SendHorizonal } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MessageInputProps {
  onSubmit: (texto: string) => void
  disabled: boolean
}

export function MessageInput({ onSubmit, disabled }: MessageInputProps) {
  const [texto, setTexto] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize da textarea conforme o conteúdo cresce
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.style.height = 'auto'
    const novaAltura = Math.min(textarea.scrollHeight, 200)
    textarea.style.height = `${novaAltura}px`
  }, [texto])

  function handleEnviar() {
    const textoLimpo = texto.trim()
    if (!textoLimpo || disabled) return

    onSubmit(textoLimpo)
    setTexto('')

    // Resetar altura da textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sem Shift envia; Shift+Enter quebra linha
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEnviar()
    }
  }

  const podeEnviar = texto.trim().length > 0 && !disabled

  return (
    <div className="flex items-end gap-2">
      <Textarea
        ref={textareaRef}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Digite sua mensagem... (Enter para enviar, Shift+Enter para nova linha)"
        disabled={disabled}
        rows={1}
        className={cn(
          'max-h-[200px] min-h-[44px] flex-1 resize-none overflow-y-auto',
          'rounded-xl border-input bg-background py-3 text-sm',
          'transition-all duration-150 focus-visible:ring-1',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      />
      <Button
        onClick={handleEnviar}
        disabled={!podeEnviar}
        size="icon"
        className={cn(
          'h-11 w-11 shrink-0 rounded-xl transition-all duration-150',
          podeEnviar
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-muted text-muted-foreground',
        )}
        aria-label="Enviar mensagem"
      >
        <SendHorizonal className="h-5 w-5" />
      </Button>
    </div>
  )
}