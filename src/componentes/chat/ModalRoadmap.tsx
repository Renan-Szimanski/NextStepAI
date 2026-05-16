// src/componentes/chat/ModalRoadmap.tsx

'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/componentes/ui/dialog';
import { Button } from '@/componentes/ui/button';
import { Map, Download, Loader2 } from 'lucide-react';
import { DiagramaRoadmapReactFlow } from './DiagramaRoadmapReactFlow';
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
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800 flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAberto(true)}
          className="gap-2 text-xs font-medium border-primary text-primary hover:bg-primary/10"
        >
          <Map className="h-3.5 w-3.5" />
          Ver Roadmap Visual
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownloadPdf}
          disabled={gerandoPdf}
          className="gap-2 text-xs text-gray-500 dark:text-gray-400"
        >
          {gerandoPdf ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          {gerandoPdf ? 'Gerando PDF…' : 'Baixar PDF'}
        </Button>
      </div>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="flex flex-col gap-0 p-0 overflow-hidden bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800"
          style={{
            width: '95vw',
            maxWidth: '1200px',
            height: '90vh',
            maxHeight: '90vh',
          }}
        >
          <DialogHeader className="shrink-0 px-5 pt-5 pb-3 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-start justify-between gap-3">
              <DialogTitle className="text-base font-semibold flex items-center gap-2 leading-snug text-gray-900 dark:text-gray-100">
                <Map className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
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

            <div className="flex items-center gap-4 mt-2.5 flex-wrap">
              {[
                { cor: '#f59e0b', fundo: '#fef3c7', label: 'Curto prazo (0-3m)' },
                { cor: '#10b981', fundo: '#d1fae5', label: 'Médio prazo (3-6m)' },
                { cor: '#3b82f6', fundo: '#dbeafe', label: 'Longo prazo (6-12m)' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-3.5 h-3.5 rounded-sm border"
                    style={{ backgroundColor: item.fundo, borderColor: item.cor }}
                  />
                  <span className="text-[11px] text-gray-600 dark:text-gray-400">{item.label}</span>
                </div>
              ))}
              <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto hidden sm:block font-medium">
                💡 Clique nas habilidades para ver cursos e tutoriais
              </span>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900 p-4">
            <DiagramaRoadmapReactFlow 
              textoRoadmap={textoRoadmap} 
              onSkillToggle={(skill, concluido) => {
                console.log(`[Roadmap] Skill "${skill}" concluída: ${concluido}`);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}