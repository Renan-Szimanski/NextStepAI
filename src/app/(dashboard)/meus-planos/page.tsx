// src/app/(dashboard)/meus-planos/page.tsx
import { redirect } from 'next/navigation'
import dynamic from 'next/dynamic'
import { auth } from '@/lib/auth'
import { listarConversas } from '@/lib/supabase/historico'

const ListaPlanos = dynamic(
  () => import('@/componentes/planos/ListaPlanos').then(mod => mod.ListaPlanos),
  {
    loading: () => (
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-40 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    ),
    ssr: false,
  }
)

export default async function PaginaMeusPlanos() {
  const sessao = await auth()
  if (!sessao?.user?.id) redirect('/login')

  const conversas = await listarConversas(sessao.user.id)

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <ListaPlanos conversas={conversas} />
      </div>
    </main>
  )
}