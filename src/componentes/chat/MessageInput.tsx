'use client'

import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import { Button } from '@/componentes/ui/button'
import { Textarea } from '@/componentes/ui/textarea'
import { SendHorizonal, Paperclip } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UploadPopover } from './UploadPopover'

interface MessageInputProps {
  onSubmit: (texto: string) => void
  disabled: boolean
  hasCurriculo: boolean
  onUploadSuccess: (nomeArquivo: string, urlLeitura: string) => void
}

export function MessageInput({ onSubmit, disabled, hasCurriculo, onUploadSuccess }: MessageInputProps) {
  const [texto, setTexto] = useState('')
  const [showUploadPopover, setShowUploadPopover] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.style.height = 'auto'
    const novaAltura = Math.min(textarea.scrollHeight, 200)
    textarea.style.height = `${novaAltura}px`
  }, [texto])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowUploadPopover(false)
      }
    }
    if (showUploadPopover) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUploadPopover])

  function handleEnviar() {
    const textoLimpo = texto.trim()
    if (!textoLimpo || disabled) return

    onSubmit(textoLimpo)
    setTexto('')

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEnviar()
    }
  }

  const podeEnviar = texto.trim().length > 0 && !disabled

  return (
    <div className="relative">
      <div className="flex items-end gap-2">
        <Button
          onClick={() => setShowUploadPopover(!showUploadPopover)}
          disabled={disabled}
          variant="ghost"
          size="icon"
          className={cn(
            'h-11 w-11 shrink-0 rounded-xl transition-all duration-150 relative',
            hasCurriculo && 'text-green-600 dark:text-green-400'
          )}
          aria-label="Enviar currículo PDF"
          title="Enviar currículo PDF"
        >
          <Paperclip className="h-5 w-5" aria-hidden="true" />
          {hasCurriculo && (
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500 ring-2 ring-background" aria-hidden="true" />
          )}
        </Button>

        <Textarea
          ref={textareaRef}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite sua mensagem..."
          disabled={disabled}
          rows={1}
          aria-label="Digite sua mensagem"
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
          title="Enviar mensagem"
        >
          <SendHorizonal className="h-5 w-5" aria-hidden="true" />
        </Button>
      </div>
      {showUploadPopover && (
        <div ref={popoverRef} className="absolute bottom-full right-0">
          <UploadPopover
            onUploadSuccess={(nomeArquivo, urlLeitura) => {
              setShowUploadPopover(false)
              onUploadSuccess(nomeArquivo, urlLeitura)
            }}
            onClose={() => setShowUploadPopover(false)}
          />
        </div>
      )}
    </div>
  )
}