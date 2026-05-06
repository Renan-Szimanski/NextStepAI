// scripts/popular-banco.ts

/**
 * Script de seed do banco vetorial (Supabase + pgvector).
 *
 * Popula a tabela `vagas` a partir de DUAS fontes:
 *   1. vagas_tuning.jsonl       → vagas REAIS raspadas (HTML, formato JSONL)
 *   2. vagas_sinteticas_*.json  → vagas SINTÉTICAS geradas via LLM (JSON agregado)
 *
 * Cada registro recebe a coluna `origem` ('real' | 'sintetica'), permitindo
 * filtros no RAG e análises comparativas.
 *
 * Pipelines de limpeza:
 *   - Reais: htmlToText (remove HTML, normaliza quebras)
 *   - Sintéticas: limparMarkdown (remove **negrito**, ##headings, etc.)
 * Ambas convergem para texto plano consistente antes da geração de embeddings.
 *
 * Uso:
 *   npm run seed                       # com confirmação manual antes de limpar
 *   npm run seed:clean                 # sem prompt (CI/automação)
 *   npm run seed:test                  # processa só 5 vagas por origem
 *
 * Pré-requisitos:
 *   - Migrations aplicadas (001, 002, 003)
 *   - .env.local com SUPABASE_SERVICE_ROLE_KEY e OPENAI_API_KEY
 */

import * as dotenv from 'dotenv';
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { convert as htmlToText } from 'html-to-text';

import { supabaseAdmin } from '@/lib/supabase/server';
import { gerarEmbeddingsLote } from '@/lib/langchain/embeddings';

// Carrega .env.local (precedência) e .env (fallback).
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------

const PREFIXO_LOG = '[PopularBanco]';

const DIRETORIO_VAGAS_SINTETICAS = join(process.cwd(), 'dados', 'vagas', 'sinteticas');
const DIRETORIO_VAGAS_REAIS = join(process.cwd(), 'dados', 'vagas', 'reais');

/** Arquivo de vagas REAIS (raspadas). */
const ARQUIVO_REAIS = join(DIRETORIO_VAGAS_REAIS, 'vagas_tuning.jsonl');

/**
 * Possíveis nomes do arquivo de vagas SINTÉTICAS (com e sem til,
 * para portabilidade entre sistemas operacionais).
 */
const ARQUIVOS_SINTETICAS = [
  join(DIRETORIO_VAGAS_SINTETICAS, 'vagas_sinteticas_nãotuned.json'),
  join(DIRETORIO_VAGAS_SINTETICAS, 'vagas_sinteticas_naotuned.json'),
  join(DIRETORIO_VAGAS_SINTETICAS, 'vagas_sinteticas_nao_tuned.json'),
];

const TABELA_VAGAS = 'vagas';
const TAMANHO_LOTE = 10;

/** UUID dummy usado no filtro do DELETE (Supabase exige um filtro). */
const UUID_DUMMY = '00000000-0000-0000-0000-000000000000';

/**
 * Limite de vagas a processar POR ORIGEM.
 * Aceita --limit=N na CLI (preferencial) OU SEED_LIMIT no ambiente.
 */
const argLimit = process.argv.find((a) => a.startsWith('--limit='));
const SEED_LIMIT = argLimit
  ? parseInt(argLimit.split('=')[1], 10)
  : process.env.SEED_LIMIT
    ? parseInt(process.env.SEED_LIMIT, 10)
    : Infinity;

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

/** Tipos possíveis de origem da vaga. */
type Origem = 'real' | 'sintetica';

/** Estrutura crua de cada linha do .jsonl (vagas reais raspadas). */
interface VagaCruaJsonl {
  title: string;
  content: string; // HTML
}

/** Estrutura crua do JSON agregado de vagas sintéticas (PROMPT 3.8). */
interface ArquivoSinteticasAgregado {
  metadados?: Record<string, unknown>;
  vagas: Array<{
    titulo: string;
    area: string;
    descricao: string;
  }>;
}

/** Estrutura normalizada para inserção no banco. */
interface VagaNormalizada {
  titulo: string;
  area: string;
  descricao: string;
  origem: Origem;
}

