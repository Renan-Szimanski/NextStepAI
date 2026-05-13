// src/app/(dashboard)/chat/page.tsx
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { buscarConversa } from '@/lib/supabase/historico'
import { ChatContainer } from '@/componentes/chat/ChatContainer'
import { UploadCurriculo } from '@/componentes/curriculo/UploadCurriculo' // ← adicionar

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
    <main className="h-screen w-full overflow-hidden flex flex-col"> {/* ajuste para coluna */}
      <div className="flex-1 overflow-hidden">
        <ChatContainer
          key={conversaId ?? 'nova'}
          userId={sessao.user.id}
          historicoInicial={historicoInicial}
          conversaId={conversaId}
        />
      </div>
      <div className="border-t p-4 bg-background">
        <UploadCurriculo />
      </div>
    </main>
  )
}