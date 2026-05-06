import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import BotaoLoginGitHub from "@/componentes/auth/BotaoLoginGitHub";
import BotaoLoginGoogle from "@/componentes/auth/BotaoLoginGoogle";
import FormLoginCredenciais from "@/componentes/auth/FormLoginCredenciais";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/chat");
  }

  return (
    <Card className="w-full max-w-md shadow-xl border-slate-200">
      <CardHeader className="text-center space-y-2">
        <CardTitle className="text-3xl font-bold tracking-tight text-slate-900">
          NextStep<span className="text-blue-600">AI</span>
        </CardTitle>
        <CardDescription className="text-slate-500 text-base">
          Entre para começar a planejar sua carreira
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Formulário de E-mail e Senha */}
        <FormLoginCredenciais />

        {/* Divisor Visual */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-300" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-slate-500">
              Ou continue com
            </span>
          </div>
        </div>

        {/* Botões Sociais */}
        <div className="grid grid-cols-2 gap-4">
          <BotaoLoginGitHub />
          <BotaoLoginGoogle />
        </div>

        <p className="text-xs text-slate-400 text-center mt-4">
          Ao entrar, você concorda com nossos Termos de Serviço e Política de Privacidade.
        </p>
      </CardContent>
    </Card>
  );
}