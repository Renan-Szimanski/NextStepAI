// src/app/(dashboard)/meus-planos/page.tsx
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { listarConversas } from '@/lib/supabase/historico'
import { ListaPlanos } from '@/componentes/planos/ListaPlanos'

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