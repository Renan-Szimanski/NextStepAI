'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/componentes/ui/button';
import { Download, Loader2, AlertCircle } from 'lucide-react';
import { extrairCargoAlvo } from '@/lib/detectar-roadmap';

interface BotaoDownloadPdfProps {
  textoRoadmap: string;
  cargoAlvo?: string | null; // opcional — extraído automaticamente se não fornecido
}

type Estado = 'gerando' | 'pronto' | 'erro';

export function BotaoDownloadPdf({ textoRoadmap, cargoAlvo: cargoAlvoProp }: BotaoDownloadPdfProps) {
  const [estado, setEstado] = useState<Estado>('gerando');
  const urlBlobRef = useRef<string | null>(null);

  // Resolver cargo-alvo: prop tem prioridade, senão extrai do texto
  const cargoAlvo = cargoAlvoProp ?? extrairCargoAlvo(textoRoadmap);

  useEffect(() => {
    let cancelado = false;

    async function gerar() {
      try {
        const { gerarPdfRoadmap } = await import('@/lib/gerar-pdf-roadmap');
        const blob = await gerarPdfRoadmap(textoRoadmap, cargoAlvo);
        if (cancelado) return;
        urlBlobRef.current = URL.createObjectURL(blob);
        setEstado('pronto');
      } catch (erro) {
        console.error('[BotaoDownloadPdf] Erro ao gerar PDF:', erro);
        if (!cancelado) setEstado('erro');
      }
    }

    gerar();

    return () => {
      cancelado = true;
      if (urlBlobRef.current) {
        URL.revokeObjectURL(urlBlobRef.current);
        urlBlobRef.current = null;
      }
    };
  }, [textoRoadmap, cargoAlvo]);

  function handleDownload() {
    if (!urlBlobRef.current) return;
    const nomeArquivo = cargoAlvo
      ? `roadmap-${cargoAlvo}.pdf`
      : 'roadmap-pathfinder.pdf';
    const a = document.createElement('a');
    a.href = urlBlobRef.current;
    a.download = nomeArquivo;
    a.click();
  }

  if (estado === 'gerando') {
    return (
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/40">
        <Loader2
          className="h-3.5 w-3.5 animate-spin"
          style={{ color: '#6c63ff' }}
        />
        <span className="text-xs text-muted-foreground">Preparando diagrama PDF…</span>
      </div>
    );
  }

  if (estado === 'erro') {
    return (
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/40">
        <AlertCircle className="h-3.5 w-3.5 text-destructive" />
        <span className="text-xs text-muted-foreground">
          Não foi possível gerar o PDF.
        </span>
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-border/40">
      <Button
        variant="outline"
        size="sm"
        onClick={handleDownload}
        className="gap-2 text-xs font-medium"
        style={{ borderColor: '#6c63ff', color: '#6c63ff' }}
      >
        <Download className="h-3.5 w-3.5" />
        Baixar Roadmap em PDF
      </Button>
    </div>
  );
}