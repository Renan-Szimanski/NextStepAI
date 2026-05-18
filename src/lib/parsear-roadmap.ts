// src/lib/parsear-roadmap.ts
/**
 * Transforma o texto Markdown do roadmap em estrutura de dados para o diagrama visual.
 * Versão robusta: tolera formatação markdown (negrito, itálico), listas sem marcador,
 * períodos com ou sem parênteses, extrai melhor o cargo-alvo e para de parsear
 * ao detectar seções de pós-roadmap ("Próximos passos", "O que mais posso fazer", etc.)
 */

export interface NodoRoadmap {
  id: string;
  label: string;
  tipo: 'fase' | 'skill' | 'raiz';
  fase: 0 | 1 | 2 | 3;
  concluido?: boolean;
  categoria?: 'curriculo' | 'lacuna';
}

export interface ArestaRoadmap {
  de: string;
  para: string;
}

export interface GrafoRoadmap {
  nodos: NodoRoadmap[];
  arestas: ArestaRoadmap[];
  cargoAlvo: string;
  habilidadesCurriculo: string[];
}

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

// Fases com regex tolerantes (aceitam **negrito** e parênteses opcionais)
const FASES: Array<{
  chave: string;
  padraoRegex: RegExp;
  labelExibicao: string;
  indice: 1 | 2 | 3;
}> = [
  {
    chave: 'Curto prazo',
    padraoRegex: /curto\s+prazo\s*\(?\s*\d+\s*[-–—]\s*\d+\s*meses?\s*\)?/i,
    labelExibicao: 'Curto prazo (0-3 meses)',
    indice: 1,
  },
  {
    chave: 'Médio prazo',
    padraoRegex: /m[eé]dio\s+prazo\s*\(?\s*\d+\s*[-–—]\s*\d+\s*meses?\s*\)?/i,
    labelExibicao: 'Médio prazo (3-6 meses)',
    indice: 2,
  },
  {
    chave: 'Longo prazo',
    padraoRegex: /longo\s+prazo\s*\(?\s*\d+\s*[-–—]\s*\d+\s*meses?\s*\)?/i,
    labelExibicao: 'Longo prazo (6-12 meses)',
    indice: 3,
  },
];

/**
 * Padrões que indicam o FIM do conteúdo do roadmap.
 * Ao encontrar qualquer um desses, o parser para imediatamente.
 */
const PADROES_FIM_ROADMAP: RegExp[] = [
  /próximos\s+passos\s+imediatos/i,
  /o\s+que\s+mais\s+posso\s+fazer/i,
  /dica\s+interativa/i,
  /a\s+partir\s+daqui[,\s]/i,
  /posso\s+fazer\s+por\s+voc[eê]/i,
  /regenerar\s+o\s+roadmap/i,
  /registrar\s+seu\s+progresso/i,
  /analisar\s+seu\s+github/i,
  /ajustar\s+os\s+prazos/i,
];

const PALAVRAS_EXCLUSAO_SKILL = [
  'linguagens', 'frameworks', 'ferramentas', 'metodologias', 'competências',
  'habilidades', 'tecnologias', 'idiomas', 'formação', 'experiências',
  'cursos', 'certificações', 'qualidade de ia', 'testes e qa',
  'próximos passos', 'o que mais', 'dica interativa',
];

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------

