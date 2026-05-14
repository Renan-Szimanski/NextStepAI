/**
 * Transforma o texto Markdown do roadmap em estrutura de dados para o diagrama visual.
 */

export interface NodoRoadmap {
  id: string;
  label: string;
  tipo: 'fase' | 'skill' | 'raiz';
  fase: 0 | 1 | 2 | 3;
}

export interface ArestaRoadmap {
  de: string;
  para: string;
}

export interface GrafoRoadmap {
  nodos: NodoRoadmap[];
  arestas: ArestaRoadmap[];
  cargoAlvo: string;
}

const FASES: Array<{ chave: string; label: string; indice: 1 | 2 | 3 }> = [
  { chave: 'Curto prazo (0–3 meses)',  label: 'Curto prazo (0-3 meses)',  indice: 1 },
  { chave: 'Médio prazo (3–6 meses)',  label: 'Médio prazo (3-6 meses)',  indice: 2 },
  { chave: 'Longo prazo (6–12 meses)', label: 'Longo prazo (6-12 meses)', indice: 3 },
];

function removerEmoji(texto: string): string {
  return texto
    .replace(/[\u{1F300}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .trim();
}

function slugify(texto: string, sufixo: string): string {
  return `${sufixo}-${texto.toLowerCase().replace(/\s+/g, '-').slice(0, 30)}`;
}

export function parsearRoadmap(texto: string): GrafoRoadmap {
  const linhas = texto.split('\n');
  const nodos: NodoRoadmap[] = [];
  const arestas: ArestaRoadmap[] = [];

  // Extrair cargo-alvo
  let cargoAlvo = 'Roadmap de Carreira';
  let capturandoCargo = false;
  for (const linha of linhas) {
    if (capturandoCargo) {
      const limpo = removerEmoji(
        linha.replace(/^#{1,4}\s*/, '').replace(/\*\*/g, '').trim()
      );
      if (limpo.length > 0) {
        cargoAlvo = limpo;
        break;
      }
    }
    if (linha.includes('Objetivo profissional')) capturandoCargo = true;
  }

  // Nodo raiz
  const raizId = 'raiz';
  nodos.push({ id: raizId, label: cargoAlvo, tipo: 'raiz', fase: 0 });

  // Parsear cada fase
  let faseAtual: (typeof FASES)[0] | null = null;
  let faseNodeId: string | null = null;

  for (const linha of linhas) {
    // Detectar início de fase pela chave canônica (com en dash –)
    const faseEncontrada = FASES.find((f) => linha.includes(f.chave));
    if (faseEncontrada) {
      faseAtual = faseEncontrada;
      // Usar label com hífen normal (-) para exibição no PDF
      faseNodeId = slugify(faseEncontrada.label, `fase-${faseEncontrada.indice}`);
      nodos.push({
        id: faseNodeId,
        label: faseEncontrada.label, // <- label limpo, sem en dash
        tipo: 'fase',
        fase: faseEncontrada.indice,
      });
      arestas.push({ de: raizId, para: faseNodeId });
      continue;
    }

    // Detectar skills
    if (faseAtual && faseNodeId) {
      const matchItem = linha.match(/^[\s]*[-*]\s+\*{0,2}([^*:\n]{3,60})/);
      if (matchItem) {
        const textoSkill = removerEmoji(matchItem[1].trim());
        if (textoSkill.length < 3) continue;

        const skillId = slugify(
          textoSkill,
          `skill-${faseAtual.indice}-${nodos.length}`
        );
        nodos.push({
          id: skillId,
          label: textoSkill.slice(0, 40),
          tipo: 'skill',
          fase: faseAtual.indice,
        });
        arestas.push({ de: faseNodeId, para: skillId });
      }
    }
  }

  return { nodos, arestas, cargoAlvo };
}