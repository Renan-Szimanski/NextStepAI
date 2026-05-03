'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/componentes/ui/avatar'
import { Button } from '@/componentes/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from '@/componentes/ui/dropdown-menu'
import { LogOut, LogIn, Loader2 } from 'lucide-react'

// Gera iniciais para o fallback do avatar
function obterIniciais(nome?: string | null): string {
  if (!nome) return '?'
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0].toUpperCase())
    .join('')
}

/**
 * Componente genérico de autenticação.
 * Exibe botão "Entrar" para usuários não autenticados,
 * ou avatar + dropdown de logout para usuários autenticados.
 * Útil para páginas fora do dashboard (ex: landing page).
 */
export function AuthButton() {
  const { data: session, status } = useSession()

  // Estado de carregamento
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-9 w-9">
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
      </div>
    )
  }

  // Não autenticado → botão de login
  if (!session?.user) {
    return (
      <Button
        onClick={() => signIn('github', { callbackUrl: '/chat' })}
        variant="default"
        size="sm"
        className="gap-2"
      >
        <LogIn className="h-4 w-4" />
        Entrar
      </Button>
    )
  }

  // Autenticado → avatar + dropdown
  const { user } = session

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          aria-label="Menu do usuário"
        >
          <Avatar className="h-9 w-9 cursor-pointer">
            <AvatarImage
              src={user.image ?? undefined}
              alt={user.name ?? 'Avatar do usuário'}
            />
            <AvatarFallback className="bg-indigo-100 text-indigo-700 text-sm font-medium">
              {obterIniciais(user.name)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1">
            {user.name && (
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.name}
              </p>
            )}
            {user.email && (
              <p className="text-xs text-gray-500 truncate">
                {user.email}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: '/' })}
          className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}