"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/componentes/ui/button";
import { LogOut } from "lucide-react";

export default function BotaoLogout() {
  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-slate-500 hover:text-red-600"
    >
      <LogOut className="h-4 w-4 mr-2" />
      Sair
    </Button>
  );
}