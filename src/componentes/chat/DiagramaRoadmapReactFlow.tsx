// src/componentes/chat/DiagramaRoadmapReactFlow.tsx

'use client';

import { useCallback, useMemo, useState } from 'react';
import { parsearRoadmap, GrafoRoadmap, NodoRoadmap } from '@/lib/parsear-roadmap';
import { Button } from '@/componentes/ui/button';
import { Checkbox } from '@/componentes/ui/checkbox';
import { Badge } from '@/componentes/ui/badge';
import { Check, ChevronRight, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { TooltipResumoSkill } from './TooltipResumoSkill';

interface DiagramaRoadmapReactFlowProps {
  textoRoadmap: string;
  usuarioId?: string;
  onSkillToggle?: (skill: string, concluido: boolean) => void;
}

// Cores sólidas, sem transparência
const ESTILOS_FASE: Record<number, {
  bg: string;
  border: string;
  text: string;
  edgeColor: string;
  badge: string;
}> = {
  0: {
    bg: 'bg-primary',
    border: 'border-primary',
    text: 'text-primary-foreground',
    edgeColor: 'hsl(var(--primary))',
    badge: 'bg-primary-foreground/20 text-primary-foreground',
  },
  1: {
    bg: 'bg-amber-100 dark:bg-amber-800',
    border: 'border-amber-500',
    text: 'text-amber-900 dark:text-amber-50',
    edgeColor: '#f59e0b',
    badge: 'bg-amber-200 text-amber-900 dark:bg-amber-700 dark:text-amber-50',
  },
  2: {
    bg: 'bg-emerald-100 dark:bg-emerald-800',
    border: 'border-emerald-500',
    text: 'text-emerald-900 dark:text-emerald-50',
    edgeColor: '#10b981',
    badge: 'bg-emerald-200 text-emerald-900 dark:bg-emerald-700 dark:text-emerald-50',
  },
  3: {
    bg: 'bg-blue-100 dark:bg-blue-800',
    border: 'border-blue-500',
    text: 'text-blue-900 dark:text-blue-50',
    edgeColor: '#3b82f6',
    badge: 'bg-blue-200 text-blue-900 dark:bg-blue-700 dark:text-blue-50',
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

  const CONFIG = {
    LARGURA_RAIZ: 300,
    ALTURA_RAIZ: 100,
    LARGURA_FASE: 280,
    ALTURA_FASE: 60,
    LARGURA_SKILL: 280,
    ALTURA_SKILL: 56,
    GAP_H: 100,
    GAP_V: 16,
    PADDING_V: 80,
  };

  const skillsPorFase = colunas.map((c) => c.filter((n) => n.tipo === 'skill').length);
  const maxSkills = Math.min(Math.max(...skillsPorFase, 3), 8);

  const alturaUtil =
    CONFIG.PADDING_V +
    CONFIG.ALTURA_FASE +
    30 +
    maxSkills * (CONFIG.ALTURA_SKILL + CONFIG.GAP_V) +
    CONFIG.PADDING_V;

  const larguraTotal =
    60 +
    CONFIG.LARGURA_RAIZ +
    CONFIG.GAP_H +
    3 * CONFIG.LARGURA_FASE +
    2 * CONFIG.GAP_H +
    60;

  const alturaTotal = Math.max(alturaUtil, CONFIG.ALTURA_RAIZ + 2 * CONFIG.PADDING_V);
  const centroY = alturaTotal / 2;
  const offsetX = 60;

  // Raiz
  for (const nodo of colunas[0]) {
    posicoes.set(nodo.id, {
      x: offsetX,
      y: centroY - CONFIG.ALTURA_RAIZ / 2,
      largura: CONFIG.LARGURA_RAIZ,
      altura: CONFIG.ALTURA_RAIZ,
    });
  }

  // Fases 1-3
  for (let col = 1; col <= 3; col++) {
    const nodosCol = colunas[col];
    if (!nodosCol.length) continue;

    const [fase, ...skills] = nodosCol;
    const xCol = offsetX + CONFIG.LARGURA_RAIZ + CONFIG.GAP_H + (col - 1) * (CONFIG.LARGURA_FASE + CONFIG.GAP_H);

    const alturaSkills = skills.length * CONFIG.ALTURA_SKILL + Math.max(0, skills.length - 1) * CONFIG.GAP_V;
    const blocoTotal = CONFIG.ALTURA_FASE + 30 + alturaSkills;
    const yFase = centroY - blocoTotal / 2;

    posicoes.set(fase.id, {
      x: xCol,
      y: yFase,
      largura: CONFIG.LARGURA_FASE,
      altura: CONFIG.ALTURA_FASE,
    });

    let yAtual = yFase + CONFIG.ALTURA_FASE + 30;
    for (const skill of skills) {
      posicoes.set(skill.id, {
        x: xCol,
        y: yAtual,
        largura: CONFIG.LARGURA_SKILL,
        altura: CONFIG.ALTURA_SKILL,
      });
      yAtual += CONFIG.ALTURA_SKILL + CONFIG.GAP_V;
    }
  }

  return { posicoes, larguraTotal, alturaTotal };
}

export function DiagramaRoadmapReactFlow({ 
  textoRoadmap, 
  usuarioId,
  onSkillToggle 
}: DiagramaRoadmapReactFlowProps) {
  const { grafo, posicoes, larguraTotal, alturaTotal } = useMemo(() => {
    const grafo = parsearRoadmap(textoRoadmap);
    const { posicoes, larguraTotal, alturaTotal } = calcularLayout(grafo);
    return { grafo, posicoes, larguraTotal, alturaTotal };
  }, [textoRoadmap]);

  const [zoomLevel, setZoomLevel] = useState<'sm' | 'md' | 'lg'>('md');
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedSkill, setSelectedSkill] = useState<NodoRoadmap | null>(null);
  const [resumoSkill, setResumoSkill] = useState<string>('');
  const [carregandoResumo, setCarregandoResumo] = useState(false);

  const [skillsConcluidas, setSkillsConcluidas] = useState<Set<string>>(() => {
    const concluidas = new Set<string>();
    grafo.nodos.forEach(n => {
      if (n.tipo === 'skill' && n.concluido) concluidas.add(n.id);
    });
    return concluidas;
  });

  const zoomScales = { sm: 0.6, md: 0.85, lg: 1.1 };
  const zoomAtual = zoomScales[zoomLevel];

  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => prev === 'lg' ? 'lg' : prev === 'md' ? 'lg' : 'md');
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => prev === 'sm' ? 'sm' : prev === 'md' ? 'sm' : 'md');
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoomLevel('md');
    setPan({ x: 0, y: 0 });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as Element).closest('button, input, a')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const limiteX = larguraTotal * 0.3;
    const limiteY = alturaTotal * 0.3;
    const novoX = Math.max(-limiteX, Math.min(limiteX, e.clientX - dragStart.x));
    const novoY = Math.max(-limiteY, Math.min(limiteY, e.clientY - dragStart.y));
    setPan({ x: novoX, y: novoY });
  }, [isDragging, dragStart, larguraTotal, alturaTotal]);

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  const handleToggleSkill = useCallback(async (nodo: NodoRoadmap, checked: boolean) => {
    setSkillsConcluidas(prev => {
      const novo = new Set(prev);
      if (checked) novo.add(nodo.id);
      else novo.delete(nodo.id);
      return novo;
    });
    onSkillToggle?.(nodo.label, checked);

    if (usuarioId) {
      try {
        await fetch('/api/progresso', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            acao: 'registrar',
            habilidade: nodo.label,
            nivel: checked ? 'dominado' : 'iniciado',
            porcentagem: checked ? 100 : 0,
            usuarioId,
          }),
        });
      } catch {
        console.error('Falha ao salvar progresso no backend.');
        setSkillsConcluidas(prev => {
          const novo = new Set(prev);
          if (checked) novo.delete(nodo.id);
          else novo.add(nodo.id);
          return novo;
        });
      }
    }
  }, [onSkillToggle, usuarioId]);

  const handleSkillClick = useCallback(async (nodo: NodoRoadmap) => {
    if (nodo.tipo !== 'skill') return;
    setSelectedSkill(nodo);
    setCarregandoResumo(true);
    setResumoSkill('');
    try {
      await new Promise(resolve => setTimeout(resolve, 400));
      const resumo = gerarResumoSimulado(nodo.label);
      setResumoSkill(resumo);
    } catch {
      setResumoSkill('Não foi possível carregar o resumo. Tente novamente.');
    } finally {
      setCarregandoResumo(false);
    }
  }, []);

  function gerarResumoSimulado(skill: string): string {
    const resumos: Record<string, string> = {
      'React': 'Resumo: Biblioteca JavaScript para interfaces. Aprenda: componentes, hooks (useState, useEffect), JSX, props. Pratique criando um todo-list. Pré-requisitos: JavaScript moderno.',
      'TypeScript': 'Resumo: JavaScript com tipos. Aprenda: interfaces, types, generics, config tsconfig. Pratique convertendo projetos JS. Pré-requisitos: JS intermediário.',
      'Node.js': 'Resumo: Runtime JS no servidor. Aprenda: modules, Express, async/await, APIs REST. Pratique criando uma API simples. Pré-requisitos: JS básico.',
      'SQL': 'Resumo: Linguagem para bancos relacionais. Aprenda: SELECT, JOIN, WHERE, indexes. Pratique com PostgreSQL. Pré-requisitos: lógica de programação.',
      'Docker': 'Resumo: Containerização de apps. Aprenda: Dockerfile, docker-compose, volumes. Pratique containerizando uma app Node. Pré-requisitos: linha de comando.',
    };
    return resumos[skill] || `Resumo: **${skill}** — Skill essencial para o cargo. Foque em: conceitos fundamentais, prática com projetos reais, e revisão periódica. Dica: aplique imediatamente em um projeto pessoal.`;
  }

  const totalSkills = grafo.nodos.filter(n => n.tipo === 'skill').length;
  const concluidasCount = grafo.nodos.filter(n => n.tipo === 'skill' && skillsConcluidas.has(n.id)).length;
  const progressoPercent = totalSkills > 0 ? Math.round((concluidasCount / totalSkills) * 100) : 0;

  return (
    <div className="relative w-full h-full min-h-[500px] bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      
      {/* Header com controles - cores sólidas */}
      <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-3 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm pointer-events-auto">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-600" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{concluidasCount}/{totalSkills} concluídas</span>
          </div>
          <div className="w-24 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progressoPercent}%` }} />
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">{progressoPercent}%</span>
        </div>

        <div className="flex items-center gap-1 bg-white dark:bg-gray-800 px-1.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm pointer-events-auto">
          <Button size="icon" variant="ghost" className="h-7 w-7 text-gray-600 dark:text-gray-400" onClick={handleZoomOut} disabled={zoomLevel === 'sm'}>
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <Badge variant="outline" className="text-[10px] px-2 h-6 bg-transparent border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">
            {zoomLevel === 'sm' ? 'Visão' : zoomLevel === 'md' ? 'Normal' : 'Detalhe'}
          </Badge>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-gray-600 dark:text-gray-400" onClick={handleZoomIn} disabled={zoomLevel === 'lg'}>
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-gray-600 dark:text-gray-400" onClick={handleZoomReset}>
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Área do diagrama */}
      <div 
        className="w-full h-full overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div 
          className="origin-top-left transition-transform duration-200 ease-out"
          style={{ 
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomAtual})`,
            width: larguraTotal,
            height: alturaTotal,
          }}
        >
          <svg
            viewBox={`0 0 ${larguraTotal} ${alturaTotal}`}
            className="w-full h-full"
            style={{ minWidth: larguraTotal, minHeight: alturaTotal }}
          >
            <defs>
              <filter id="sombra" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="rgba(0,0,0,0.15)" />
              </filter>
            </defs>

            {/* Grade sutil */}
            <pattern id="grade" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="currentColor" strokeWidth="0.3" opacity="0.05" />
            </pattern>
            <rect width={larguraTotal} height={alturaTotal} fill="url(#grade)" className="text-gray-400" />

            {/* Arestas */}
            {grafo.arestas.map((aresta, i) => {
              const de = posicoes.get(aresta.de);
              const para = posicoes.get(aresta.para);
              const nodoPara = grafo.nodos.find(n => n.id === aresta.para);
              if (!de || !para || !nodoPara) return null;
              const estilo = ESTILOS_FASE[nodoPara.fase];
              const concluida = nodoPara.tipo === 'skill' && skillsConcluidas.has(nodoPara.id);
              const xDe = de.x + de.largura;
              const yDe = de.y + de.altura / 2;
              const xPara = para.x;
              const yPara = para.y + para.altura / 2;
              return (
                <path
                  key={i}
                  d={`M ${xDe} ${yDe} C ${xDe + 40} ${yDe}, ${xPara - 40} ${yPara}, ${xPara} ${yPara}`}
                  fill="none"
                  stroke={estilo.edgeColor}
                  strokeWidth={concluida ? 1.5 : 2.5}
                  strokeDasharray={nodoPara.fase === 1 ? '0' : concluida ? '3 3' : '6 4'}
                  opacity={concluida ? 0.5 : 0.8}
                  className="transition-all duration-200"
                />
              );
            })}

            {/* Nodos */}
            {grafo.nodos.map((nodo) => {
              const pos = posicoes.get(nodo.id);
              if (!pos) return null;
              const estilo = ESTILOS_FASE[nodo.fase];
              const ehSkill = nodo.tipo === 'skill';
              const ehConcluida = skillsConcluidas.has(nodo.id);
              const ehClicavel = ehSkill;
              return (
                <g
                  key={nodo.id}
                  style={{ cursor: ehClicavel ? 'pointer' : 'default' }}
                  onClick={() => ehClicavel && handleSkillClick(nodo)}
                >
                  <foreignObject
                    x={pos.x}
                    y={pos.y}
                    width={pos.largura}
                    height={pos.altura}
                    className="overflow-visible"
                  >
                    <div
                      className={`
                        w-full h-full rounded-xl border-2 shadow-sm
                        ${estilo.bg} ${estilo.border} ${estilo.text}
                        ${ehConcluida ? 'ring-2 ring-emerald-500' : ''}
                        ${ehClicavel ? 'hover:shadow-md hover:-translate-y-0.5' : ''}
                        transition-all duration-200 ease-out
                        flex flex-col overflow-hidden
                      `}
                      style={{ filter: 'url(#sombra)' }}
                    >
                      <div className="flex items-center justify-between px-2 py-1 border-b border-current/10 shrink-0">
                        {ehSkill && (
                          <Checkbox
                            checked={ehConcluida}
                            onCheckedChange={(checked) => handleToggleSkill(nodo, checked === true)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-3.5 w-3.5 border-2 shrink-0 bg-white dark:bg-gray-900"
                          />
                        )}
                        {nodo.tipo === 'fase' && (
                          <Badge className={`${estilo.badge} text-[9px] font-normal px-1.5 py-0`}>
                            Fase {nodo.fase}
                          </Badge>
                        )}
                        {nodo.tipo === 'raiz' && (
                          <Badge className="bg-primary-foreground/20 text-primary-foreground text-[9px]">
                            Objetivo
                          </Badge>
                        )}
                        <div className="flex-1" />
                        {ehSkill && ehConcluida && (
                          <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        )}
                      </div>
                      <div className="flex-1 flex items-center justify-center px-2 py-1 min-h-0">
                        <span className={`
                          text-center font-medium leading-tight break-words line-clamp-2
                          ${nodo.tipo === 'raiz' ? 'text-sm' : nodo.tipo === 'fase' ? 'text-xs' : 'text-[11px]'}
                          ${ehConcluida && ehSkill ? 'line-through opacity-70' : ''}
                        `}>
                          {nodo.label}
                        </span>
                      </div>
                      {ehClicavel && !ehConcluida && (
                        <div className="absolute -right-1 -top-1">
                          <ChevronRight className="h-3 w-3 text-gray-500 dark:text-gray-400 animate-pulse" />
                        </div>
                      )}
                    </div>
                  </foreignObject>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Painel de resumo */}
      {selectedSkill && (
        <TooltipResumoSkill
          skill={selectedSkill.label}
          resumo={resumoSkill}
          carregando={carregandoResumo}
          concluida={skillsConcluidas.has(selectedSkill.id)}
          onClose={() => setSelectedSkill(null)}
          onToggleConcluido={(checked) => handleToggleSkill(selectedSkill, checked)}
        />
      )}

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm pointer-events-none">
        Arraste para mover • Clique em uma skill para ver detalhes • ☑ Marque como concluída
      </div>
    </div>
  );
}