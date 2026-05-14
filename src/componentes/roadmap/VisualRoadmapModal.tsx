'use client';

import React, { useMemo, useState, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { converterMarkdownParaGrafo } from '@/lib/parser-roadmap-visual';
import { Button } from '@/componentes/ui/button';
import { Map, X, Download } from 'lucide-react';

interface VisualRoadmapModalProps {
  markdown: string;
  onClose: () => void;
}

export function VisualRoadmapModal({ markdown, onClose }: VisualRoadmapModalProps) {
  const [isClient, setIsClient] = useState(false);
  const { nodes, edges } = useMemo(() => converterMarkdownParaGrafo(markdown), [markdown]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Função para capturar tela (simplificada – pode usar html2canvas posteriormente)
  const handleExportImage = () => {
    alert('Função de exportação de imagem pode ser implementada com html2canvas.');
  };

  if (!isClient) return null; // evita hidratação

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm dark:bg-background/95">
      {/* Header do Modal */}
      <div className="flex items-center justify-between border-b bg-background p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Map className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Visualização do Roadmap</h2>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={handleExportImage}>
            <Download className="mr-2 h-4 w-4" />
            Salvar como Imagem
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Canvas do React Flow com tema adaptado */}
      <div className="flex-1 bg-muted/20 dark:bg-muted/10">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          attributionPosition="bottom-right"
          proOptions={{ hideAttribution: true }}
        >
          <Background
            color="hsl(var(--border))"
            variant={BackgroundVariant.Dots}
            gap={16}
            size={1}
          />
          <Controls className="[&>button]:bg-background [&>button]:border-border" />
          <MiniMap
            zoomable
            pannable
            nodeStrokeWidth={1}
            nodeStrokeColor="hsl(var(--border))"
            nodeColor="hsl(var(--primary))"
            maskColor="hsl(var(--background))"
          />
          <Panel position="bottom-left" className="text-xs text-muted-foreground">
            Arraste para navegar | Role para zoom
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}