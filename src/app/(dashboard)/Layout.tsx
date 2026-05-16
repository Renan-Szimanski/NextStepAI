// src/app/(dashboard)/layout.tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Navbar } from '@/componentes/layout/Navbar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const sessao = await auth()
  if (!sessao?.user) redirect('/login')

  return (
    // ✅ CORREÇÃO: Usar h-screen + overflow-hidden para controle total de scroll
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <Navbar user={sessao.user} />
      {/* ✅ CORREÇÃO: min-h-0 essencial para flex children com scroll */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  )
}