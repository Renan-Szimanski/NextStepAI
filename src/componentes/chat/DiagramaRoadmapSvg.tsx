// src/componentes/chat/DiagramaRoadmapSvg.tsx

'use client';

import { useMemo, useState, useRef, useCallback } from 'react';
import { parsearRoadmap, NodoRoadmap, GrafoRoadmap } from '@/lib/parsear-roadmap';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { Button } from '@/componentes/ui/button';

interface DiagramaRoadmapSvgProps {
  textoRoadmap: string;
}

const CONFIG_LAYOUT = {
  LARGURA_RAIZ: 320,
  ALTURA_RAIZ: 100,
  LARGURA_FASE: 300,
  ALTURA_FASE: 60,
  LARGURA_SKILL: 280,
  ALTURA_SKILL: 50,
  GAP_H: 100,
  GAP_V: 16,
  PADDING_V: 80,
  MAX_SKILLS_POR_COLUNA: 8,
};

const ESTILOS_FASE: Record<number, {
  fundo: string;
  borda: string;
  texto: string;
  aresta: string;
  dashArray?: string;
}> = {
  0: {
    fundo: 'hsl(var(--primary))',
    borda: 'hsl(var(--primary))',
    texto: 'hsl(var(--primary-foreground))',
    aresta: 'hsl(var(--primary))',
  },
  1: {
    fundo: 'hsl(38 92% 88%)',
    borda: 'hsl(38 92% 48%)',
    texto: 'hsl(38 60% 18%)',
    aresta: 'hsl(38 92% 48%)',
  },
  2: {
    fundo: 'hsl(152 60% 85%)',
    borda: 'hsl(152 76% 34%)',
    texto: 'hsl(152 60% 13%)',
    aresta: 'hsl(152 76% 34%)',
    dashArray: '6 4',
  },
  3: {
    fundo: 'hsl(213 80% 88%)',
    borda: 'hsl(213 94% 52%)',
    texto: 'hsl(213 60% 18%)',
    aresta: 'hsl(213 94% 52%)',
    dashArray: '6 4',
  },
};

