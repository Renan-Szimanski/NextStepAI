'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/componentes/ui/sheet';
import { Button } from '@/componentes/ui/button';
import { Card, CardContent } from '@/componentes/ui/card';
import { ScrollArea } from '@/componentes/ui/scroll-area';
import { Separator } from '@/componentes/ui/separator';
import { Badge } from '@/componentes/ui/badge';
import { Checkbox } from '@/componentes/ui/checkbox';
import { Loader2, Link2, RefreshCw, CheckCircle2, ExternalLink, Sparkles } from 'lucide-react';

interface TooltipResumoSkillProps {
  skill: string;
  resumo: string;
  carregando: boolean;
  concluida: boolean;
  onClose: () => void;
  onToggleConcluido: (checked: boolean) => void;
}

interface Recurso {
  titulo: string;
  url: string;
  descricao: string;
}

// Componentes de estilo para o markdown (tipagem correta)
const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-xl font-bold mt-4 mb-2 text-gray-900 dark:text-gray-100">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-lg font-semibold mt-4 mb-2 text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-1">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-medium mt-3 mb-1 text-gray-800 dark:text-gray-200">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-sm text-gray-600 dark:text-gray-300 my-2 leading-relaxed">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-5 my-2 space-y-1 text-sm text-gray-600 dark:text-gray-300">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-5 my-2 space-y-1 text-sm text-gray-600 dark:text-gray-300">{children}</ol>
  ),
  li: ({ children }) => <li className="ml-1">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-gray-900 dark:text-gray-100">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">
      {children}
    </a>
  ),
  hr: () => <Separator className="my-3" />,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-primary pl-3 italic text-gray-500 dark:text-gray-400 my-2">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-xs font-mono">
      {children}
    </code>
  ),
};

export function TooltipResumoSkill({
  skill,
  resumo,
  carregando,
  concluida,
  onClose,
  onToggleConcluido,
}: TooltipResumoSkillProps) {
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [carregandoRecursos, setCarregandoRecursos] = useState(false);

  const buscarRecursos = async () => {
    setCarregandoRecursos(true);
    try {
      const response = await fetch('/api/buscar-recursos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habilidade: skill }),
      });
      if (response.ok) {
        const data = await response.json();
        setRecursos(data.recursos || []);
      } else {
        console.error('Erro ao buscar recursos:', response.status);
      }
    } catch (error) {
      console.error('Erro na requisição:', error);
    } finally {
      setCarregandoRecursos(false);
    }
  };

  useEffect(() => {
    if (skill) buscarRecursos();
  }, [skill]);

  return (
    <Sheet open={!!skill} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-[95vw] sm:w-[550px] max-w-[550px] flex flex-col p-0 bg-white dark:bg-gray-950 border-l border-gray-200 dark:border-gray-800 overflow-hidden"
      >
        <SheetHeader className="shrink-0 px-5 pt-5 pb-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Sparkles className="h-5 w-5 text-primary shrink-0" />
              <SheetTitle className="text-lg font-semibold break-words line-clamp-2 text-gray-900 dark:text-gray-100">
                {skill}
              </SheetTitle>
              {concluida && (
                <Badge className="bg-emerald-600 text-white text-xs shrink-0">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Concluída
                </Badge>
              )}
            </div>
          </div>
          <SheetDescription className="text-xs text-gray-500 dark:text-gray-400">
            Guia gerado por IA + recursos recomendados
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-4">
            {carregando ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-500 dark:text-gray-400">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm">Carregando guia e recursos...</p>
              </div>
            ) : (
              <>
                <Card className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
                  <CardContent className="p-4 prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown components={markdownComponents}>
                      {resumo || '*Nenhum resumo disponível no momento.*'}
                    </ReactMarkdown>
                  </CardContent>
                </Card>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                      <Link2 className="h-4 w-4 text-primary" />
                      Recursos recomendados
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={buscarRecursos}
                      disabled={carregandoRecursos}
                      className="h-8 px-2 text-xs"
                    >
                      {carregandoRecursos ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                      <span className="ml-1">Atualizar</span>
                    </Button>
                  </div>

                  {carregandoRecursos ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <span className="ml-2 text-sm text-gray-500">Buscando materiais...</span>
                    </div>
                  ) : recursos.length > 0 ? (
                    <div className="space-y-3">
                      {recursos.map((recurso, idx) => (
                        <div key={idx} className="p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-sm transition">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-medium text-sm break-words pr-2 text-gray-800 dark:text-gray-200">
                              {recurso.titulo}
                            </h4>
                            <a href={recurso.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-gray-500 hover:text-primary">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>
                          {recurso.descricao && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">{recurso.descricao}</p>
                          )}
                          <div className="mt-2 flex gap-2">
                            <Button variant="outline" size="sm" className="text-xs h-7" asChild>
                              <a href={recurso.url} target="_blank" rel="noopener noreferrer">
                                Abrir <ExternalLink className="h-3 w-3 ml-1" />
                              </a>
                            </Button>
                            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigator.clipboard.writeText(recurso.url)}>
                              Copiar link
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-sm text-gray-500 border border-dashed border-gray-200 dark:border-gray-800 rounded-lg">
                      <p>Nenhum recurso encontrado.</p>
                      <p className="text-xs mt-1">Tente buscar com termos mais genéricos.</p>
                    </div>
                  )}
                </div>

                <Separator className="bg-gray-200 dark:bg-gray-800" />

                <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-800">
                  <div className="flex items-center gap-3 min-w-0">
                    <Checkbox
                      id={`concluido-${skill}`}
                      checked={concluida}
                      onCheckedChange={(checked) => onToggleConcluido(checked === true)}
                      className="h-5 w-5 shrink-0"
                    />
                    <label htmlFor={`concluido-${skill}`} className="text-sm font-medium cursor-pointer select-none break-words text-gray-700 dark:text-gray-300">
                      Marcar como concluída
                    </label>
                  </div>
                  {concluida && (
                    <Badge className="bg-emerald-600 text-white text-xs shrink-0">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Feito!
                    </Badge>
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <div className="shrink-0 border-t border-gray-200 dark:border-gray-800 px-5 py-3 bg-gray-50 dark:bg-gray-900">
          <p className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <Sparkles className="h-3 w-3 shrink-0" />
            <span>Resumo gerado por IA • Recursos buscados da web</span>
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}