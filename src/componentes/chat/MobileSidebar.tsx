'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Button } from '@/componentes/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/componentes/ui/sheet'
import { SidebarHistorico } from './SidebarHistorico'
import type { ConversaResumo } from '@/tipos/historico'

interface MobileSidebarProps {
  conversas: ConversaResumo[]
}

export function MobileSidebar({ conversas }: MobileSidebarProps) {
  const [open, setOpen] = useState(false)

  const handleClose = () => setOpen(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-80">
        <SidebarHistorico conversas={conversas} onItemClick={handleClose} />
      </SheetContent>
    </Sheet>
  )
}