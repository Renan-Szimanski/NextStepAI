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
    <div className="flex h-full w-full overflow-hidden bg-background">
      <div className="hidden md:block h-full min-h-0">
        <SidebarHistorico conversas={conversas} />
      </div>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="md:hidden border-b border-border/40 bg-background/80 backdrop-blur-sm px-4 py-2 flex items-center gap-2 shrink-0">
          <MobileSidebar conversas={conversas} />
          <h1 className="text-sm font-semibold">Pathfinder</h1>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  )
}