import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import FormCadastro from "@/componentes/auth/FormCadastro";

export default async function CadastroPage() {
  const session = await auth();

  // Se já estiver logado, não tem por que criar conta nova
  if (session?.user) {
    redirect("/chat");
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50">
      <Card className="w-full max-w-md shadow-xl border-slate-200">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-bold tracking-tight text-slate-900">
            Criar Conta
          </CardTitle>
          <CardDescription className="text-slate-500 text-base">
            Junte-se ao NextStepAI e decole sua carreira
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          <FormCadastro />

          <p className="text-sm text-slate-500 text-center mt-4">
            Já tem uma conta?{" "}
            <Link href="/login" className="text-blue-600 hover:underline font-medium">
              Faça login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}