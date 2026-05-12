"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function NovaSenhaPage() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Extrai o token do hash da URL (ex: #access_token=xxx)
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const token = hashParams.get("access_token");
    if (token) {
      setAccessToken(token);
    } else {
      toast.error("Link de recuperação inválido ou expirado.");
      router.push("/login");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha !== confirmarSenha) {
      toast.error("As senhas não coincidem.");
      return;
    }
    if (senha.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    setIsLoading(true);

    if (accessToken) {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: "",
      });
      if (sessionError) {
        toast.error("Sessão inválida. Solicite um novo link de recuperação.");
        setIsLoading(false);
        return;
      }
    }

    const { error } = await supabase.auth.updateUser({ password: senha });

    if (error) {
      toast.error(error.message || "Erro ao alterar senha. Tente novamente.");
      setIsLoading(false);
    } else {
      toast.success("Senha alterada com sucesso! Faça login com sua nova senha.");
      router.push("/login?message=senha-alterada");
    }
  };

  if (!accessToken) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Verificando token...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md shadow-xl border-border bg-card text-card-foreground">
        <CardHeader>
          <CardTitle>Criar nova senha</CardTitle>
          <CardDescription>Digite sua nova senha (mínimo 8 caracteres)</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="senha">Nova senha</Label>
              <Input
                id="senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmar">Confirmar nova senha</Label>
              <Input
                id="confirmar"
                type="password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Alterar senha
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}