/**
 * Detecta se uma mensagem do assistente contém um roadmap completo do Pathfinder.
 * Usa as strings canônicas definidas no system prompt v1.2.
 */
export function contemRoadmap(texto: string): boolean {
  const marcadores = [
    'Curto prazo (0–3 meses)',
    'Médio prazo (3–6 meses)',
    'Longo prazo (6–12 meses)',
  ];
  return marcadores.every((m) => texto.includes(m));
}

/**
 * Extrai o cargo-alvo do roadmap a partir da seção "🎯 Objetivo profissional".
 * Retorna null se não encontrar.
 */
export function extrairCargoAlvo(texto: string): string | null {
  const linhas = texto.split('\n');
  let proximaLinha = false;

  for (const linha of linhas) {
    if (proximaLinha) {
      const limpo = linha
        .replace(/^#{1,4}\s*/, '')
        .replace(/\*\*/g, '')
        .replace(/[^\w\sÀ-ÿ-]/g, '')
        .trim();
      if (limpo.length > 0) {
        return limpo.slice(0, 50).toLowerCase().replace(/\s+/g, '-');
      }
    }
    if (linha.includes('Objetivo profissional')) {
      proximaLinha = true;
    }
  }
  return null;
}