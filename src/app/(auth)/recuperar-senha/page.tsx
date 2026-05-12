"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function RecuperarSenhaPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/recuperar-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Erro ao enviar e-mail de recuperação.");
        setIsLoading(false);
        return;
      }

      setEnviado(true);
      toast.success("E-mail enviado! Verifique sua caixa de entrada (e spam).");
      setIsLoading(false);
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
      setIsLoading(false);
    }
  };

  if (enviado) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md shadow-xl border-border bg-card text-card-foreground">
          <CardHeader>
            <CardTitle>E-mail enviado</CardTitle>
            <CardDescription>
              Enviamos um link de recuperação de senha para <strong>{email}</strong>.
              Clique no link que está no e-mail para cadastrar uma nova senha.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/login")} className="w-full">
              Voltar para o login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md shadow-xl border-border bg-card text-card-foreground">
        <CardHeader>
          <CardTitle>Recuperar senha</CardTitle>
          <CardDescription>
            Digite seu e-mail cadastrado. Enviaremos um link para criar uma nova senha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Enviar link de recuperação
            </Button>
            <p className="text-sm text-center text-muted-foreground mt-4">
              <Link href="/login" className="text-primary hover:underline">
                Voltar para o login
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}