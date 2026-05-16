'use client'

import { useOptimistic, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, Trash2, Loader2, History } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/componentes/ui/button'
import { cn } from '@/lib/utils'
import type { ConversaResumo } from '@/tipos/historico'

interface SidebarHistoricoProps {
  conversas: ConversaResumo[]
  onItemClick?: () => void
}

type ConversaOptimistic = ConversaResumo & {
  isDeleting?: boolean
}

function formatarDataRelativa(dataISO: string): string {
  try {
    return formatDistanceToNow(parseISO(dataISO), {
      addSuffix: true,
      locale: ptBR,
    })
  } catch {
    return 'data inválida'
  }
}

export function SidebarHistorico({ conversas, onItemClick }: SidebarHistoricoProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  
  const [optimisticConversas, setOptimisticConversas] = useOptimistic<
    ConversaOptimistic[],
    string
  >(
    conversas.map(c => ({ ...c, isDeleting: false })),
    (state, conversaId) => state.map(conv =>
      conv.id === conversaId ? { ...conv, isDeleting: true } : conv
    )
  )

  async function handleDelete(conversaId: string) {
    startTransition(async () => {
      setOptimisticConversas(conversaId)
      try {
        const res = await fetch(`/api/planos/${conversaId}`, { method: 'DELETE' })
        if (!res.ok) {
          const error = await res.json()
          throw new Error(error.error || 'Falha ao excluir')
        }
        toast.success('Conversa excluída')
        const currentId = new URLSearchParams(window.location.search).get('conversa')
        if (currentId === conversaId) router.push('/chat')
        router.refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro ao excluir')
        router.refresh()
      }
    })
  }

  function novaConversa() {
    window.location.href = '/chat'
  }

  const conversaAtualId = (() => {
    if (typeof window === 'undefined') return null
    const params = new URLSearchParams(window.location.search)
    return params.get('conversa')
  })()

  return (
    <aside className="flex flex-col h-full w-80 shrink-0 border-r border-border/40 bg-background/50 backdrop-blur-sm">
      
      {/* ===== HEADER FIXO ===== */}
      <header className="flex flex-col gap-1 p-4 border-b border-border/40 shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <History className="h-4 w-4 shrink-0" aria-hidden="true" />
            Histórico
          </h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={novaConversa} 
            className="h-8 px-2 gap-1 shrink-0"
          >
            <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
            Nova
          </Button>
        </div>
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {optimisticConversas.length} conversa{optimisticConversas.length !== 1 ? 's' : ''}
        </p>
      </header>

      {/* ===== LISTA ROLÁVEL ===== */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <div className="p-2 space-y-1 pr-1">
          
          {/* Estado vazio */}
          {optimisticConversas.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-10 px-3">
              <History className="h-8 w-8 mx-auto mb-3 opacity-40" aria-hidden="true" />
              <p>Nenhuma conversa ainda</p>
              <p className="text-xs mt-1 opacity-70">Clique em &quot;Nova&quot; para começar</p>
            </div>
          )}

          {/* Lista de conversas */}
          {optimisticConversas.map((conversa) => {
            const isActive = conversaAtualId === conversa.id
            
            return (
              <article
                key={conversa.id}
                className={cn(
                  "group relative rounded-lg transition-colors",
                  isActive ? "bg-accent/60" : "hover:bg-accent/40"
                )}
              >
                <Link
                  href={`/chat?conversa=${conversa.id}`}
                  onClick={onItemClick}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg min-w-0",
                    conversa.isDeleting && "pointer-events-none opacity-60"
                  )}
                >
                  {/* Conteúdo principal (flex-grow) */}
                  <div className="flex-1 min-w-0 space-y-1">
                    {/* Título */}
                    <p className="text-sm font-medium text-foreground truncate">
                      {conversa.titulo?.trim() || 'Sem título'}
                    </p>
                    
                    {/* Cargo alvo (opcional) */}
                    {conversa.cargoAlvo?.trim() && (
                      <p className="text-xs text-muted-foreground truncate">
                        {conversa.cargoAlvo}
                      </p>
                    )}
                    
                    {/* Data relativa */}
                    <p className="text-xs text-muted-foreground/80">
                      {formatarDataRelativa(conversa.atualizadoEm)}
                    </p>
                  </div>

                  {/* Botão de excluir (sempre visível no hover/focus) */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-7 w-7 shrink-0 transition-opacity",
                      "opacity-0 group-hover:opacity-100 focus:opacity-100",
                      "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      handleDelete(conversa.id)
                    }}
                    disabled={conversa.isDeleting}
                    aria-label={`Excluir conversa: ${conversa.titulo}`}
                  >
                    {conversa.isDeleting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                  </Button>
                </Link>
              </article>
            )
          })}
        </div>
      </div>
    </aside>
  )
}