function removerEmoji(texto: string): string {
  return texto
    .replace(/[\u{1F300}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/[\u{1F000}-\u{1F02F}]/gu, '') // Mahjong tiles etc.
    .replace(/[\u{1F0A0}-\u{1F0FF}]/gu, '') // Playing cards
    .trim();
}

function removerMarkdown(texto: string): string {
  return texto
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1') // negrito/itálico
    .replace(/`([^`]+)`/g, '$1')              // código inline
    .replace(/_{1,2}([^_]+)_{1,2}/g, '$1')   // underscore bold/italic
    .trim();
}

function slugify(texto: string, prefixo: string): string {
  return `${prefixo}-${texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')          // remove acentos
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .slice(0, 30)}`;
}

function extrairPeriodoParaLabel(linha: string): string | null {
  const match = linha.match(/\(\s*(\d+\s*[-–—]\s*\d+\s*meses?)\s*\)/i);
  if (match?.[1]) {
    return match[1].replace(/[–—]/g, '-').trim();
  }
  return null;
}

function ehFimDeRoadmap(linha: string): boolean {
  const linhaSemMarkdown = removerMarkdown(removerEmoji(linha));
  return PADROES_FIM_ROADMAP.some(p => p.test(linhaSemMarkdown));
}

function ehSkillValida(texto: string): boolean {
  const textoLower = texto.toLowerCase().trim();
  if (textoLower.length < 2 || textoLower.length > 80) return false;
  if (PALAVRAS_EXCLUSAO_SKILL.some(p => textoLower.includes(p))) return false;
  if (/^(curto|m[eé]dio|longo)\s+prazo/i.test(textoLower)) return false;
  if (/^[\s\-\–\—\.\,\;\:\!]+$/.test(textoLower)) return false;
  // Rejeita linhas que são claramente sentenças longas (prosa, não skills)
  if (textoLower.split(' ').length > 10) return false;
  // Rejeita linhas que parecem callouts/avisos
  if (/^(clique|voc[eê]|posso|basta|a partir|detalhar|regenerar|registrar|analisar|ajustar|comparar)/i.test(textoLower)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Extração de cargo-alvo
// ---------------------------------------------------------------------------

function extrairCargoAlvoDoTexto(texto: string): string {
  const linhas = texto.split('\n');

  for (const linha of linhas) {
    const linhaLimpa = removerMarkdown(linha.trim());
    // Para ao chegar em marcadores de fim
    if (ehFimDeRoadmap(linha)) break;
    // Cabeçalhos markdown que não contenham "prazo" ou "roadmap"
    if (linha.trim().match(/^#{1,3}\s+(?!.*prazo)(?!.*roadmap)/i)) {
      const titulo = removerEmoji(linhaLimpa.replace(/^#{1,3}\s*/, ''));
      if (titulo.length > 0 && titulo.length <= 60 && !/^(análise|resumo|detalhes|seu perfil)/i.test(titulo)) {
        return titulo;
      }
    }
    // Linha com "objetivo" ou "cargo-alvo"
    if (/(objetivo|cargo[-\s]?alvo)/i.test(linhaLimpa)) {
      const match = linhaLimpa.match(/(?:objetivo|cargo[-\s]?alvo)\s*:?\s*(.+)/i);
      if (match?.[1]) {
        const titulo = removerEmoji(match[1]);
        if (titulo.length > 0 && titulo.length <= 60) return titulo;
      }
    }
  }

  // Fallback: primeira linha não vazia, curta, sem keywords de estrutura
  for (const linha of linhas) {
    const l = removerMarkdown(removerEmoji(linha.trim()));
    if (
      l &&
      l.length < 60 &&
      !l.startsWith('#') &&
      !/(prazo|roadmap|curto|médio|longo|perfil|habilidade)/i.test(l)
    ) {
      return l;
    }
  }

  return 'Roadmap de Carreira';
}

// ---------------------------------------------------------------------------
// Extração de habilidades do currículo
// ---------------------------------------------------------------------------

function extrairHabilidadesCurriculo(texto: string): string[] {
  const linhas = texto.split('\n');
  const habilidades: string[] = [];
  let naSecaoPerfil = false;

  for (const linha of linhas) {
    // Para ao encontrar fim de roadmap
    if (ehFimDeRoadmap(linha)) break;

    if (/seu\s+perfil\s+atual|habilidades\s+atuais|competências\s+atuais/i.test(linha)) {
      naSecaoPerfil = true;
      continue;
    }
    if (/roadmap|curto\s+prazo|m[eé]dio\s+prazo|longo\s+prazo/i.test(linha)) {
      naSecaoPerfil = false;
    }

    if (naSecaoPerfil) {
      const match = linha.match(/^[\s]*[-*]\s+\*{0,2}([^*:\n]{3,60})/);
      if (match) {
        const skill = removerEmoji(removerMarkdown(match[1].trim()));
        if (ehSkillValida(skill) && !habilidades.includes(skill)) {
          habilidades.push(skill);
        }
      }
    }
  }
  return habilidades;
}

// ---------------------------------------------------------------------------
// Parser principal
// ---------------------------------------------------------------------------

export function parsearRoadmap(texto: string): GrafoRoadmap {
  const nodos: NodoRoadmap[] = [];
  const arestas: ArestaRoadmap[] = [];

  const cargoAlvo = extrairCargoAlvoDoTexto(texto);
  const habilidadesCurriculo = extrairHabilidadesCurriculo(texto);

  const raizId = 'raiz';
  nodos.push({
    id: raizId,
    label: cargoAlvo.length > 35 ? cargoAlvo.slice(0, 32) + '...' : cargoAlvo,
    tipo: 'raiz',
    fase: 0,
    concluido: false,
  });

  let faseAtual: (typeof FASES)[0] | null = null;
  let faseNodeId: string | null = null;
  let periodoDetectado: string | null = null;
  let skillsAdicionadasFase = new Set<string>();

  const linhas = texto.split('\n');

  for (let i = 0; i < linhas.length; i++) {
    const linhaOriginal = linhas[i];
    const linha = linhaOriginal.trim();

    // ── CONDIÇÃO DE PARADA ──────────────────────────────────────────────────
    // Para imediatamente ao detectar seção de pós-roadmap
    if (ehFimDeRoadmap(linha)) {
      console.info(`[parsearRoadmap] Fim do roadmap detectado na linha ${i}: "${linha.slice(0, 60)}"`);
      break;
    }

    // ── DETECÇÃO DE FASE ────────────────────────────────────────────────────
    const linhaSemMarkdown = removerMarkdown(linha);
    const faseEncontrada = FASES.find((f) => f.padraoRegex.test(linhaSemMarkdown));

    if (faseEncontrada) {
      faseAtual = faseEncontrada;
      periodoDetectado = extrairPeriodoParaLabel(linha);

      const labelFase = periodoDetectado
        ? `${faseEncontrada.chave} (${periodoDetectado})`
        : faseEncontrada.labelExibicao;

      faseNodeId = slugify(labelFase, `fase-${faseEncontrada.indice}`);
      skillsAdicionadasFase = new Set<string>();

      nodos.push({
        id: faseNodeId,
        label: labelFase,
        tipo: 'fase',
        fase: faseEncontrada.indice,
        concluido: false,
      });

      arestas.push({ de: raizId, para: faseNodeId });
      continue;
    }

    // ── DETECÇÃO DE SKILL ───────────────────────────────────────────────────
    if (faseAtual && faseNodeId) {
      let textoSkill = '';

      // 1) Item de lista com marcador (-, *, •)
      const matchItem = linha.match(/^[-*•]\s+\*{0,2}([^*:\n]{2,80})/);
      if (matchItem) {
        textoSkill = removerEmoji(removerMarkdown(matchItem[1].trim()));
      }
      // 2) Linha simples sem marcador mas dentro de uma fase
      else if (
        linha.length > 2 &&
        linha.length < 70 &&
        !linha.startsWith('#') &&
        !linha.startsWith('[') &&
        !linha.startsWith('>') &&
        !/^\d+\./.test(linha) // não é lista numerada de prosa
      ) {
        textoSkill = removerEmoji(removerMarkdown(linha));
      }

      if (
        textoSkill &&
        ehSkillValida(textoSkill) &&
        !skillsAdicionadasFase.has(textoSkill.toLowerCase())
      ) {
        const ehHabilidadeCurriculo = habilidadesCurriculo.some(
          (h) => h.toLowerCase() === textoSkill.toLowerCase()
        );

        const skillId = slugify(
          textoSkill,
          `skill-${faseAtual.indice}-${nodos.length}`
        );

        nodos.push({
          id: skillId,
          label: textoSkill.slice(0, 40),
          tipo: 'skill',
          fase: faseAtual.indice,
          concluido: ehHabilidadeCurriculo,
          categoria: ehHabilidadeCurriculo ? 'curriculo' : 'lacuna',
        });

        arestas.push({ de: faseNodeId, para: skillId });
        skillsAdicionadasFase.add(textoSkill.toLowerCase());
      }
    }
  }

  if (nodos.length === 1) {
    console.warn('[parsearRoadmap] Nenhuma fase detectada. Retornando grafo mínimo.');
  }

  return { nodos, arestas, cargoAlvo, habilidadesCurriculo };
}