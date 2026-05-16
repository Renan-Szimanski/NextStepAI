// src/componentes/chat/TooltipResumoSkill.tsx

'use client';

import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/componentes/ui/sheet';
import { Button } from '@/componentes/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/componentes/ui/card';
import { ScrollArea } from '@/componentes/ui/scroll-area';
import { Separator } from '@/componentes/ui/separator';
import { Badge } from '@/componentes/ui/badge';
import { Checkbox } from '@/componentes/ui/checkbox';
import { Loader2, BookOpen, Lightbulb, Clock, Link2, Target, CheckCircle2, ExternalLink, Sparkles, RefreshCw } from 'lucide-react';

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

// Função simples para converter markdown inline em JSX
function renderMarkdown(texto: string): React.ReactNode {
  if (!texto) return null;

  const escapeHtml = (str: string) => str.replace(/[&<>]/g, (m) => {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });

  let html = escapeHtml(texto);
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');
  html = html.replace(/\n/g, '<br />');

  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

function parsearResumo(markdown: string): {
  resumo: string;
  aprender?: string;
  praticar?: string;
  preRequisitos?: string;
} {
  const secoes: Record<string, string> = {};
  const linhas = markdown.split('\n');
  let secaoAtual = 'resumo';
  let conteudoAtual: string[] = [];

  for (const linha of linhas) {
    const trim = linha.trim();
    const matchSecao = trim.match(/^(\w+(?:\s+\w+)*):\s*(.*)$/);
    if (matchSecao) {
      if (conteudoAtual.length > 0) {
        secoes[secaoAtual] = conteudoAtual.join('\n').trim();
      }
      secaoAtual = matchSecao[1].toLowerCase().replace(/\s+/g, '');
      conteudoAtual = matchSecao[2] ? [matchSecao[2]] : [];
    } else if (trim) {
      conteudoAtual.push(trim);
    }
  }
  if (conteudoAtual.length > 0) {
    secoes[secaoAtual] = conteudoAtual.join('\n').trim();
  }

  return {
    resumo: secoes['resumo'] || secoes['oquee'] || '',
    aprender: secoes['aprender'] || secoes['focar'] || secoes['conceitos'],
    praticar: secoes['praticar'] || secoes['projetos'] || secoes['exercicio'],
    preRequisitos: secoes['prerequisitos'] || secoes['prerrequisitos'] || secoes['antes'],
  };
}

export function TooltipResumoSkill({
  skill,
  resumo,
  carregando,
  concluida,
  onClose,
  onToggleConcluido,
}: TooltipResumoSkillProps) {
  const secoes = parsearResumo(resumo);
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

  // Busca recursos automaticamente ao abrir a sidebar
  useEffect(() => {
    if (skill) {
      buscarRecursos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skill]);

  return (
    <Sheet open={!!skill} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-[95vw] sm:w-[500px] max-w-[500px] flex flex-col p-0 bg-white dark:bg-gray-950 border-l border-gray-200 dark:border-gray-800 overflow-hidden"
      >
        {/* Cabeçalho fixo */}
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
            Mini-guia gerado por IA + recursos recomendados
          </SheetDescription>
        </SheetHeader>

        {/* Área rolável com conteúdo */}
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-4">
            {carregando ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-500 dark:text-gray-400">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm">Carregando guia e recursos...</p>
              </div>
            ) : (
              <>
                {/* Resumo principal */}
                <Card className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-gray-900 dark:text-gray-100">
                      <BookOpen className="h-4 w-4 text-primary shrink-0" />
                      O que é e por que aprender?
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed break-words whitespace-pre-wrap overflow-x-hidden max-w-full">
                      {secoes.resumo ? (
                        renderMarkdown(secoes.resumo)
                      ) : (
                        'Resumo não disponível no momento.'
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* O que focar */}
                {secoes.aprender && (
                  <Card className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2 text-gray-900 dark:text-gray-100">
                        <Target className="h-4 w-4 text-primary shrink-0" />
                        O que focar primeiro?
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {secoes.aprender.split('\n').filter(Boolean).map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm break-words">
                            <span className="text-primary mt-0.5 shrink-0">•</span>
                            <div className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap break-words overflow-x-hidden">
                              {renderMarkdown(item.replace(/^[-*]\s*/, ''))}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Como praticar */}
                {secoes.praticar && (
                  <Card className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2 text-gray-900 dark:text-gray-100">
                        <Lightbulb className="h-4 w-4 text-primary shrink-0" />
                        Como praticar?
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {secoes.praticar.split('\n').filter(Boolean).map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm break-words">
                            <span className="text-primary mt-0.5 shrink-0">•</span>
                            <div className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap break-words overflow-x-hidden">
                              {renderMarkdown(item.replace(/^[-*]\s*/, ''))}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {/* Pré-requisitos */}
                {secoes.preRequisitos && (
                  <Card className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2 text-gray-900 dark:text-gray-100">
                        <Clock className="h-4 w-4 text-primary shrink-0" />
                        Pré-requisitos
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {secoes.preRequisitos.split(',').map((req, i) => (
                          <Badge key={i} variant="secondary" className="text-xs break-all bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                            {req.trim()}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Seção de recursos educacionais */}
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
                      {carregandoRecursos ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
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
                        <div
                          key={idx}
                          className="p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-sm transition"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-medium text-sm break-words pr-2 text-gray-800 dark:text-gray-200">
                              {recurso.titulo}
                            </h4>
                            <a
                              href={recurso.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 text-gray-500 hover:text-primary"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>
                          {recurso.descricao && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-words whitespace-pre-wrap">
                              {recurso.descricao}
                            </p>
                          )}
                          <div className="mt-2 flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-7"
                              asChild
                            >
                              <a href={recurso.url} target="_blank" rel="noopener noreferrer">
                                Abrir <ExternalLink className="h-3 w-3 ml-1" />
                              </a>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-7"
                              onClick={() => navigator.clipboard.writeText(recurso.url)}
                            >
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

                {/* Ações: checkbox de conclusão */}
                <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-800">
                  <div className="flex items-center gap-3 min-w-0">
                    <Checkbox
                      id={`concluido-${skill}`}
                      checked={concluida}
                      onCheckedChange={(checked) => onToggleConcluido(checked === true)}
                      className="h-5 w-5 shrink-0"
                    />
                    <label
                      htmlFor={`concluido-${skill}`}
                      className="text-sm font-medium cursor-pointer select-none break-words text-gray-700 dark:text-gray-300"
                    >
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

        {/* Rodapé fixo */}
        <div className="shrink-0 border-t border-gray-200 dark:border-gray-800 px-5 py-3 bg-gray-50 dark:bg-gray-900">
          <p className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <Sparkles className="h-3 w-3 shrink-0" />
            <span className="break-words">Resumo gerado por IA • Recursos buscados da web</span>
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}