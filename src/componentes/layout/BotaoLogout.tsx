'use client'

import { signOut } from 'next-auth/react'
import { DropdownMenuItem } from '@/componentes/ui/dropdown-menu'
import { LogOut } from 'lucide-react'

export function BotaoLogout() {
  async function handleLogout() {
    await signOut({ callbackUrl: '/' })
  }

  return (
    <DropdownMenuItem
      onClick={handleLogout}
      className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
    >
      <LogOut className="mr-2 h-4 w-4" />
      Sair
    </DropdownMenuItem>
  )
}