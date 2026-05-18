// src/lib/detectar-roadmap.ts
import { parsearRoadmap } from './parsear-roadmap';

/**
 * Detecta se uma mensagem do assistente contém um roadmap completo.
 * Versão robusta: tenta o parser e, se falhar, usa regex mais tolerante.
 */
export function contemRoadmap(texto: string): boolean {
  // 1. Tenta parsear – se conseguir extrair pelo menos uma fase, é roadmap
  try {
    const grafo = parsearRoadmap(texto);
    if (grafo.nodos.length > 1) return true;
  } catch {
    // 2. Fallback: regex que aceita formatação markdown (negrito, itálico) e parênteses opcionais
    const padroesFases = [
      /curto\s+prazo\s*\(?\s*\d+\s*[-–—]\s*\d+\s*meses?\s*\)?/i,
      /m[eé]dio\s+prazo\s*\(?\s*\d+\s*[-–—]\s*\d+\s*meses?\s*\)?/i,
      /longo\s+prazo\s*\(?\s*\d+\s*[-–—]\s*\d+\s*meses?\s*\)?/i,
    ];
    return padroesFases.some(padrao => padrao.test(texto));
  }
  return false;
}

export function extrairCargoAlvo(texto: string): string | null {
  try {
    const grafo = parsearRoadmap(texto);
    if (grafo.cargoAlvo && grafo.cargoAlvo !== 'Roadmap de Carreira') {
      return grafo.cargoAlvo.toLowerCase().replace(/\s+/g, '-');
    }
    return null;
  } catch (e) {
    console.error('[detectar-roadmap] Erro ao extrair cargo:', e);
    return null;
  }
}

export function extrairPeriodosRoadmap(texto: string): {
  curto: string | null;
  medio: string | null;
  longo: string | null;
} | null {
  const extrairPeriodo = (padrao: RegExp, texto: string): string | null => {
    const match = texto.match(padrao);
    if (match?.[1]) return match[1].trim();
    return null;
  };

  const padroes = {
    curto: /curto\s+prazo\s*\(\s*([^)]+)\s*\)/i,
    medio: /m[eé]dio\s+prazo\s*\(\s*([^)]+)\s*\)/i,
    longo: /longo\s+prazo\s*\(\s*([^)]+)\s*\)/i,
  };

  const resultado = {
    curto: extrairPeriodo(padroes.curto, texto),
    medio: extrairPeriodo(padroes.medio, texto),
    longo: extrairPeriodo(padroes.longo, texto),
  };

  if (resultado.curto || resultado.medio || resultado.longo) {
    return resultado;
  }
  return null;
}