'use client';

import { parsearRoadmap, GrafoRoadmap, NodoRoadmap } from './parsear-roadmap';

const CORES: Record<number, { fundo: string; borda: string; texto: string }> = {
  0: { fundo: '#6c63ff', borda: '#4f46e5', texto: '#ffffff' },
  1: { fundo: '#fef3c7', borda: '#f59e0b', texto: '#92400e' },
  2: { fundo: '#d1fae5', borda: '#10b981', texto: '#065f46' },
  3: { fundo: '#dbeafe', borda: '#3b82f6', texto: '#1e3a8a' },
};

interface Posicao {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

function calcularLayout(
  grafo: GrafoRoadmap,
  larguraCanvas: number,
  alturaUtil: number // altura disponível para o diagrama (sem título e legenda)
): Map<string, Posicao> {
  const posicoes = new Map<string, Posicao>();

  const LARGURA_RAIZ = 160;
  const ALTURA_RAIZ = 80;
  const LARGURA_FASE = 170;
  const ALTURA_FASE = 48;
  const LARGURA_SKILL = 160;
  const ALTURA_SKILL = 48;
  const GAP_H = 70;  // espaço horizontal entre colunas
  const GAP_V = 18;  // espaço vertical entre nodos da mesma coluna

  // Separar nodos por fase
  const colunas: NodoRoadmap[][] = [[], [], [], []];
  for (const nodo of grafo.nodos) {
    colunas[nodo.fase].push(nodo);
  }

  // Calcular largura total: raiz + 3 fases
  const larguraTotal =
    LARGURA_RAIZ +
    GAP_H +
    3 * LARGURA_FASE +
    2 * GAP_H;

  const offsetX = (larguraCanvas - larguraTotal) / 2;

  // Centro vertical do diagrama
  const centroY = alturaUtil / 2;

  // Coluna 0: nodo raiz — centralizado verticalmente
  for (const nodo of colunas[0]) {
    posicoes.set(nodo.id, {
      x: offsetX,
      y: centroY - ALTURA_RAIZ / 2,
      largura: LARGURA_RAIZ,
      altura: ALTURA_RAIZ,
    });
  }

  // Colunas 1, 2, 3: fases e skills
  for (let col = 1; col <= 3; col++) {
    const nodosColuna = colunas[col];
    if (nodosColuna.length === 0) continue;

    const ehFase = nodosColuna[0].tipo === 'fase';
    const larguraNodo = ehFase ? LARGURA_FASE : LARGURA_SKILL;
    const alturaNodo = ehFase ? ALTURA_FASE : ALTURA_SKILL;

    // Separar nodo de fase dos skills
    const [nodoFase, ...skills] = nodosColuna;

    // X desta coluna
    const xColuna =
      offsetX + LARGURA_RAIZ + GAP_H + (col - 1) * (LARGURA_FASE + GAP_H);

    // Calcular altura total dos skills para centralizar
    const alturaSkills =
      skills.length * ALTURA_SKILL + (skills.length - 1) * GAP_V;

    // O nodo de fase fica no topo, skills logo abaixo
    const yFase = centroY - (ALTURA_FASE + 16 + alturaSkills) / 2;

    // Posicionar nodo de fase
    posicoes.set(nodoFase.id, {
      x: xColuna,
      y: yFase,
      largura: LARGURA_FASE,
      altura: ALTURA_FASE,
    });

    // Posicionar skills abaixo da fase
    let yAtual = yFase + ALTURA_FASE + 16;
    for (const skill of skills) {
      posicoes.set(skill.id, {
        x: xColuna,
        y: yAtual,
        largura: LARGURA_SKILL,
        altura: ALTURA_SKILL,
      });
      yAtual += ALTURA_SKILL + GAP_V;
    }
  }

  return posicoes;
}

function desenharNodo(
  ctx: CanvasRenderingContext2D,
  nodo: NodoRoadmap,
  pos: Posicao
) {
  const cor = CORES[nodo.fase];
  const raio = nodo.tipo === 'raiz' ? 12 : nodo.tipo === 'fase' ? 10 : 8;

  // Sombra
  ctx.shadowColor = 'rgba(0,0,0,0.10)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;

  // Fundo
  ctx.fillStyle = cor.fundo;
  ctx.strokeStyle = cor.borda;
  ctx.lineWidth = nodo.tipo === 'raiz' ? 3 : nodo.tipo === 'fase' ? 2.5 : 1.5;

  ctx.beginPath();
  ctx.roundRect(pos.x, pos.y, pos.largura, pos.altura, raio);
  ctx.fill();
  ctx.stroke();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Texto
  ctx.fillStyle = cor.texto;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font =
    nodo.tipo === 'raiz'
      ? 'bold 12px Helvetica'
      : nodo.tipo === 'fase'
      ? 'bold 11px Helvetica'
      : '10px Helvetica';

  // Quebrar texto longo em linhas
  const maxLargura = pos.largura - 16;
  const palavras = nodo.label.split(' ');
  let linhaAtual = '';
  const linhas: string[] = [];

  for (const palavra of palavras) {
    const teste = linhaAtual ? `${linhaAtual} ${palavra}` : palavra;
    if (ctx.measureText(teste).width > maxLargura && linhaAtual) {
      linhas.push(linhaAtual);
      linhaAtual = palavra;
    } else {
      linhaAtual = teste;
    }
  }
  if (linhaAtual) linhas.push(linhaAtual);

  const alturaLinha = 14;
  const totalAltura = linhas.length * alturaLinha;
  const inicioY = pos.y + pos.altura / 2 - totalAltura / 2 + alturaLinha / 2;

  linhas.forEach((linha, i) => {
    ctx.fillText(linha, pos.x + pos.largura / 2, inicioY + i * alturaLinha);
  });
}

function desenharAresta(
  ctx: CanvasRenderingContext2D,
  de: Posicao,
  para: Posicao,
  fasePara: number
) {
  const corAresta =
    fasePara === 1
      ? '#f59e0b'
      : fasePara === 2
      ? '#10b981'
      : fasePara === 3
      ? '#3b82f6'
      : '#6c63ff';

  ctx.strokeStyle = corAresta;
  ctx.lineWidth = 1.5;
  ctx.setLineDash(fasePara === 1 ? [] : [5, 4]);
  ctx.globalAlpha = 0.7;

  const xDe = de.x + de.largura;
  const yDe = de.y + de.altura / 2;
  const xPara = para.x;
  const yPara = para.y + para.altura / 2;
  const controle = (xPara - xDe) / 2;

  ctx.beginPath();
  ctx.moveTo(xDe, yDe);
  ctx.bezierCurveTo(
    xDe + controle, yDe,
    xPara - controle, yPara,
    xPara, yPara
  );
  ctx.stroke();

  // Seta na ponta
  ctx.setLineDash([]);
  ctx.globalAlpha = 0.9;
  const anguloSeta = Math.atan2(yPara - yDe, xPara - xDe);
  const tamSeta = 7;
  ctx.fillStyle = corAresta;
  ctx.beginPath();
  ctx.moveTo(xPara, yPara);
  ctx.lineTo(
    xPara - tamSeta * Math.cos(anguloSeta - Math.PI / 6),
    yPara - tamSeta * Math.sin(anguloSeta - Math.PI / 6)
  );
  ctx.lineTo(
    xPara - tamSeta * Math.cos(anguloSeta + Math.PI / 6),
    yPara - tamSeta * Math.sin(anguloSeta + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

export async function gerarPdfRoadmap(
  textoRoadmap: string,
  cargoAlvo: string | null
): Promise<Blob> {
  const { default: jsPDF } = await import('jspdf');

  const grafo = parsearRoadmap(textoRoadmap);

  const LARGURA = 1400;
  const TITULO_H = 80;   // altura reservada para título no topo
  const LEGENDA_H = 60;  // altura reservada para legenda no rodapé

  // Calcular altura necessária baseada no maior número de skills por fase
  const skillsPorFase = [0, 0, 0, 0];
  for (const nodo of grafo.nodos) {
    if (nodo.tipo === 'skill') skillsPorFase[nodo.fase]++;
  }
  const maxSkills = Math.max(...skillsPorFase, 3);
  // fase + gap + skills * (altura + gap)
  const alturaUtil = Math.max(500, 48 + 16 + maxSkills * (48 + 18) + 40);
  const ALTURA = TITULO_H + alturaUtil + LEGENDA_H;

  const canvas = document.createElement('canvas');
  canvas.width = LARGURA;
  canvas.height = ALTURA;
  const ctx = canvas.getContext('2d')!;

  // Fundo branco
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, LARGURA, ALTURA);

  // Grade sutil
  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = 1;
  for (let x = 0; x < LARGURA; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ALTURA); ctx.stroke();
  }
  for (let y = 0; y < ALTURA; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(LARGURA, y); ctx.stroke();
  }

  // Título
  ctx.fillStyle = '#1a1a2e';
  ctx.font = 'bold 24px Helvetica';
  ctx.textAlign = 'center';
  ctx.fillText(`Roadmap: ${grafo.cargoAlvo}`, LARGURA / 2, 34);

  ctx.fillStyle = '#6c63ff';
  ctx.font = '13px Helvetica';
  ctx.fillText(
    `Gerado em ${new Date().toLocaleDateString('pt-BR')} · NextStepAI Pathfinder`,
    LARGURA / 2,
    56
  );

  // Linha separadora
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(40, 68);
  ctx.lineTo(LARGURA - 40, 68);
  ctx.stroke();

  // Calcular layout dentro da área útil (abaixo do título)
  // Criar um sub-canvas virtual deslocado pelo TITULO_H
  const posicoes = calcularLayout(grafo, LARGURA, alturaUtil);

  // Deslocar todas as posições para baixo do título
  const posicoesDeslocadas = new Map<string, Posicao>();
  for (const [id, pos] of posicoes.entries()) {
    posicoesDeslocadas.set(id, { ...pos, y: pos.y + TITULO_H });
  }

  // Arestas (atrás dos nodos)
  ctx.setLineDash([]);
  for (const aresta of grafo.arestas) {
    const de = posicoesDeslocadas.get(aresta.de);
    const para = posicoesDeslocadas.get(aresta.para);
    if (!de || !para) continue;
    const nodosPara = grafo.nodos.find((n) => n.id === aresta.para);
    if (!nodosPara) continue;
    desenharAresta(ctx, de, para, nodosPara.fase);
  }

  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // Nodos
  for (const nodo of grafo.nodos) {
    const pos = posicoesDeslocadas.get(nodo.id);
    if (!pos) continue;
    desenharNodo(ctx, nodo, pos);
  }

  // Legenda
  const legendaY = ALTURA - 40;
  const items = [
    { cor: CORES[1], label: 'Curto prazo (0-3m)' },
    { cor: CORES[2], label: 'Médio prazo (3-6m)' },
    { cor: CORES[3], label: 'Longo prazo (6-12m)' },
  ];
  let legX = 60;
  ctx.font = '11px Helvetica';
  for (const item of items) {
    ctx.fillStyle = item.cor.fundo;
    ctx.strokeStyle = item.cor.borda;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(legX, legendaY - 7, 14, 14, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#374151';
    ctx.textAlign = 'left';
    ctx.fillText(item.label, legX + 18, legendaY + 2);
    legX += 180;
  }

  // Gerar PDF A4 landscape
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pdfLargura = 297;
  const pdfAltura = 210;
  const margem = 8;

  const imgData = canvas.toDataURL('image/png', 1.0);
  const escalaX = (pdfLargura - 2 * margem) / (LARGURA / 3.779527559);
  const escalaY = (pdfAltura - 2 * margem) / (ALTURA / 3.779527559);
  const escala = Math.min(escalaX, escalaY);

  const imgLarguraMm = (LARGURA / 3.779527559) * escala;
  const imgAlturaMm = (ALTURA / 3.779527559) * escala;
  const offsetXPdf = (pdfLargura - imgLarguraMm) / 2;
  const offsetYPdf = (pdfAltura - imgAlturaMm) / 2;

  pdf.addImage(imgData, 'PNG', offsetXPdf, offsetYPdf, imgLarguraMm, imgAlturaMm);

  return pdf.output('blob');
}