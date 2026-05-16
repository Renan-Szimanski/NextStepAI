import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/componentes/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/componentes/ui/avatar'
import { BotaoLogout } from './BotaoLogout'

interface NavbarProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

function obterIniciais(nome?: string | null): string {
  if (!nome) return '?'
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(parte => parte[0].toUpperCase())
    .join('')
}

export function Navbar({ user }: NavbarProps) {
  return (
    <nav aria-label="Navegação principal">
      <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link
              href="/chat"
              className="flex items-center gap-2 font-bold text-xl text-gray-900 hover:text-gray-700 transition-colors"
              aria-current="page"
            >
              <span className="text-indigo-600">NextStep</span>
              <span>AI</span>
            </Link>

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
                <BotaoLogout />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
    </nav>
  )
}