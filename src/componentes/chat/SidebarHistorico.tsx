// src/componentes/chat/SidebarHistorico.tsx
'use client'

import { useOptimistic, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, Trash2, Loader2, History } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/componentes/ui/button'
import { ScrollArea } from '@/componentes/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { ConversaResumo } from '@/tipos/historico'

interface SidebarHistoricoProps {
  conversas: ConversaResumo[]
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

export function SidebarHistorico({ conversas }: SidebarHistoricoProps) {
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
        const res = await fetch(`/api/planos/${conversaId}`, {
          method: 'DELETE',
        })
        if (!res.ok) {
          const error = await res.json()
          throw new Error(error.error || 'Falha ao excluir')
        }
        toast.success('Conversa excluída')
        const currentId = new URLSearchParams(window.location.search).get('conversa')
        if (currentId === conversaId) {
          router.push('/chat')
        }
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
    <aside className="w-80 flex-shrink-0 border-r border-border/40 bg-background/50 backdrop-blur-sm flex flex-col h-full">
      <div className="p-4 border-b border-border/40">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico
          </h2>
          <Button variant="ghost" size="sm" onClick={novaConversa} className="gap-1">
            <Plus className="h-4 w-4" />
            Nova
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {optimisticConversas.length} conversa(s)
        </p>
      </div>

      {/* ScrollArea com altura total e overflow garantido */}
      <ScrollArea className="flex-1 h-full min-h-0">
        <div className="p-2 space-y-1">
          {optimisticConversas.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              Nenhuma conversa ainda.
              <br />
              Clique em &quot;Nova&quot; para começar.
            </div>
          )}
          {optimisticConversas.map((conversa) => {
            const isActive = conversaAtualId === conversa.id
            return (
              <div
                key={conversa.id}
                className={cn(
                  "group relative rounded-lg transition-all",
                  isActive && "bg-accent/50"
                )}
              >
                <Link
                  href={`/chat?conversa=${conversa.id}`}
                  className={cn(
                    "block p-3 rounded-lg hover:bg-accent/50 transition-colors",
                    conversa.isDeleting && "pointer-events-none opacity-50"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {conversa.titulo}
                      </p>
                      {conversa.cargoAlvo && (
                        <span className="text-xs text-muted-foreground">
                          {conversa.cargoAlvo}
                        </span>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatarDataRelativa(conversa.atualizadoEm)}
                      </p>
                    </div>
                  </div>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDelete(conversa.id)}
                  disabled={conversa.isDeleting}
                >
                  {conversa.isDeleting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  )}
                </Button>
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </aside>
  )
}