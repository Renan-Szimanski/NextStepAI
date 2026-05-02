import Link from "next/link";
import { Button } from "@/componentes/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/ui/card";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <section className="max-w-3xl mx-auto space-y-8 mb-16">
          <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
            NextStep<span className="text-blue-600">AI</span>
          </h1>
          <p className="text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Seu mentor de carreira automatizado, guiado por IA e dados reais do mercado.
          </p>
          <div className="flex justify-center">
            <Link href="/login">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-6 text-lg rounded-full shadow-lg transition-all">
                Começar agora
              </Button>
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto w-full px-4">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-slate-800">Análise inteligente</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Mapeamos as competências exigidas pelo mercado para a sua vaga-alvo de forma automática.
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-slate-800">Roadmap personalizado</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Receba um plano de estudos em curto, médio e longo prazo focado nos seus objetivos.
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-slate-800">Powered by RAG</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Recomendações precisas baseadas em descrições reais de vagas via busca semântica avançada.
              </p>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="py-6 border-t border-slate-200 text-center text-slate-500 text-sm">
        <p>Desenvolvido pela equipe NextStepAI • Projeto Acadêmico 2024</p>
      </footer>
    </div>
  );
}