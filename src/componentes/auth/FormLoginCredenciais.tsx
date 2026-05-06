"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function FormLoginCredenciais() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      toast.error("E-mail ou senha inválidos.");
      setIsLoading(false);
    } else {
      window.location.href = "/chat";
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2 text-left">
        <Label htmlFor="email">E-mail</Label>
        <Input 
          id="email" 
          type="email" 
          placeholder="m@exemplo.com" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required 
        />
      </div>
      <div className="space-y-2 text-left">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Senha</Label>
          {/* Link fictício para recuperar senha */}
          <a href="#" className="text-xs text-blue-600 hover:underline">
            Esqueceu a senha?
          </a>
        </div>
        <Input 
          id="password" 
          type="password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required 
        />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Entrar
      </Button>
    </form>
  );
}