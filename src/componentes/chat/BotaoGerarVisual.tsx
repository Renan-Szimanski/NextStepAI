'use client';

import { useState } from 'react';
import { Button } from '@/componentes/ui/button';
import { Map } from 'lucide-react';
import { VisualRoadmapModal } from '../roadmap/VisualRoadmapModal';

interface BotaoGerarVisualProps {
  textoRoadmap: string;
}

export function BotaoGerarVisual({ textoRoadmap }: BotaoGerarVisualProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="mt-4 flex flex-col items-start gap-2 border-t pt-4">
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setIsModalOpen(true)}
      >
        <Map className="h-4 w-4" />
        Visualizar Roadmap Interativo
      </Button>

      {isModalOpen && (
        <VisualRoadmapModal
          markdown={textoRoadmap}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}