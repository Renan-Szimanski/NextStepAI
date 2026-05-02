import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/componentes/ui/card";
import BotaoLoginGitHub from "@/componentes/auth/BotaoLoginGitHub";

export default async function LoginPage() {
  const session = await auth();

  // Proteção: se já tiver sessão, vai direto pro MVP
  if (session) {
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
      <CardContent className="space-y-4 flex flex-col items-center">
        <BotaoLoginGitHub />
        <p className="text-xs text-slate-400 text-center mt-4">
          Usamos seu perfil GitHub apenas para identificação no sistema.
        </p>
      </CardContent>
    </Card>
  );
}