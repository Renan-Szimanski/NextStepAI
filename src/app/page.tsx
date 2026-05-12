import Link from "next/link";
import { Button } from "@/componentes/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/componentes/ui/card";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <section className="max-w-3xl mx-auto space-y-8 mb-16">
          <h1 className="text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl">
            NextStep<span className="text-primary">AI</span>
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Seu mentor de carreira automatizado, guiado por IA e dados reais do mercado.
          </p>
          <div className="flex justify-center">
            <Link href="/login">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-6 text-lg rounded-full shadow-lg transition-all">
                Começar agora
              </Button>
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto w-full px-4">
          <Card className="border-border shadow-sm bg-card text-card-foreground">
            <CardHeader>
              <CardTitle className="text-lg">Análise inteligente</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Mapeamos as competências exigidas pelo mercado para a sua vaga-alvo de forma automática.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm bg-card text-card-foreground">
            <CardHeader>
              <CardTitle className="text-lg">Roadmap personalizado</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Receba um plano de estudos em curto, médio e longo prazo focado nos seus objetivos.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm bg-card text-card-foreground">
            <CardHeader>
              <CardTitle className="text-lg">Powered by RAG</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Recomendações precisas baseadas em descrições reais de vagas via busca semântica avançada.
              </p>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="py-6 border-t border-border text-center text-muted-foreground text-sm">
        <p>Desenvolvido pela equipe NextStepAI • Projeto Acadêmico 2024</p>
      </footer>
    </div>
  );
}