import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { Navbar } from '@/componentes/layout/Navbar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar user={session.user} />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  )
}