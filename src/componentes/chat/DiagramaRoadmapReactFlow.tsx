'use client';

import { useCallback, useMemo, useState } from 'react';
import { parsearRoadmap, GrafoRoadmap, NodoRoadmap } from '@/lib/parsear-roadmap';
import { Button } from '@/componentes/ui/button';
import { Checkbox } from '@/componentes/ui/checkbox';
import { ChevronRight, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { TooltipResumoSkill } from './TooltipResumoSkill';

interface DiagramaRoadmapReactFlowProps {
  textoRoadmap: string;
  usuarioId?: string;
  onSkillToggle?: (skill: string, concluido: boolean) => void;
}

interface Posicao {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

// Paleta refinada – mais contraste no escuro e bordas suaves
const ESTILOS_FASE_MINIMALISTA: Record<number, {
  light: string;
  dark: string;
  textoLight: string;
  textoDark: string;
  linha: string;
  bordaLight: string;
  bordaDark: string;
}> = {
  1: {
    light: 'bg-blue-50/80 border-blue-200/80',
    dark: 'dark:bg-blue-950/40 dark:border-blue-700/60',
    textoLight: 'text-blue-900',
    textoDark: 'dark:text-blue-100',
    linha: 'text-blue-300 dark:text-blue-700',
    bordaLight: 'border-blue-300/50',
    bordaDark: 'dark:border-blue-600/40',
  },
  2: {
    light: 'bg-emerald-50/80 border-emerald-200/80',
    dark: 'dark:bg-emerald-950/40 dark:border-emerald-700/60',
    textoLight: 'text-emerald-900',
    textoDark: 'dark:text-emerald-100',
    linha: 'text-emerald-300 dark:text-emerald-700',
    bordaLight: 'border-emerald-300/50',
    bordaDark: 'dark:border-emerald-600/40',
  },
  3: {
    light: 'bg-violet-50/80 border-violet-200/80',
    dark: 'dark:bg-violet-950/40 dark:border-violet-700/60',
    textoLight: 'text-violet-900',
    textoDark: 'dark:text-violet-100',
    linha: 'text-violet-300 dark:text-violet-700',
    bordaLight: 'border-violet-300/50',
    bordaDark: 'dark:border-violet-600/40',
  },
  0: {
    light: 'bg-zinc-50 border-zinc-200',
    dark: 'dark:bg-zinc-800/60 dark:border-zinc-700',
    textoLight: 'text-zinc-800',
    textoDark: 'dark:text-zinc-200',
    linha: 'text-zinc-300 dark:text-zinc-700',
    bordaLight: 'border-zinc-300',
    bordaDark: 'dark:border-zinc-600',
  },
};

function calcularLayout(grafo: GrafoRoadmap): {
  posicoes: Map<string, Posicao>;
  larguraTotal: number;
  alturaTotal: number;
} {
  const posicoes = new Map<string, Posicao>();
  const colunas: NodoRoadmap[][] = [[], [], [], []];
  
  for (const nodo of grafo.nodos) colunas[nodo.fase].push(nodo);

  const CONFIG = {
    LARGURA_RAIZ: 280,
    ALTURA_RAIZ: 80,
    LARGURA_FASE: 320,
    ALTURA_FASE: 48,          // um pouco mais alto para acomodar borda
    LARGURA_SKILL: 320,
    ALTURA_SKILL: 64,
    GAP_H: 120,
    GAP_V: 20,
    PADDING_V: 120,
  };

  const skillsPorFase = colunas.map((c) => c.filter((n) => n.tipo === 'skill').length);
  const maxSkills = Math.max(...skillsPorFase, 3);

  const alturaUtil =
    CONFIG.PADDING_V +
    CONFIG.ALTURA_FASE +
    40 +
    maxSkills * (CONFIG.ALTURA_SKILL + CONFIG.GAP_V) +
    CONFIG.PADDING_V;

  const larguraTotal =
    80 +
    CONFIG.LARGURA_RAIZ +
    CONFIG.GAP_H +
    3 * CONFIG.LARGURA_FASE +
    2 * CONFIG.GAP_H +
    80;

  const alturaTotal = Math.max(alturaUtil, CONFIG.ALTURA_RAIZ + 2 * CONFIG.PADDING_V);
  const centroY = alturaTotal / 2;
  const offsetX = 80;

  for (const nodo of colunas[0]) {
    posicoes.set(nodo.id, {
      x: offsetX,
      y: centroY - CONFIG.ALTURA_RAIZ / 2,
      largura: CONFIG.LARGURA_RAIZ,
      altura: CONFIG.ALTURA_RAIZ,
    });
  }

  for (let col = 1; col <= 3; col++) {
    const nodosCol = colunas[col];
    if (!nodosCol.length) continue;

    const [fase, ...skills] = nodosCol;
    const xCol = offsetX + CONFIG.LARGURA_RAIZ + CONFIG.GAP_H + (col - 1) * (CONFIG.LARGURA_FASE + CONFIG.GAP_H);

    const alturaSkills = skills.length * CONFIG.ALTURA_SKILL + Math.max(0, skills.length - 1) * CONFIG.GAP_V;
    const blocoTotal = CONFIG.ALTURA_FASE + 40 + alturaSkills;
    const yFase = centroY - blocoTotal / 2;

    posicoes.set(fase.id, {
      x: xCol,
      y: yFase,
      largura: CONFIG.LARGURA_FASE,
      altura: CONFIG.ALTURA_FASE,
    });

    let yAtual = yFase + CONFIG.ALTURA_FASE + 40;
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

  const handleZoomIn = useCallback(() => setZoomLevel(prev => prev === 'lg' ? 'lg' : prev === 'md' ? 'lg' : 'md'), []);
  const handleZoomOut = useCallback(() => setZoomLevel(prev => prev === 'sm' ? 'sm' : prev === 'md' ? 'sm' : 'md'), []);
  const handleZoomReset = useCallback(() => { setZoomLevel('md'); setPan({ x: 0, y: 0 }); }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as Element).closest('button, input, a, foreignObject > div')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const limiteX = larguraTotal * 0.4;
    const limiteY = alturaTotal * 0.4;
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
      const response = await fetch('/api/gerar-resumo-skill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill: nodo.label }),
      });

      if (!response.ok) throw new Error('Falha na API');
      const data = await response.json();
      setResumoSkill(data.resumo);
    } catch (error) {
      console.error(error);
      setResumoSkill(`**${nodo.label}** – Não foi possível carregar o resumo no momento.`);
    } finally {
      setCarregandoResumo(false);
    }
  }, []);

  const totalSkills = grafo.nodos.filter(n => n.tipo === 'skill').length;
  const concluidasCount = grafo.nodos.filter(n => n.tipo === 'skill' && skillsConcluidas.has(n.id)).length;
  const progressoPercent = totalSkills > 0 ? Math.round((concluidasCount / totalSkills) * 100) : 0;

  return (
    <div className="relative w-full h-full min-h-[600px] bg-[#FCFCFC] dark:bg-[#0A0A0A] rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden font-sans">
      
      {/* Header com controles */}
      <div className="absolute top-6 left-6 right-6 z-30 flex items-center justify-between gap-2 pointer-events-none">
        
        {/* Progresso */}
        <div className="flex items-center gap-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md px-5 py-3 rounded-full border border-zinc-200/50 dark:border-zinc-700/50 shadow-[0_4px_12px_rgba(0,0,0,0.03)] pointer-events-auto">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100" />
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 tracking-wide">PROGRESSO</span>
          </div>
          <div className="w-32 h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-zinc-900 dark:bg-zinc-100 transition-all duration-700 ease-out" style={{ width: `${progressoPercent}%` }} />
          </div>
          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 w-8 text-right">{progressoPercent}%</span>
        </div>

        {/* Controles de Zoom */}
        <div className="flex items-center gap-1 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md px-2 py-1.5 rounded-full border border-zinc-200/50 dark:border-zinc-700/50 shadow-[0_4px_12px_rgba(0,0,0,0.03)] pointer-events-auto">
          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100" onClick={handleZoomOut} disabled={zoomLevel === 'sm'}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-1" />
          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100" onClick={handleZoomReset}>
            <Maximize2 className="h-4 w-4" />
          </Button>
          <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-1" />
          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100" onClick={handleZoomIn} disabled={zoomLevel === 'lg'}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Área do diagrama */}
      <div 
        className={`w-full h-full overflow-hidden ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div 
          className="origin-top-left transition-transform duration-300 ease-out"
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
            {/* Dot Grid Minimalista */}
            <pattern id="dotGrid" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" className="text-zinc-300/80 dark:text-zinc-800/80" fill="currentColor" />
            </pattern>
            <rect width={larguraTotal} height={alturaTotal} fill="url(#dotGrid)" />

            {/* Arestas - Linhas com sutil dica de cor da fase */}
            {grafo.arestas.map((aresta, i) => {
              const de = posicoes.get(aresta.de);
              const para = posicoes.get(aresta.para);
              const nodoPara = grafo.nodos.find(n => n.id === aresta.para);
              if (!de || !para || !nodoPara) return null;
              
              const ehFase = nodoPara.tipo === 'fase';
              const concluida = nodoPara.tipo === 'skill' && skillsConcluidas.has(nodoPara.id);
              const paletaFase = ESTILOS_FASE_MINIMALISTA[nodoPara.fase] || ESTILOS_FASE_MINIMALISTA[0];
              
              const xDe = de.x + de.largura;
              const yDe = de.y + de.altura / 2;
              const xPara = para.x;
              const yPara = para.y + para.altura / 2;
              const tension = 60;

              return (
                <path
                  key={i}
                  d={`M ${xDe} ${yDe} C ${xDe + tension} ${yDe}, ${xPara - tension} ${yPara}, ${xPara} ${yPara}`}
                  fill="none"
                  stroke="currentColor"
                  className={`
                    transition-all duration-300 ease-in-out
                    ${ehFase ? 'text-zinc-300 dark:text-zinc-800' : 
                      concluida ? 'text-zinc-900 dark:text-zinc-400' : paletaFase.linha}
                  `}
                  strokeWidth={concluida ? 2 : 1.5}
                  strokeDasharray={!concluida && !ehFase ? '4 4' : 'none'}
                />
              );
            })}

            {/* Nodos */}
            {grafo.nodos.map((nodo) => {
              const pos = posicoes.get(nodo.id);
              if (!pos) return null;
              
              const ehSkill = nodo.tipo === 'skill';
              const ehConcluida = skillsConcluidas.has(nodo.id);
              const paleta = ESTILOS_FASE_MINIMALISTA[nodo.fase] || ESTILOS_FASE_MINIMALISTA[0];
              
              return (
                <g key={nodo.id} className={ehSkill ? "cursor-pointer group" : ""}>
                  <foreignObject
                    x={pos.x}
                    y={pos.y}
                    width={pos.largura}
                    height={pos.altura}
                    className="overflow-visible"
                    onClick={(e) => {
                      if (ehSkill) {
                        e.stopPropagation();
                        handleSkillClick(nodo);
                      }
                    }}
                  >
                    {/* Nodo Raiz */}
                    {nodo.tipo === 'raiz' && (
                      <div className="w-full h-full bg-zinc-900 dark:bg-zinc-100 rounded-2xl flex items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-transparent">
                        <span className="text-zinc-50 dark:text-zinc-900 font-semibold tracking-tight text-lg px-6 text-center leading-snug">
                          {nodo.label}
                        </span>
                      </div>
                    )}

                    {/* Título da Fase – com borda e fundo suave */}
                    {nodo.tipo === 'fase' && (
                      <div className={`
                        w-full h-full rounded-xl flex items-center justify-center px-4
                        border shadow-sm transition-all duration-200
                        ${paleta.light} ${paleta.dark}
                        ${paleta.bordaLight} ${paleta.bordaDark}
                      `}>
                        <span className={`
                          text-[12px] font-semibold tracking-tight
                          ${paleta.textoLight} ${paleta.textoDark}
                        `}>
                          Fase {nodo.fase} • {nodo.label}
                        </span>
                      </div>
                    )}

                    {/* Card de Skill */}
                    {nodo.tipo === 'skill' && (
                      <div className={`
                        w-full h-full rounded-2xl flex items-center px-4 gap-4 transition-all duration-300
                        border backdrop-blur-sm
                        ${ehConcluida 
                          ? 'bg-zinc-50/50 dark:bg-zinc-900/30 border-zinc-200/50 dark:border-zinc-800/50 opacity-50 shadow-none' 
                          : `${paleta.light} ${paleta.dark} shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:-translate-y-0.5`}
                      `}>
                        <Checkbox
                          checked={ehConcluida}
                          onCheckedChange={(checked) => handleToggleSkill(nodo, checked === true)}
                          onClick={(e) => e.stopPropagation()}
                          className={`
                            h-5 w-5 rounded-full border-2 transition-colors
                            ${ehConcluida 
                              ? 'border-zinc-400 bg-zinc-400 text-white dark:border-zinc-600 dark:bg-zinc-600 dark:text-zinc-900' 
                              : 'border-zinc-300/80 dark:border-zinc-600/80 bg-white dark:bg-zinc-900'}
                          `}
                        />
                        <span className={`
                          flex-1 font-medium text-sm tracking-tight leading-snug break-words line-clamp-2 transition-colors
                          ${ehConcluida 
                            ? 'text-zinc-400 dark:text-zinc-600 line-through' 
                            : `${paleta.textoLight} ${paleta.textoDark}`}
                        `}>
                          {nodo.label}
                        </span>
                        {!ehConcluida && (
                          <ChevronRight className={`h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ${paleta.textoLight} ${paleta.textoDark}`} />
                        )}
                      </div>
                    )}
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

      {/* Rodapé sutil */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[11px] font-medium tracking-wide text-zinc-400 dark:text-zinc-500 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-zinc-200/50 dark:border-zinc-700/50 shadow-sm pointer-events-none">
        Arraste para navegar • Clique para detalhes
      </div>
    </div>
  );
}