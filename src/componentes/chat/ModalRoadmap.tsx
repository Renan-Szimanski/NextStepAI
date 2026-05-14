'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/componentes/ui/button';
import { Map, Download, Loader2 } from 'lucide-react';
import { DiagramaRoadmapSvg } from './DiagramaRoadmapSvg';
import { extrairCargoAlvo } from '@/lib/detectar-roadmap';

interface ModalRoadmapProps {
  textoRoadmap: string;
}

export function ModalRoadmap({ textoRoadmap }: ModalRoadmapProps) {
  const [aberto, setAberto] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);

  const cargoAlvo = extrairCargoAlvo(textoRoadmap);
  const tituloLegivel = cargoAlvo
    ? cargoAlvo.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
    : 'Roadmap de Carreira';

  const handleDownloadPdf = useCallback(async () => {
    setGerandoPdf(true);
    try {
      const { gerarPdfRoadmap } = await import('@/lib/gerar-pdf-roadmap');
      const blob = await gerarPdfRoadmap(textoRoadmap);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = cargoAlvo ? `roadmap-${cargoAlvo}.pdf` : 'roadmap-pathfinder.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('[ModalRoadmap] Erro ao gerar PDF:', e);
    } finally {
      setGerandoPdf(false);
    }
  }, [textoRoadmap, cargoAlvo]);

  return (
    <>
      {/* Botões na bolha */}
      <div className="mt-3 pt-3 border-t border-border/40 flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAberto(true)}
          className="gap-2 text-xs font-medium"
          style={{ borderColor: 'hsl(var(--primary))', color: 'hsl(var(--primary))' }}
        >
          <Map className="h-3.5 w-3.5" />
          Ver Roadmap Visual
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownloadPdf}
          disabled={gerandoPdf}
          className="gap-2 text-xs text-muted-foreground"
        >
          {gerandoPdf ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          {gerandoPdf ? 'Gerando PDF…' : 'Baixar PDF'}
        </Button>
      </div>

      {/* Modal fullscreen no mobile, grande no desktop */}
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent
          className="flex flex-col gap-0 p-0 overflow-hidden"
          style={{
            width: '95vw',
            maxWidth: '1200px',
            height: '90vh',
            maxHeight: '90vh',
          }}
        >
          {/* Header fixo */}
          <DialogHeader className="shrink-0 px-5 pt-5 pb-3 border-b border-border/60">
            <div className="flex items-start justify-between gap-3">
              <DialogTitle className="text-base font-semibold flex items-center gap-2 leading-snug">
                <Map
                  className="h-4 w-4 shrink-0 mt-0.5"
                  style={{ color: 'hsl(var(--primary))' }}
                />
                {tituloLegivel}
              </DialogTitle>

              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPdf}
                disabled={gerandoPdf}
                className="gap-1.5 text-xs shrink-0"
              >
                {gerandoPdf ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                {gerandoPdf ? 'Gerando…' : 'Baixar PDF'}
              </Button>
            </div>

            {/* Legenda */}
            <div className="flex items-center gap-4 mt-2.5 flex-wrap">
              {[
                { cor: 'hsl(38 92% 48%)',  fundo: 'hsl(38 92% 88%)',  label: 'Curto prazo (0-3m)' },
                { cor: 'hsl(152 76% 34%)', fundo: 'hsl(152 60% 85%)', label: 'Médio prazo (3-6m)' },
                { cor: 'hsl(213 94% 52%)', fundo: 'hsl(213 80% 88%)', label: 'Longo prazo (6-12m)' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-3.5 h-3.5 rounded-sm border"
                    style={{ backgroundColor: item.fundo, borderColor: item.cor }}
                  />
                  <span className="text-[11px] text-muted-foreground">{item.label}</span>
                </div>
              ))}
              <span className="text-[10px] text-muted-foreground/50 ml-auto hidden sm:block">
                Arraste para navegar
              </span>
            </div>
          </DialogHeader>

          {/* Diagrama — ocupa todo o espaço restante, scroll em ambos os eixos */}
          <div className="flex-1 overflow-auto bg-background p-4">
            <DiagramaRoadmapSvg textoRoadmap={textoRoadmap} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}