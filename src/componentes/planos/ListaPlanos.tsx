// src/componentes/planos/ListaPlanos.tsx
'use client'

import { useOptimistic, useTransition } from 'react'
import Link from 'next/link'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { MessageSquare, Plus, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/componentes/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/componentes/ui/card'
import type { ConversaResumo } from '@/tipos/historico'

interface ListaPlanosProps {
  conversas: ConversaResumo[]
  // usuarioId removido pois não é utilizado no componente
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

export function ListaPlanos({ conversas }: ListaPlanosProps) {
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

        toast.success('Plano excluído com sucesso')
        window.location.reload()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro ao excluir plano')
        window.location.reload()
      }
    })
  }

  if (optimisticConversas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <MessageSquare className="h-16 w-16 text-gray-300 dark:text-gray-700 mb-4" />
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Nenhum plano ainda
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md">
          Comece uma conversa com o Pathfinder e seu primeiro roadmap aparecerá aqui.
        </p>
        <Link href="/chat" className="mt-6">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Criar meu primeiro plano
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Meus Planos
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {optimisticConversas.length} plano(s) de desenvolvimento
          </p>
        </div>
        <Link href="/chat">
          <Button variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            Nova conversa
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {optimisticConversas.map((conversa) => (
          <Card
            key={conversa.id}
            className={`relative transition-opacity ${
              conversa.isDeleting ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            <CardHeader className="pb-2">
              <CardTitle className="line-clamp-2 text-lg">
                {conversa.titulo}
              </CardTitle>
              {conversa.cargoAlvo && (
                <span className="inline-flex w-fit items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300">
                  {conversa.cargoAlvo}
                </span>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Atualizado {formatarDataRelativa(conversa.atualizadoEm)}
              </p>
            </CardContent>
            <CardFooter className="flex justify-between gap-2 pt-2">
              <Link href={`/chat?conversa=${conversa.id}`} className="flex-1">
                <Button variant="default" size="sm" className="w-full gap-1">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Retomar
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(conversa.id)}
                disabled={conversa.isDeleting}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
              >
                {conversa.isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}