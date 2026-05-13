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
    <div className="flex min-h-screen flex-col">
      <Navbar user={sessao.user} />
      <div className="flex-1">{children}</div>
    </div>
  )
}