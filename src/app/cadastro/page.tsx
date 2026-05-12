import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import FormCadastro from "@/componentes/auth/FormCadastro";

export default async function CadastroPage() {
  const session = await auth();
  if (session?.user) redirect("/chat");

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md shadow-xl border-border bg-card text-card-foreground">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-bold tracking-tight">
            Criar Conta
          </CardTitle>
          <CardDescription>
            Junte-se ao NextStepAI e decole sua carreira
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormCadastro />
          <p className="text-sm text-muted-foreground text-center mt-4">
            Já tem uma conta?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Faça login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}