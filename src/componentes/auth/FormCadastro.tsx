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
  const [erro, setErro] = useState("");
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    senha: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
    setErro("");
  };

  const validarSenha = (senha: string) => {
    if (senha.length < 8) {
      setErro("A senha deve ter pelo menos 8 caracteres.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");

    if (!validarSenha(formData.senha)) return;

    setIsLoading(true);

    try {
      const response = await fetch("/api/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        const msgErro = data.error || "Erro ao criar conta.";
        setErro(msgErro);
        toast.error(msgErro);
        setIsLoading(false);
        return;
      }

      toast.success("Conta criada! Verifique seu e-mail para confirmar o cadastro.");
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      toast.error("Erro de conexão com o servidor.");
      setErro("Erro de conexão. Tente novamente.");
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
          placeholder="Mínimo 8 caracteres"
          value={formData.senha}
          onChange={handleChange}
          required 
        />
        {erro && (
          <p className="text-sm text-red-600 dark:text-red-400 mt-1">{erro}</p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Criar conta
      </Button>
    </form>
  );
}