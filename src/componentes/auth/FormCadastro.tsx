"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function FormCadastro() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    senha: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Erro ao criar conta.");
        setIsLoading(false);
        return;
      }

      toast.success("Conta criada com sucesso! Faça login.");
      router.push("/login"); // Manda o usuário para a tela de login
      
    } catch (error) {
      console.error(error); // <-- Usamos a variável aqui!
      toast.error("Erro de conexão com o servidor.");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2 text-left">
        <Label htmlFor="nome">Nome Completo</Label>
        <Input 
          id="nome" 
          placeholder="Seu nome" 
          value={formData.nome}
          onChange={handleChange}
          required 
        />
      </div>
      <div className="space-y-2 text-left">
        <Label htmlFor="email">E-mail</Label>
        <Input 
          id="email" 
          type="email" 
          placeholder="m@exemplo.com" 
          value={formData.email}
          onChange={handleChange}
          required 
        />
      </div>
      <div className="space-y-2 text-left">
        <Label htmlFor="senha">Senha</Label>
        <Input 
          id="senha" 
          type="password" 
          placeholder="Crie uma senha forte"
          value={formData.senha}
          onChange={handleChange}
          required 
          minLength={6}
        />
      </div>
      <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Criar conta
      </Button>
    </form>
  );
}