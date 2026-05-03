import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { ChatContainer } from '@/componentes/chat/ChatContainer'

export default async function PaginaChat() {
  const sessao = await auth()

  if (!sessao?.user?.id) {
    redirect('/login')
  }

  return (
    <main className="h-screen w-full overflow-hidden bg-background">
      <ChatContainer userId={sessao.user.id} />
    </main>
  )
}