interface Posicao {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

function calcularLayout(grafo: GrafoRoadmap): {
  posicoes: Map<string, Posicao>;
  larguraTotal: number;
  alturaTotal: number;
} {
  const posicoes = new Map<string, Posicao>();
  const colunas: NodoRoadmap[][] = [[], [], [], []];
  
  for (const nodo of grafo.nodos) {
    colunas[nodo.fase].push(nodo);
  }

  const skillsPorFase = colunas.map((c) => c.filter((n) => n.tipo === 'skill').length);
  const maxSkills = Math.min(Math.max(...skillsPorFase, 3), CONFIG_LAYOUT.MAX_SKILLS_POR_COLUNA);

  const alturaUtil =
    CONFIG_LAYOUT.PADDING_V +
    CONFIG_LAYOUT.ALTURA_FASE +
    30 +
    maxSkills * (CONFIG_LAYOUT.ALTURA_SKILL + CONFIG_LAYOUT.GAP_V) +
    CONFIG_LAYOUT.PADDING_V;

  const larguraTotal =
    60 +
    CONFIG_LAYOUT.LARGURA_RAIZ +
    CONFIG_LAYOUT.GAP_H +
    3 * CONFIG_LAYOUT.LARGURA_FASE +
    2 * CONFIG_LAYOUT.GAP_H +
    60;

  const alturaTotal = Math.max(alturaUtil, CONFIG_LAYOUT.ALTURA_RAIZ + 2 * CONFIG_LAYOUT.PADDING_V);
  const centroY = alturaTotal / 2;
  const offsetX = 60;

  for (const nodo of colunas[0]) {
    posicoes.set(nodo.id, {
      x: offsetX,
      y: centroY - CONFIG_LAYOUT.ALTURA_RAIZ / 2,
      largura: CONFIG_LAYOUT.LARGURA_RAIZ,
      altura: CONFIG_LAYOUT.ALTURA_RAIZ,
    });
  }

  for (let col = 1; col <= 3; col++) {
    const nodosCol = colunas[col];
    if (!nodosCol.length) continue;

    const [fase, ...skills] = nodosCol;
    const xCol =
      offsetX + CONFIG_LAYOUT.LARGURA_RAIZ + CONFIG_LAYOUT.GAP_H + (col - 1) * (CONFIG_LAYOUT.LARGURA_FASE + CONFIG_LAYOUT.GAP_H);

    const alturaSkills =
      skills.length * CONFIG_LAYOUT.ALTURA_SKILL + Math.max(0, skills.length - 1) * CONFIG_LAYOUT.GAP_V;
    const blocoTotal = CONFIG_LAYOUT.ALTURA_FASE + 30 + alturaSkills;
    const yFase = centroY - blocoTotal / 2;

    posicoes.set(fase.id, {
      x: xCol,
      y: yFase,
      largura: CONFIG_LAYOUT.LARGURA_FASE,
      altura: CONFIG_LAYOUT.ALTURA_FASE,
    });

    let yAtual = yFase + CONFIG_LAYOUT.ALTURA_FASE + 30;
    for (const skill of skills) {
      posicoes.set(skill.id, {
        x: xCol,
        y: yAtual,
        largura: CONFIG_LAYOUT.LARGURA_SKILL,
        altura: CONFIG_LAYOUT.ALTURA_SKILL,
      });
      yAtual += CONFIG_LAYOUT.ALTURA_SKILL + CONFIG_LAYOUT.GAP_V;
    }
  }

  return { posicoes, larguraTotal, alturaTotal };
}

function TextoNodo({
  label,
  x,
  y,
  largura,
  altura,
  cor,
  tipo,
  concluido,
}: {
  label: string;
  x: number;
  y: number;
  largura: number;
  altura: number;
  cor: string;
  tipo: 'raiz' | 'fase' | 'skill'; // ← Tipagem compatível com NodoRoadmap.tipo
  concluido?: boolean;
}) {
  const fontSize = tipo === 'raiz' ? 16 : tipo === 'fase' ? 14 : 12;
  const fontWeight = tipo === 'skill' ? 'normal' : 'bold';
  const maxChars = Math.floor(largura / (fontSize * 0.6));

  const palavras = label.split(' ');
  const linhas: string[] = [];
  let atual = '';

  for (const p of palavras) {
    const teste = atual ? `${atual} ${p}` : p;
    if (teste.length > maxChars && atual) {
      linhas.push(atual);
      atual = p;
    } else {
      atual = teste;
    }
  }
  if (atual) linhas.push(atual);

  const alturaLinha = fontSize * 1.4;
  const totalH = linhas.length * alturaLinha;
  const inicioY = y + altura / 2 - totalH / 2 + alturaLinha * 0.75;

  return (
    <>
      {linhas.map((linha, i) => (
        <text
          key={i}
          x={x + largura / 2}
          y={inicioY + i * alturaLinha}
          textAnchor="middle"
          fill={cor}
          fontSize={fontSize}
          fontWeight={fontWeight}
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {concluido && tipo === 'skill' && '✓ '}
          {linha}
        </text>
      ))}
    </>
  );
}

function Nodo({ nodo, pos }: { nodo: NodoRoadmap; pos: Posicao }) {
  const estilo = ESTILOS_FASE[nodo.fase];
  const raio = nodo.tipo === 'raiz' ? 16 : nodo.tipo === 'fase' ? 12 : 10;
  
  const opacidade = nodo.concluido ? 0.7 : 1;
  const dashArray = nodo.concluido && nodo.tipo === 'skill' ? '4 4' : undefined;

  return (
    <g opacity={opacidade}>
      <rect
        x={pos.x}
        y={pos.y}
        width={pos.largura}
        height={pos.altura}
        rx={raio}
        ry={raio}
        fill={estilo.fundo}
        stroke={estilo.borda}
        strokeWidth={nodo.tipo === 'raiz' ? 3 : nodo.tipo === 'fase' ? 2.5 : 1.5}
        strokeDasharray={dashArray}
        filter="url(#sombra)"
      />
      <TextoNodo
        label={nodo.label}
        x={pos.x}
        y={pos.y}
        largura={pos.largura}
        altura={pos.altura}
        cor={estilo.texto}
        tipo={nodo.tipo}
        concluido={nodo.concluido}
      />
      {nodo.concluido && nodo.tipo === 'skill' && (
        <title>Habilidade já possuída (do currículo)</title>
      )}
    </g>
  );
}

function Aresta({
  de,
  para,
  fasePara,
  concluido,
}: {
  de: Posicao;
  para: Posicao;
  fasePara: number;
  concluido?: boolean;
}) {
  const estilo = ESTILOS_FASE[fasePara];

  const xDe = de.x + de.largura;
  const yDe = de.y + de.altura / 2;
  const xPara = para.x;
  const yPara = para.y + para.altura / 2;
  const ctrl = (xPara - xDe) / 2;

  const d = `M ${xDe} ${yDe} C ${xDe + ctrl} ${yDe}, ${xPara - ctrl} ${yPara}, ${xPara} ${yPara}`;

  const ang = Math.atan2(yPara - yDe, xPara - xDe);
  const tam = 10;
  const ax1 = xPara - tam * Math.cos(ang - Math.PI / 6);
  const ay1 = yPara - tam * Math.sin(ang - Math.PI / 6);
  const ax2 = xPara - tam * Math.cos(ang + Math.PI / 6);
  const ay2 = yPara - tam * Math.sin(ang + Math.PI / 6);

  return (
    <g opacity={concluido ? 0.4 : 0.8}>
      <path
        d={d}
        fill="none"
        stroke={estilo.aresta}
        strokeWidth={concluido ? 1.5 : 2}
        strokeDasharray={estilo.dashArray}
      />
      <polygon
        points={`${xPara},${yPara} ${ax1},${ay1} ${ax2},${ay2}`}
        fill={estilo.aresta}
      />
    </g>
  );
}

export function DiagramaRoadmapSvg({ textoRoadmap }: DiagramaRoadmapSvgProps) {
  const { grafo, posicoes, larguraTotal, alturaTotal } = useMemo(() => {
    const grafo = parsearRoadmap(textoRoadmap);
    const { posicoes, larguraTotal, alturaTotal } = calcularLayout(grafo);
    return { grafo, posicoes, larguraTotal, alturaTotal };
  }, [textoRoadmap]);

  const [zoom, setZoom] = useState(0.7);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleZoomIn = useCallback(() => {
    setZoom(z => Math.min(z + 0.1, 1.5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(z => Math.max(z - 0.1, 0.3));
  }, []);

  const handleReset = useCallback(() => {
    setZoom(0.7);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as Element).tagName === 'rect') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setZoom(z => Math.max(0.3, Math.min(1.5, z + delta)));
  }, []);

  const totalSkills = grafo.nodos.filter(n => n.tipo === 'skill').length;
  const skillsConcluidas = grafo.nodos.filter(n => n.tipo === 'skill' && n.concluido).length;

  return (
    <div className="relative w-full h-full overflow-hidden bg-muted/30">
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <Button
          size="icon"
          variant="outline"
          onClick={handleZoomIn}
          className="h-8 w-8 bg-background/90 backdrop-blur"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          onClick={handleZoomOut}
          className="h-8 w-8 bg-background/90 backdrop-blur"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          onClick={handleReset}
          className="h-8 w-8 bg-background/90 backdrop-blur"
        >
          <Maximize className="h-4 w-4" />
        </Button>
      </div>

      <div className="absolute top-4 left-4 z-10 flex gap-4 bg-background/90 backdrop-blur px-3 py-2 rounded-lg shadow-sm border">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
          <span className="text-xs font-medium">Concluída ({skillsConcluidas})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full border-2 border-primary" />
          <span className="text-xs font-medium">A desenvolver ({totalSkills - skillsConcluidas})</span>
        </div>
        <div className="text-xs text-muted-foreground ml-2">
          Total: {totalSkills} skills
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${larguraTotal} ${alturaTotal}`}
        className="w-full h-full cursor-move"
        style={{
          minWidth: `${larguraTotal}px`,
          minHeight: `${alturaTotal}px`,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        aria-label={`Diagrama de roadmap: ${grafo.cargoAlvo}`}
      >
        <defs>
          <filter id="sombra" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="rgba(0,0,0,0.13)" />
          </filter>
          <pattern id="grade" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              opacity="0.07"
            />
          </pattern>
        </defs>

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          <rect 
            width={larguraTotal} 
            height={alturaTotal} 
            fill="url(#grade)" 
            className="text-foreground"
          />

          {grafo.arestas.map((aresta, i) => {
            const de = posicoes.get(aresta.de);
            const para = posicoes.get(aresta.para);
            const nodoPara = grafo.nodos.find((n) => n.id === aresta.para);
            if (!de || !para || !nodoPara) return null;
            return (
              <Aresta 
                key={i} 
                de={de} 
                para={para} 
                fasePara={nodoPara.fase}
                concluido={nodoPara.concluido}
              />
            );
          })}

          {grafo.nodos.map((nodo) => {
            const pos = posicoes.get(nodo.id);
            if (!pos) return null;
            return <Nodo key={nodo.id} nodo={nodo} pos={pos} />;
          })}
        </g>
      </svg>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-muted-foreground bg-background/80 backdrop-blur px-3 py-1.5 rounded-full border">
        Arraste para mover • Scroll para zoom
      </div>
    </div>
  );
}