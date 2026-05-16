import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import FormLoginCredenciais from "@/componentes/auth/FormLoginCredenciais";

interface LoginPageProps {
  searchParams: Promise<{ error?: string; message?: string }> | { error?: string; message?: string };
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  if (session?.user) redirect("/chat");

  // Resolve searchParams (se for Promise)
  const params = await searchParams;
  const error = params?.error;
  const message = params?.message;

  // Não exibimos toast aqui porque é server component; os toasts serão exibidos no cliente
  // via useEffect no FormLoginCredenciais ou em um componente cliente separado.
  // Mas podemos passar as mensagens via props para um componente cliente.

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md shadow-xl border-border bg-card text-card-foreground">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-bold tracking-tight">
            NextStep<span className="text-primary">AI</span>
          </CardTitle>
          <CardDescription>
            Entre para começar a planejar sua carreira
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormLoginCredenciais errorFromUrl={error} messageFromUrl={message} />

          {/* <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Ou continue com
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <BotaoLoginGitHub />
            <BotaoLoginGoogle />
          </div> */}

          <p className="text-xs text-muted-foreground text-center mt-4">
            Ao entrar, você concorda com nossos Termos de Serviço e Política de Privacidade.
          </p>

          <p className="text-sm text-muted-foreground text-center mt-6">
            Ainda não tem uma conta?{" "}
            <Link href="/cadastro" className="text-primary hover:underline font-medium">
              Cadastre-se grátis
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}