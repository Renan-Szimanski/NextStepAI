// src/app/(dashboard)/chat/layout.tsx
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { listarConversas } from '@/lib/supabase/historico'
import { SidebarHistorico } from '@/componentes/chat/SidebarHistorico'

export const dynamic = 'force-dynamic'

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const sessao = await auth()
  if (!sessao?.user?.id) redirect('/login')

  const conversas = await listarConversas(sessao.user.id)

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <SidebarHistorico conversas={conversas} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}