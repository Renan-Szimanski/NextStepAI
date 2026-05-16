// src/lib/parsear-roadmap.ts

/**
 * Transforma o texto Markdown do roadmap em estrutura de dados para o diagrama visual.
 * 
 * CORREÇÃO v1.5.4: 
 * - Removido tipo 'habilidade-curriculo' da union (usar 'skill' + campos concluido/categoria)
 * - Mantém compatibilidade com componentes frontend existentes
 */

export interface NodoRoadmap {
  id: string;
  label: string;
  tipo: 'fase' | 'skill' | 'raiz'; // ← Removido 'habilidade-curriculo'
  fase: 0 | 1 | 2 | 3;
  concluido?: boolean; // Para marcar habilidades já possuídas
  categoria?: 'curriculo' | 'lacuna'; // Para agrupamento/estilo opcional
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

const FASES: Array<{
  chave: string;
  padraoRegex: RegExp;
  labelExibicao: string;
  indice: 1 | 2 | 3;
}> = [
  {
    chave: 'Curto prazo',
    padraoRegex: /curto\s+prazo\s*\(\s*\d+\s*[-–—]\s*\d+\s*meses?\s*\)/i,
    labelExibicao: 'Curto prazo (0-3 meses)',
    indice: 1,
  },
  {
    chave: 'Médio prazo',
    padraoRegex: /m[eé]dio\s+prazo\s*\(\s*\d+\s*[-–—]\s*\d+\s*meses?\s*\)/i,
    labelExibicao: 'Médio prazo (3-6 meses)',
    indice: 2,
  },
  {
    chave: 'Longo prazo',
    padraoRegex: /longo\s+prazo\s*\(\s*\d+\s*[-–—]\s*\d+\s*meses?\s*\)/i,
    labelExibicao: 'Longo prazo (6-12 meses)',
    indice: 3,
  },
];

const PALAVRAS_EXCLUSAO_SECAO = [
  'linguagens', 'frameworks', 'ferramentas', 'metodologias', 'competências',
  'habilidades', 'tecnologias', 'idiomas', 'formação', 'experiências',
  'cursos', 'certificações', 'qualidade de ia', 'testes e qa',
];

function removerEmoji(texto: string): string {
  return texto
    .replace(/[\u{1F300}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .trim();
}

function slugify(texto: string, sufixo: string): string {
  return `${sufixo}-${texto
    .toLowerCase()
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

function ehSkillValida(texto: string): boolean {
  const textoLower = texto.toLowerCase().trim();
  if (textoLower.length < 3 || textoLower.length > 60) return false;
  if (PALAVRAS_EXCLUSAO_SECAO.some(p => textoLower.includes(p))) return false;
  if (/^(curto|m[eé]dio|longo)\s+prazo/i.test(textoLower)) return false;
  if (/^[\s\-\–\—\.\,\;\:]+$/.test(textoLower)) return false;
  return true;
}

function extrairCargoAlvoDoTexto(texto: string): string {
  const linhas = texto.split('\n');
  const regexSecao = /(?:objetivo\s+(?:profissional|de\s+carreira|alvo)|cargo[-\s]?alvo)/i;
  
  let encontrouSecao = false;
  
  for (const linha of linhas) {
    const linhaLimpa = linha.trim();
    
    if (!encontrouSecao) {
      if (regexSecao.test(linhaLimpa)) {
        encontrouSecao = true;
        continue;
      }
      continue;
    }
    
    if (linhaLimpa === '' || /^[#*\-_]{1,}$/.test(linhaLimpa)) {
      continue;
    }
    
    let tituloCandidato = linhaLimpa
      .replace(/^#{1,6}\s*/, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/^\s*[-*]\s*/, '')
      .trim();
      
    tituloCandidato = removerEmoji(tituloCandidato);
    
    if (tituloCandidato.length > 0 && tituloCandidato.length <= 60) {
      if (/^(análise|resumo|detalhes)/i.test(tituloCandidato)) {
        continue; 
      }
      return tituloCandidato;
    }
  }
  
  return 'Roadmap de Carreira';
}

function extrairHabilidadesCurriculo(texto: string): string[] {
  const linhas = texto.split('\n');
  const habilidades: string[] = [];
  let naSecaoPerfil = false;
  let naSecaoRoadmap = false;
  
  for (const linha of linhas) {
    if (/seu\s+perfil\s+atual|habilidades\s+atuais|competências\s+atuais/i.test(linha)) {
      naSecaoPerfil = true;
      continue;
    }
    
    if (/roadmap|curto\s+prazo|médio\s+prazo|longo\s+prazo/i.test(linha)) {
      naSecaoPerfil = false;
      naSecaoRoadmap = true;
    }
    
    if (naSecaoPerfil && !naSecaoRoadmap) {
      const match = linha.match(/^[\s]*[-*]\s+\*{0,2}([^*:\n]{3,60})/);
      if (match) {
        const skill = removerEmoji(match[1].trim());
        if (ehSkillValida(skill) && !habilidades.includes(skill)) {
          habilidades.push(skill);
        }
      }
    }
  }
  
  return habilidades;
}

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

  for (const linha of linhas) {
    const faseEncontrada = FASES.find((f) => f.padraoRegex.test(linha));
    
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

    if (faseAtual && faseNodeId) {
      const matchItem = linha.match(/^[\s]*[-*]\s+\*{0,2}([^*:\n]{3,80})/);
      
      if (matchItem) {
        const textoSkill = removerEmoji(matchItem[1].trim());
        
        if (!ehSkillValida(textoSkill)) continue;
        if (skillsAdicionadasFase.has(textoSkill.toLowerCase())) continue;
        
        // ← CORREÇÃO: tipo sempre 'skill', usa concluido/categoria para diferenciar
        const ehHabilidadeCurriculo = habilidadesCurriculo.some(
          h => h.toLowerCase() === textoSkill.toLowerCase()
        );
        
        const skillId = slugify(
          textoSkill,
          `skill-${faseAtual.indice}-${nodos.length}`
        );
        
        nodos.push({
          id: skillId,
          label: textoSkill.slice(0, 40),
          tipo: 'skill', // ← Sempre 'skill', nunca 'habilidade-curriculo'
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