// ---------------------------------------------------------------------------
// Mapeamento de palavras-chave → área (para vagas REAIS, que só têm título).
// ---------------------------------------------------------------------------

const MAPA_AREAS: Array<{ palavras: string[]; area: string }> = [
  // ===== TECNOLOGIA =====
  {
    palavras: [
      'analista de dados',
      'cientista de dados',
      'engenheiro de dados',
      'data analyst',
      'data scientist',
      'data engineer',
      'analytics',
      'bi ',
      'power bi',
      'tableau',
      'looker',
      'data engineering',
      'mlops',
      'machine learning',
      'cientista de machine learning',
    ],
    area: 'Dados e Analytics',
  },
  {
    palavras: [
      'desenvolvedor',
      'desenvolvedora',
      'programador',
      'programadora',
      'engenheiro de software',
      'software engineer',
      'full stack',
      'fullstack',
      'frontend',
      'front-end',
      'backend',
      'back-end',
    ],
    area: 'Desenvolvimento de Software',
  },
  {
    palavras: [
      'devops',
      'sre',
      'site reliability',
      'cloud engineer',
      'platform engineer',
      'infraestrutura',
      'sysadmin',
      'administrador de sistemas',
      'kubernetes',
      'aws engineer',
    ],
    area: 'DevOps e Infraestrutura',
  },
  {
    palavras: [
      'qa ',
      'qa engineer',
      'analista de qualidade',
      'tester',
      'testador',
      'sdet',
      'automação de testes',
      'quality assurance',
    ],
    area: 'QA e Testes',
  },
  {
    palavras: [
      'segurança da informação',
      'cybersecurity',
      'pentester',
      'security engineer',
      'analista de segurança',
      'soc analyst',
      'red team',
      'blue team',
    ],
    area: 'Cibersegurança',
  },
  {
    palavras: [
      'desenvolvedor mobile',
      'desenvolvedor android',
      'desenvolvedor ios',
      'react native',
      'flutter',
      'kotlin',
      'swift',
    ],
    area: 'Desenvolvimento Mobile',
  },
  {
    palavras: [
      'engenheiro de ia',
      'engenheiro de ml',
      'ai engineer',
      'ml engineer',
      'llm',
      'ia generativa',
      'inteligência artificial',
      'pesquisador de ia',
    ],
    area: 'Inteligência Artificial',
  },
  {
    palavras: [
      'analista de ti',
      'suporte técnico',
      'help desk',
      'helpdesk',
      'service desk',
      'analista de sistemas',
      'técnico de informática',
    ],
    area: 'Suporte e TI',
  },

  // ===== PRODUTO E DESIGN =====
  {
    palavras: [
      'product manager',
      'product owner',
      'gerente de produto',
      'gpm',
      'group product manager',
      'technical product manager',
      'cpo',
    ],
    area: 'Produto',
  },
  {
    palavras: [
      'ux designer',
      'ui designer',
      'product designer',
      'ux researcher',
      'pesquisador ux',
      'ux writer',
      'design ops',
    ],
    area: 'UX/UI Design',
  },
  {
    palavras: [
      'designer gráfico',
      'designer visual',
      'motion designer',
      'ilustrador',
      'ilustradora',
      'designer 3d',
      'animador',
    ],
    area: 'Design Gráfico e Multimídia',
  },

  // ===== MARKETING E COMUNICAÇÃO =====
  {
    palavras: [
      'marketing digital',
      'gerente de marketing',
      'analista de marketing',
      'coordenador de marketing',
    ],
    area: 'Marketing Digital',
  },
  {
    palavras: [
      'growth',
      'growth hacker',
      'analista de crescimento',
      'crm analyst',
      'performance marketing',
      'tráfego pago',
      'mídia paga',
      'gestor de tráfego',
    ],
    area: 'Growth e Performance',
  },
  {
    palavras: [
      'social media',
      'mídias sociais',
      'community manager',
      'creator',
      'criador de conteúdo',
      'analista de conteúdo',
    ],
    area: 'Mídias Sociais e Conteúdo',
  },
  {
    palavras: [
      'copywriter',
      'redator',
      'redatora',
      'jornalista',
      'editor de texto',
      'revisor',
    ],
    area: 'Redação e Copywriting',
  },
  {
    palavras: [
      'seo ',
      'analista de seo',
      'especialista em seo',
      'sea ',
      'analista sem',
    ],
    area: 'SEO e SEM',
  },
  {
    palavras: [
      'relações públicas',
      'assessor de imprensa',
      'comunicação interna',
      'comunicação corporativa',
      'pr ',
    ],
    area: 'Comunicação e PR',
  },

  // ===== VENDAS E COMERCIAL =====
  {
    palavras: [
      'vendedor',
      'vendedora',
      'consultor de vendas',
      'consultora de vendas',
      'representante comercial',
      'executivo de vendas',
      'gerente de vendas',
    ],
    area: 'Vendas',
  },
  {
    palavras: [
      'sdr',
      'pré-vendas',
      'pre-vendas',
      'closer',
      'account executive',
      'inside sales',
      'business development',
      'bdr',
    ],
    area: 'Vendas B2B (SDR/AE)',
  },
  {
    palavras: [
      'key account',
      'gerente de contas',
      'account manager',
      'gestor de contas',
    ],
    area: 'Gestão de Contas',
  },

  // ===== ATENDIMENTO E CS =====
  {
    palavras: [
      'customer success',
      'customer service',
      'cs analyst',
      'csm',
      'gerente de sucesso do cliente',
    ],
    area: 'Customer Success',
  },
  {
    palavras: [
      'atendente',
      'recepcionista',
      'sac',
      'suporte ao cliente',
      'operador de telemarketing',
      'agente de atendimento',
    ],
    area: 'Atendimento ao Cliente',
  },

  // ===== RECURSOS HUMANOS =====
  {
    palavras: [
      'rh ',
      'recursos humanos',
      'business partner',
      'hrbp',
      'analista de rh',
      'people',
      'pessoas',
      'analista de pessoas',
    ],
    area: 'Recursos Humanos',
  },
  {
    palavras: [
      'recrutador',
      'recrutadora',
      'talent acquisition',
      'recruiter',
      'tech recruiter',
      'analista de recrutamento',
    ],
    area: 'Recrutamento e Seleção',
  },
  {
    palavras: [
      'departamento pessoal',
      'analista de dp',
      'folha de pagamento',
      'analista de benefícios',
    ],
    area: 'Departamento Pessoal',
  },
  {
    palavras: [
      'treinamento',
      'desenvolvimento humano',
      't&d',
      'learning and development',
      'analista de t&d',
    ],
    area: 'Treinamento e Desenvolvimento',
  },

  // ===== FINANCEIRO E CONTÁBIL =====
  {
    palavras: [
      'analista financeiro',
      'analista de finanças',
      'gerente financeiro',
      'controller',
      'fp&a',
      'planejamento financeiro',
    ],
    area: 'Financeiro Corporativo',
  },
  {
    palavras: [
      'contador',
      'contadora',
      'contábil',
      'analista contábil',
      'auxiliar contábil',
      'assistente contábil',
    ],
    area: 'Contabilidade',
  },
  {
    palavras: [
      'analista fiscal',
      'tributário',
      'tributária',
      'auditor fiscal',
    ],
    area: 'Fiscal e Tributário',
  },
  {
    palavras: [
      'auditor',
      'auditora',
      'compliance',
      'analista de compliance',
      'risco',
      'gestão de riscos',
    ],
    area: 'Auditoria e Compliance',
  },
  {
    palavras: [
      'analista de investimentos',
      'gestor de investimentos',
      'tesouraria',
      'analista de tesouraria',
      'private banking',
    ],
    area: 'Investimentos e Tesouraria',
  },

  // ===== JURÍDICO =====
  {
    palavras: [
      'advogado',
      'advogada',
      'paralegal',
      'jurídico',
      'jurídica',
      'analista jurídico',
      'estagiário de direito',
    ],
    area: 'Jurídico',
  },

  // ===== SAÚDE =====
  {
    palavras: [
      'enfermeiro',
      'enfermeira',
      'técnico de enfermagem',
      'auxiliar de enfermagem',
    ],
    area: 'Enfermagem',
  },
  {
    palavras: [
      'médico',
      'médica',
      'cardiologista',
      'pediatra',
      'clínico geral',
    ],
    area: 'Medicina',
  },
  {
    palavras: [
      'fisioterapeuta',
      'farmacêutico',
      'farmacêutica',
      'nutricionista',
      'psicólogo',
      'psicóloga',
      'fonoaudiólogo',
      'terapeuta ocupacional',
    ],
    area: 'Saúde Multiprofissional',
  },

  // ===== EDUCAÇÃO =====
  {
    palavras: [
      'professor',
      'professora',
      'docente',
      'tutor',
      'tutora',
      'instrutor',
      'instrutora',
    ],
    area: 'Docência',
  },
  {
    palavras: [
      'coordenador acadêmico',
      'coordenadora acadêmica',
      'orientador educacional',
      'pedagogo',
      'pedagoga',
    ],
    area: 'Coordenação Educacional',
  },

  // ===== OPERAÇÕES E LOGÍSTICA =====
  {
    palavras: [
      'analista de logística',
      'auxiliar de logística',
      'coordenador de logística',
      'supply chain',
      'gerente de logística',
    ],
    area: 'Logística e Supply Chain',
  },
  {
    palavras: [
      'almoxarife',
      'estoquista',
      'auxiliar de estoque',
      'conferente',
      'separador de mercadorias',
    ],
    area: 'Estoque e Almoxarifado',
  },
  {
    palavras: [
      'motorista',
      'entregador',
      'motoboy',
      'motorista de caminhão',
      'condutor',
    ],
    area: 'Transporte e Entregas',
  },
  {
    palavras: [
      'auxiliar de produção',
      'operador de produção',
      'operador de máquina',
      'supervisor de produção',
      'líder de produção',
    ],
    area: 'Produção Industrial',
  },
  {
    palavras: [
      'engenheiro civil',
      'engenheira civil',
      'engenheiro mecânico',
      'engenheira mecânica',
      'engenheiro elétrico',
      'engenheira elétrica',
      'engenheiro de produção',
    ],
    area: 'Engenharia (Tradicional)',
  },

  // ===== ADMINISTRATIVO =====
  {
    palavras: [
      'auxiliar administrativo',
      'assistente administrativo',
      'analista administrativo',
      'secretária',
      'secretário',
      'administrador',
      'office manager',
    ],
    area: 'Administrativo',
  },
  {
    palavras: [
      'comprador',
      'compradora',
      'analista de compras',
      'gerente de compras',
      'procurement',
    ],
    area: 'Compras',
  },

  // ===== COMÉRCIO E VAREJO =====
  {
    palavras: [
      'caixa',
      'operador de caixa',
      'atendente de loja',
      'vendedor de loja',
      'repositor',
      'fiscal de loja',
      'gerente de loja',
    ],
    area: 'Varejo',
  },

  // ===== HOSPITALIDADE E SERVIÇOS =====
  {
    palavras: [
      'garçom',
      'garçonete',
      'cozinheiro',
      'cozinheira',
      'auxiliar de cozinha',
      'chef',
      'barista',
      'bartender',
    ],
    area: 'Gastronomia',
  },
  {
    palavras: [
      'camareira',
      'camareiro',
      'recepcionista de hotel',
      'governanta',
      'concierge',
    ],
    area: 'Hotelaria',
  },

  // ===== CONSTRUÇÃO E SERVIÇOS GERAIS =====
  {
    palavras: [
      'pedreiro',
      'eletricista',
      'encanador',
      'pintor',
      'mestre de obras',
      'ajudante de obras',
      'serralheiro',
    ],
    area: 'Construção Civil (Operacional)',
  },
  {
    palavras: [
      'auxiliar de limpeza',
      'serviços gerais',
      'jardineiro',
      'porteiro',
      'zelador',
    ],
    area: 'Serviços Gerais',
  },
  {
    palavras: [
      'segurança',
      'vigilante',
      'porteiro de condomínio',
      'agente de segurança',
    ],
    area: 'Segurança Patrimonial',
  },

  // ===== ESTÁGIO E TRAINEE (transversal) =====
  {
    palavras: ['estagiário', 'estagiária', 'estágio', 'trainee'],
    area: 'Estágio e Trainee',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Inferir a área a partir do título da vaga.
 */
function inferirArea(titulo: string): string {
  const tituloLower = titulo.toLowerCase();
  for (const { palavras, area } of MAPA_AREAS) {
    if (palavras.some((palavra) => tituloLower.includes(palavra))) {
      return area;
    }
  }
  return 'Outros';
}

/**
 * Converte HTML em texto limpo, preservando listas e quebras de parágrafo.
 * Usado para vagas REAIS raspadas (formato HTML).
 */
function limparHtml(html: string): string {
  return htmlToText(html, {
    wordwrap: false,
    selectors: [
      { selector: 'a', options: { ignoreHref: true } },
      { selector: 'img', format: 'skip' },
      { selector: 'div.ler-mais-bloco_MP', format: 'skip' },
    ],
  })
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Remove marcações de markdown inline (negrito, itálico, headings, código)
 * geradas pelo LLM, normalizando para texto plano consistente com o
 * formato das vagas reais (que passam por htmlToText).
 *
 * Preserva:
 *   - Bullets (* ou -) no início de linha
 *   - Estrutura de parágrafos
 *   - Texto literal de listas e seções
 *
 * Remove:
 *   - **negrito** e __negrito__
 *   - *itálico* e _itálico_ (com heurística para não confundir com bullets)
 *   - # ## ### headings
 *   - `código inline`
 *   - ```blocos de código```
 *   - > blockquotes
 *   - [texto](link) → mantém só o texto
 */
function limparMarkdown(texto: string): string {
  return (
    texto
      // Blocos de código (```...```) — preserva conteúdo, remove cercas
      .replace(/```[\w]*\n?([\s\S]*?)```/g, '\$1')
      // Código inline `...`
      .replace(/`([^`\n]+)`/g, '\$1')
      // Negrito: **texto** ou __texto__
      .replace(/\*\*([^*\n]+)\*\*/g, '\$1')
      .replace(/__([^_\n]+)__/g, '\$1')
      // Itálico *texto* — só quando não é bullet (sem espaço antes do *)
      .replace(/(?<=\S)\*([^*\n]+)\*(?=\S)/g, '\$1')
      .replace(/(?<=\S)_([^_\n]+)_(?=\S)/g, '\$1')
      // Headings: # Título, ## Título, etc. → remove só os #
      .replace(/^#{1,6}\s+/gm, '')
      // Blockquotes: > texto → remove o >
      .replace(/^>\s+/gm, '')
      // Links markdown [texto](url) → mantém só o texto
      .replace(/$$([^$$]+)\]\([^)]+\)/g, '\$1')
      // Múltiplas linhas em branco → no máximo 2
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

/**
 * Pergunta sim/não no terminal. Resposta vazia → padrão.
 */
async function perguntarSimNao(
  pergunta: string,
  padrao: 'sim' | 'nao' = 'nao',
): Promise<boolean> {
  const rl = readline.createInterface({ input, output });
  const sufixo = padrao === 'sim' ? '[S/n]' : '[s/N]';
  const resposta = (await rl.question(`${pergunta} ${sufixo} `))
    .trim()
    .toLowerCase();
  rl.close();

  if (!resposta) return padrao === 'sim';
  return ['s', 'sim', 'y', 'yes'].includes(resposta);
}

/**
 * Imprime distribuição agrupada por uma chave.
 */
function imprimirDistribuicao<T>(
  rotulo: string,
  itens: T[],
  chave: (item: T) => string,
): void {
  const dist = itens.reduce<Record<string, number>>((acc, item) => {
    const k = chave(item);
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`${PREFIXO_LOG} ${rotulo}:`);
  for (const [k, count] of Object.entries(dist).sort((a, b) => b[1] - a[1])) {
    console.log(`  - ${k}: ${count}`);
  }
}

// ---------------------------------------------------------------------------
// Carregamento de vagas REAIS (vagas_tuning.jsonl)
// ---------------------------------------------------------------------------

function carregarVagasReais(): VagaNormalizada[] {
  console.log(`\n${PREFIXO_LOG} 📁 Lendo vagas REAIS: ${ARQUIVO_REAIS}`);

  if (!existsSync(ARQUIVO_REAIS)) {
    console.warn(`${PREFIXO_LOG} ⚠️  Arquivo não encontrado. Pulando reais.`);
    return [];
  }

  const conteudo = readFileSync(ARQUIVO_REAIS, 'utf-8');
  const linhas = conteudo
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  console.log(`${PREFIXO_LOG}    ${linhas.length} linha(s) encontrada(s).`);

  const vagas: VagaNormalizada[] = [];
  let descartadas = 0;

  for (let i = 0; i < linhas.length; i++) {
    try {
      const cru = JSON.parse(linhas[i]) as VagaCruaJsonl;

      if (!cru.title || !cru.content) {
        descartadas++;
        console.warn(
          `${PREFIXO_LOG}    ⚠️  Linha ${i + 1}: faltam campos. Ignorada.`,
        );
        continue;
      }

      const descricaoLimpa = limparHtml(cru.content);

      if (descricaoLimpa.length < 100) {
        descartadas++;
        console.warn(
          `${PREFIXO_LOG}    ⚠️  Linha ${i + 1}: descrição curta (${descricaoLimpa.length} chars). Ignorada.`,
        );
        continue;
      }

      vagas.push({
        titulo: cru.title.trim(),
        area: inferirArea(cru.title),
        descricao: descricaoLimpa,
        origem: 'real',
      });
    } catch (erro) {
      descartadas++;
      const msg = erro instanceof Error ? erro.message : String(erro);
      console.error(`${PREFIXO_LOG}    ❌ Erro na linha ${i + 1}: ${msg}`);
    }
  }

  console.log(
    `${PREFIXO_LOG}    ✅ ${vagas.length} válida(s), ${descartadas} descartada(s).`,
  );

  return vagas;
}

// ---------------------------------------------------------------------------
// Carregamento de vagas SINTÉTICAS (vagas_sinteticas_*.json agregado)
// ---------------------------------------------------------------------------

function carregarVagasSinteticas(): VagaNormalizada[] {
  console.log(`\n${PREFIXO_LOG} 📁 Lendo vagas SINTÉTICAS...`);

  // Tenta cada um dos nomes possíveis (compatibilidade entre OS).
  let caminhoEncontrado: string | null = null;
  for (const caminho of ARQUIVOS_SINTETICAS) {
    if (existsSync(caminho)) {
      caminhoEncontrado = caminho;
      break;
    }
  }

  if (!caminhoEncontrado) {
    console.warn(
      `${PREFIXO_LOG} ⚠️  Nenhum arquivo de sintéticas encontrado. Pulando sintéticas.`,
    );
    return [];
  }

  console.log(`${PREFIXO_LOG}    Arquivo: ${caminhoEncontrado}`);

  const vagas: VagaNormalizada[] = [];
  let descartadas = 0;

  try {
    const conteudo = readFileSync(caminhoEncontrado, 'utf-8');
    const parsed = JSON.parse(conteudo) as ArquivoSinteticasAgregado;

    if (!Array.isArray(parsed.vagas)) {
      console.error(
        `${PREFIXO_LOG}    ❌ Arquivo não tem campo "vagas" como array.`,
      );
      return [];
    }

    // Imprime metadados se existirem (rastreabilidade).
    if (parsed.metadados) {
      console.log(`${PREFIXO_LOG}    📋 Metadados:`, parsed.metadados);
    }

    for (let i = 0; i < parsed.vagas.length; i++) {
      const v = parsed.vagas[i];

      // Validação inicial: tipos básicos.
      if (
        typeof v.titulo !== 'string' ||
        typeof v.area !== 'string' ||
        typeof v.descricao !== 'string'
      ) {
        descartadas++;
        console.warn(
          `${PREFIXO_LOG}    ⚠️  Vaga ${i + 1}: shape inválido. Ignorada.`,
        );
        continue;
      }

      // Limpa o markdown gerado pelo LLM ANTES de validar tamanho.
      const descricaoLimpa = limparMarkdown(v.descricao);

      if (descricaoLimpa.length < 100) {
        descartadas++;
        console.warn(
          `${PREFIXO_LOG}    ⚠️  Vaga ${i + 1}: descrição curta (${descricaoLimpa.length} chars). Ignorada.`,
        );
        continue;
      }

      vagas.push({
        titulo: v.titulo.trim(),
        area: v.area.trim(), // já vem da geração, não precisa inferir
        descricao: descricaoLimpa, // texto limpo, sem markdown inline
        origem: 'sintetica',
      });
    }
  } catch (erro) {
    const msg = erro instanceof Error ? erro.message : String(erro);
    console.error(`${PREFIXO_LOG}    ❌ Erro ao parsear arquivo: ${msg}`);
    return [];
  }

  console.log(
    `${PREFIXO_LOG}    ✅ ${vagas.length} válida(s), ${descartadas} descartada(s).`,
  );

  return vagas;
}

// ---------------------------------------------------------------------------
// Operações de banco
// ---------------------------------------------------------------------------

async function limparTabela(): Promise<void> {
  console.log(`\n${PREFIXO_LOG} 🧹 Limpando tabela "${TABELA_VAGAS}"...`);
  const { error } = await supabaseAdmin
    .from(TABELA_VAGAS)
    .delete()
    .neq('id', UUID_DUMMY);

  if (error) {
    throw new Error(`Falha ao limpar tabela: ${error.message}`);
  }
  console.log(`${PREFIXO_LOG}    ✅ Tabela limpa.`);
}

async function contarRegistros(): Promise<{
  total: number;
  reais: number;
  sinteticas: number;
}> {
  const [total, reais, sinteticas] = await Promise.all([
    supabaseAdmin
      .from(TABELA_VAGAS)
      .select('*', { count: 'exact', head: true }),
    supabaseAdmin
      .from(TABELA_VAGAS)
      .select('*', { count: 'exact', head: true })
      .eq('origem', 'real'),
    supabaseAdmin
      .from(TABELA_VAGAS)
      .select('*', { count: 'exact', head: true })
      .eq('origem', 'sintetica'),
  ]);

  if (total.error || reais.error || sinteticas.error) {
    throw new Error(
      `Falha ao contar: ${total.error?.message ?? reais.error?.message ?? sinteticas.error?.message}`,
    );
  }

  return {
    total: total.count ?? 0,
    reais: reais.count ?? 0,
    sinteticas: sinteticas.count ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Loop principal
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(`${PREFIXO_LOG} 🚀 Iniciando população do banco vetorial...`);
  if (SEED_LIMIT !== Infinity) {
    console.log(
      `${PREFIXO_LOG} 🎯 SEED_LIMIT ativo: até ${SEED_LIMIT} vaga(s) por origem`,
    );
  }

  // -------------------------------------------------------------------------
  // 1. Carregar vagas das DUAS fontes
  // -------------------------------------------------------------------------
  const todasReais = carregarVagasReais();
  const todasSinteticas = carregarVagasSinteticas();

  // Aplica SEED_LIMIT separadamente por origem (mantém balanceamento).
  const reais =
    SEED_LIMIT === Infinity ? todasReais : todasReais.slice(0, SEED_LIMIT);
  const sinteticas =
    SEED_LIMIT === Infinity
      ? todasSinteticas
      : todasSinteticas.slice(0, SEED_LIMIT);

  const vagas = [...reais, ...sinteticas];

  if (vagas.length === 0) {
    console.warn(
      `${PREFIXO_LOG} ❌ Nenhuma vaga válida em nenhuma das fontes. Saindo.`,
    );
    return;
  }

  // Mínimo esperado = exatamente o que tentamos inserir (mais honesto).
  const MINIMO_ESPERADO = vagas.length;

  console.log(`\n${PREFIXO_LOG} 📊 Resumo do carregamento:`);
  console.log(`${PREFIXO_LOG}    • Reais:      ${reais.length}`);
  console.log(`${PREFIXO_LOG}    • Sintéticas: ${sinteticas.length}`);
  console.log(`${PREFIXO_LOG}    • TOTAL:      ${vagas.length}`);

  imprimirDistribuicao('Distribuição por área (geral)', vagas, (v) => v.area);

  // -------------------------------------------------------------------------
  // 2. Confirmar limpeza da tabela
  // -------------------------------------------------------------------------
  const flagClean = process.argv.includes('--clean');
  const flagYes = process.argv.includes('--yes') || process.argv.includes('-y');

  let confirmou = flagClean && flagYes;

  if (!confirmou) {
    confirmou = await perguntarSimNao(
      `\n${PREFIXO_LOG} ⚠️  Isto irá APAGAR todos os registros da tabela "${TABELA_VAGAS}". Continuar?`,
      'nao',
    );
  }

  if (!confirmou) {
    console.log(`${PREFIXO_LOG} ❌ Operação cancelada pelo usuário.`);
    process.exit(0);
  }

  await limparTabela();

  // -------------------------------------------------------------------------
  // 3. Processar em lotes (ambas as origens misturadas)
  // -------------------------------------------------------------------------
  let totalInseridas = 0;
  let lotesComFalha = 0;
  const totalLotes = Math.ceil(vagas.length / TAMANHO_LOTE);

  console.log(
    `\n${PREFIXO_LOG} 🔧 Processando ${vagas.length} vaga(s) em ${totalLotes} lote(s) de ${TAMANHO_LOTE}...\n`,
  );

  for (let i = 0; i < vagas.length; i += TAMANHO_LOTE) {
    const lote = vagas.slice(i, i + TAMANHO_LOTE);
    const numeroLote = Math.floor(i / TAMANHO_LOTE) + 1;

    const reaisNoLote = lote.filter((v) => v.origem === 'real').length;
    const sinteticasNoLote = lote.length - reaisNoLote;

    console.log(
      `${PREFIXO_LOG} Lote ${numeroLote}/${totalLotes} — ${lote.length} vaga(s) ` +
        `(${reaisNoLote} real, ${sinteticasNoLote} sintética)...`,
    );

    try {
      const textos = lote.map(
        (v) => `${v.titulo}\nÁrea: ${v.area}\n\n${v.descricao}`,
      );

      const embeddings = await gerarEmbeddingsLote(textos);

      const registros = lote.map((vaga, idx) => ({
        titulo: vaga.titulo,
        area: vaga.area,
        descricao: vaga.descricao,
        origem: vaga.origem,
        embedding: embeddings[idx],
      }));

      const { error } = await supabaseAdmin
        .from(TABELA_VAGAS)
        .insert(registros);

      if (error) {
        lotesComFalha++;
        console.error(
          `${PREFIXO_LOG} ❌ Erro ao inserir lote ${numeroLote}: ${error.message}`,
        );
        continue;
      }

      totalInseridas += lote.length;
      console.log(`${PREFIXO_LOG} ✅ ${totalInseridas}/${vagas.length}`);
    } catch (erro) {
      lotesComFalha++;
      const msg = erro instanceof Error ? erro.message : String(erro);
      console.error(`${PREFIXO_LOG} 💥 Lote ${numeroLote} falhou: ${msg}`);
    }
  }

  // -------------------------------------------------------------------------
  // 4. Validação final com COUNT por origem
  // -------------------------------------------------------------------------
  console.log(`\n${PREFIXO_LOG} 🔍 Validando inserção...`);
  const contagem = await contarRegistros();

  // -------------------------------------------------------------------------
  // 5. Resumo
  // -------------------------------------------------------------------------
  console.log('\n────────────────────────────────────────');
  console.log(`${PREFIXO_LOG} 🎉 Seed concluído:`);
  console.log(`   • Vagas processadas:  ${totalInseridas}`);
  console.log(`   • Lotes com falha:    ${lotesComFalha}`);
  console.log(`   • Total no pgvector:  ${contagem.total}`);
  console.log(`     ↳ origem='real':       ${contagem.reais}`);
  console.log(`     ↳ origem='sintetica':  ${contagem.sinteticas}`);

  if (contagem.total < MINIMO_ESPERADO) {
    console.warn(
      `\n${PREFIXO_LOG} ⚠️  ATENÇÃO: total no banco (${contagem.total}) menor que o tentado (${MINIMO_ESPERADO}). Houve falhas?`,
    );
  }
  console.log('────────────────────────────────────────\n');
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

main().catch((erro) => {
  console.error(`${PREFIXO_LOG} 💥 Erro fatal:`, erro);
  process.exit(1);
});