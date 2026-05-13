// src/app/(dashboard)/chat/page.tsx
import { redirect } from 'next/navigation'
import nextDynamic from 'next/dynamic'  // ← renomeado para evitar conflito
import { auth } from '@/lib/auth'
import { buscarConversa } from '@/lib/supabase/historico'

const ChatContainer = nextDynamic(
  () => import('@/componentes/chat/ChatContainer').then(mod => mod.ChatContainer),
  {
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse space-y-4 w-full max-w-[800px] px-4">
          <div className="h-20 bg-muted rounded-lg" />
          <div className="h-32 bg-muted rounded-lg" />
          <div className="h-24 bg-muted rounded-lg" />
        </div>
      </div>
    ),
    ssr: false,
  }
)

export const dynamic = 'force-dynamic'

interface PaginaChatProps {
  searchParams: Promise<{ conversa?: string }>
}

export default async function PaginaChat({ searchParams }: PaginaChatProps) {
  const sessao = await auth()
  if (!sessao?.user?.id) redirect('/login')

  const params = await searchParams
  const conversaId = params.conversa
  let historicoInicial = null

  if (conversaId) {
    const conversaCompleta = await buscarConversa(conversaId, sessao.user.id)
    if (conversaCompleta) historicoInicial = conversaCompleta.mensagens
  }

  return (
    <main className="h-screen w-full overflow-hidden">
      <ChatContainer
        key={conversaId ?? 'nova'}
        userId={sessao.user.id}
        historicoInicial={historicoInicial}
        conversaId={conversaId}
      />
    </main>
  )
}