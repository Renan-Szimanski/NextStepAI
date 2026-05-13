// src/app/(dashboard)/chat/layout.tsx
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { listarConversas } from '@/lib/supabase/historico'
import { SidebarHistorico } from '@/componentes/chat/SidebarHistorico'
import { MobileSidebar } from '@/componentes/chat/MobileSidebar'

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
      {/* Sidebar visível apenas em desktop */}
      <div className="hidden md:block">
        <SidebarHistorico conversas={conversas} />
      </div>

      {/* Conteúdo principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header mobile com botão de menu (aparece só em mobile) */}
        <div className="md:hidden border-b border-border/40 bg-background/80 backdrop-blur-sm px-4 py-2 flex items-center gap-2">
          <MobileSidebar conversas={conversas} />
          <h1 className="text-sm font-semibold">Pathfinder</h1>
        </div>

        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  )
}