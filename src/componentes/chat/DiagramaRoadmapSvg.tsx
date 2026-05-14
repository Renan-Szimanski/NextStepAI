'use client';

import { useMemo } from 'react';
import { parsearRoadmap, NodoRoadmap, GrafoRoadmap } from '@/lib/parsear-roadmap';

interface DiagramaRoadmapSvgProps {
  textoRoadmap: string;
}

const LARGURA_RAIZ = 280;
const ALTURA_RAIZ = 120;
const LARGURA_FASE = 260;
const ALTURA_FASE = 72;
const LARGURA_SKILL = 250;
const ALTURA_SKILL = 64;
const GAP_H = 120;
const GAP_V = 24;
const PADDING_V = 60;

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
    dashArray: '8 5',
  },
  3: {
    fundo: 'hsl(213 80% 88%)',
    borda: 'hsl(213 94% 52%)',
    texto: 'hsl(213 60% 18%)',
    aresta: 'hsl(213 94% 52%)',
    dashArray: '8 5',
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
  for (const nodo of grafo.nodos) colunas[nodo.fase].push(nodo);

  const skillsPorFase = colunas.map((c) => c.filter((n) => n.tipo === 'skill').length);
  const maxSkills = Math.max(...skillsPorFase, 3);

  const alturaUtil =
    PADDING_V +
    ALTURA_FASE +
    20 +
    maxSkills * (ALTURA_SKILL + GAP_V) +
    PADDING_V;

  const larguraTotal =
    40 +
    LARGURA_RAIZ +
    GAP_H +
    3 * LARGURA_FASE +
    2 * GAP_H +
    40;

  const alturaTotal = Math.max(alturaUtil, ALTURA_RAIZ + 2 * PADDING_V);
  const centroY = alturaTotal / 2;
  const offsetX = 40;

  // Raiz — centralizada verticalmente
  for (const nodo of colunas[0]) {
    posicoes.set(nodo.id, {
      x: offsetX,
      y: centroY - ALTURA_RAIZ / 2,
      largura: LARGURA_RAIZ,
      altura: ALTURA_RAIZ,
    });
  }

  // Fases 1-3
  for (let col = 1; col <= 3; col++) {
    const nodosCol = colunas[col];
    if (!nodosCol.length) continue;

    const [fase, ...skills] = nodosCol;
    const xCol =
      offsetX + LARGURA_RAIZ + GAP_H + (col - 1) * (LARGURA_FASE + GAP_H);

    const alturaSkills =
      skills.length * ALTURA_SKILL + Math.max(0, skills.length - 1) * GAP_V;
    const blocoTotal = ALTURA_FASE + 20 + alturaSkills;
    const yFase = centroY - blocoTotal / 2;

    posicoes.set(fase.id, {
      x: xCol,
      y: yFase,
      largura: LARGURA_FASE,
      altura: ALTURA_FASE,
    });

    let yAtual = yFase + ALTURA_FASE + 20;
    for (const skill of skills) {
      posicoes.set(skill.id, {
        x: xCol,
        y: yAtual,
        largura: LARGURA_SKILL,
        altura: ALTURA_SKILL,
      });
      yAtual += ALTURA_SKILL + GAP_V;
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
}: {
  label: string;
  x: number;
  y: number;
  largura: number;
  altura: number;
  cor: string;
  tipo: 'raiz' | 'fase' | 'skill';
}) {
  const fontSize = tipo === 'raiz' ? 16 : tipo === 'fase' ? 14 : 13;
  const fontWeight = tipo === 'skill' ? 'normal' : 'bold';
  const maxChars = Math.floor(largura / (fontSize * 0.58));

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
          {linha}
        </text>
      ))}
    </>
  );
}

function Nodo({ nodo, pos }: { nodo: NodoRoadmap; pos: Posicao }) {
  const estilo = ESTILOS_FASE[nodo.fase];
  const raio = nodo.tipo === 'raiz' ? 16 : nodo.tipo === 'fase' ? 12 : 10;

  return (
    <g>
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
      />
    </g>
  );
}

function Aresta({
  de,
  para,
  fasePara,
}: {
  de: Posicao;
  para: Posicao;
  fasePara: number;
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
    <g opacity={0.8}>
      <path
        d={d}
        fill="none"
        stroke={estilo.aresta}
        strokeWidth={2}
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

  return (
    // Wrapper com scroll horizontal para mobile
    <div style={{ overflowX: 'auto', overflowY: 'auto', width: '100%' }}>
      <svg
        viewBox={`0 0 ${larguraTotal} ${alturaTotal}`}
        // Largura mínima fixa para nunca comprimir em mobile
        style={{
          display: 'block',
          minWidth: `${larguraTotal}px`,
          height: `${alturaTotal}px`,
          maxHeight: '70vh',
        }}
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

        <rect width={larguraTotal} height={alturaTotal} fill="url(#grade)" />

        {/* Arestas */}
        {grafo.arestas.map((aresta, i) => {
          const de = posicoes.get(aresta.de);
          const para = posicoes.get(aresta.para);
          const nodoPara = grafo.nodos.find((n) => n.id === aresta.para);
          if (!de || !para || !nodoPara) return null;
          return <Aresta key={i} de={de} para={para} fasePara={nodoPara.fase} />;
        })}

        {/* Nodos */}
        {grafo.nodos.map((nodo) => {
          const pos = posicoes.get(nodo.id);
          if (!pos) return null;
          return <Nodo key={nodo.id} nodo={nodo} pos={pos} />;
        })}
      </svg>
    </div>
  );
}