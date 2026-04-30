/**
 * Script de geração de vagas sintéticas via Groq.
 *
 * Para cada combinação (área, cargo) definida em AREAS, chama o LLM
 * (llama-3.1-8b-instant) e acumula a descrição gerada em um único arquivo:
 * `dados/vagas/sinteticas/vagas_sinteticas_nãotuned.json`.
 *
 * O arquivo é SOBRESCRITO a cada execução do script.
 * Para preservar o progresso em caso de crash, o arquivo é regravado após
 * cada vaga gerada com sucesso (não apenas no final).
 *
 * Uso:
 *   npm run gerar-vagas
 *
 * Pré-requisitos:
 *   - GROQ_API_KEY definida em .env.local
 *   - Pacotes: tsx, dotenv, @langchain/groq, @langchain/core
 *
 * Modo teste:
 *   Ajuste a constante LIMITE_VAGAS para gerar apenas N vagas (ex: 2).
 *   Use Infinity para gerar todas as 50.
 */

import * as dotenv from 'dotenv';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ChatGroq } from '@langchain/groq';
import { HumanMessage } from '@langchain/core/messages';

// Carrega variáveis de ambiente. Como o script roda fora do Next.js,
// precisamos carregar .env.local manualmente (não é automático como no Next).
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------

const DIRETORIO_SAIDA = path.resolve(
  process.cwd(),
  'dados',
  'vagas',
  'sinteticas',
);

/**
 * Nome do arquivo único onde TODAS as vagas serão salvas.
 * "naotuned" = dataset bruto, ainda sem fine-tuning / ajuste manual.
 */
const NOME_ARQUIVO_SAIDA = 'vagas_sinteticas_nao_tuned.json';
const CAMINHO_ARQUIVO_SAIDA = path.join(DIRETORIO_SAIDA, NOME_ARQUIVO_SAIDA);

const MODELO = 'llama-3.1-8b-instant';

/**
 * Delay entre chamadas bem-sucedidas.
 * Groq free tier: 6000 TPM no llama-3.1-8b-instant.
 * Cada vaga ≈ 2300 tokens → ~2.6 vagas/min máximo → ~23s entre chamadas.
 * Usamos 13s como base e deixamos o retry com backoff cuidar dos picos.
 */
const DELAY_ENTRE_CHAMADAS_MS = 13_000;

/** Máximo de tentativas por vaga em caso de rate limit. */
const MAX_TENTATIVAS_RATE_LIMIT = 5;

/**
 * Limite de vagas a gerar nesta execução.
 * - Use um número pequeno (ex: 2) para testes rápidos.
 * - Use Infinity para gerar todas as combinações de AREAS × cargos.
 */
const LIMITE_VAGAS = 2;

/**
 * Configuração centralizada de parâmetros do LLM.
 * Mantida em um único objeto para facilitar tuning e reuso por outros scripts.
 */
const CONFIG_LLM = {
  // temperatura: 0.4,
  // maxTokensSaida: 4096,
  // timeoutMs: 30_000,
  // maxRetries: 2,
  temperatura: 0.4,
  maxTokensSaida: 2048,
  timeoutMs: 30_000,
  maxRetries: 2,
} as const;

/**
 * Override da temperatura especificamente para o pipeline offline de geração
 * do corpus. Valor mais alto que o de produção (0.4) para maximizar a
 * diversidade lexical/semântica das descrições e melhorar a qualidade do RAG.
 */
const TEMPERATURA_GERACAO_DATASET = 0.85;

// ---------------------------------------------------------------------------
// Áreas e cargos (mercado brasileiro de tech)
// ---------------------------------------------------------------------------

interface Area {
  nome: string;
  cargos: string[];
}

const AREAS: Area[] = [
  {
    nome: 'Engenharia de Dados',
    cargos: [
      'Engenheiro de Dados Júnior',
      'Engenheiro de Dados Pleno',
      'Arquiteto de Dados',
      'Analytics Engineer',
      'Data Platform Engineer',
    ],
  },
  {
    nome: 'Product Management',
    cargos: [
      'Product Manager Júnior',
      'Product Manager Sênior',
      'Product Owner',
      'Group Product Manager',
      'Technical Product Manager',
    ],
  },
  {
    nome: 'UX Design',
    cargos: [
      'UX Designer Júnior',
      'UX Designer Sênior',
      'UX Researcher',
      'Product Designer',
      'UX Writer',
    ],
  },
  {
    nome: 'DevOps / SRE',
    cargos: [
      'DevOps Engineer Júnior',
      'DevOps Engineer Sênior',
      'Site Reliability Engineer',
      'Platform Engineer',
      'Cloud Engineer',
    ],
  },
  {
    nome: 'Frontend',
    cargos: [
      'Desenvolvedor Frontend Júnior',
      'Desenvolvedor Frontend Pleno',
      'Desenvolvedor Frontend Sênior',
      'Tech Lead Frontend',
      'Engenheiro de Software Frontend (React)',
    ],
  },
  {
    nome: 'Backend',
    cargos: [
      'Desenvolvedor Backend Júnior',
      'Desenvolvedor Backend Pleno',
      'Desenvolvedor Backend Sênior (Node.js)',
      'Desenvolvedor Backend Sênior (Java)',
      'Tech Lead Backend',
    ],
  },
  {
    nome: 'Machine Learning',
    cargos: [
      'Engenheiro de Machine Learning Júnior',
      'Engenheiro de Machine Learning Pleno',
      'MLOps Engineer',
      'Cientista de Dados',
      'Engenheiro de IA Generativa',
    ],
  },
  {
    nome: 'Mobile',
    cargos: [
      'Desenvolvedor Android (Kotlin)',
      'Desenvolvedor iOS (Swift)',
      'Desenvolvedor React Native',
      'Desenvolvedor Flutter',
      'Tech Lead Mobile',
    ],
  },
  {
    nome: 'QA / Testes',
    cargos: [
      'Analista de QA Júnior',
      'Analista de QA Pleno',
      'QA Automation Engineer',
      'SDET (Software Development Engineer in Test)',
      'Especialista em Performance Testing',
    ],
  },
  {
    nome: 'Cybersecurity',
    cargos: [
      'Analista de Segurança da Informação Júnior',
      'Analista de Segurança da Informação Pleno',
      'Pentester',
      'Security Engineer',
      'Especialista em Cloud Security',
    ],
  },
];

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface VagaSintetica {
  titulo: string;
  area: string;
  descricao: string;
}

/**
 * Estrutura do arquivo final agregado.
 * Inclui metadados úteis para rastreabilidade (modelo, temperatura, data).
 */
interface ArquivoAgregado {
  metadados: {
    modelo: string;
    temperatura: number;
    geradoEm: string; // ISO 8601
    totalVagas: number;
  };
  vagas: VagaSintetica[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Pausa a execução por `ms` milissegundos.
 */
function dormir(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extrai o tempo de espera (em ms) sugerido pela mensagem de erro 429 da Groq.
 * Exemplo: "Please try again in 14.04s." → 15040ms (com margem de 1s).
 * Fallback: 20s.
 */
function extrairTempoEspera(mensagemErro: string): number {
  const match = mensagemErro.match(/try again in ([\d.]+)s/i);
  if (match) {
    const segundos = parseFloat(match[1]);
    // Adiciona 1s de margem de segurança.
    return Math.ceil((segundos + 1) * 1000);
  }
  return 20_000;
}

/**
 * Detecta se um erro é de rate limit (HTTP 429).
 */
function ehRateLimit(erro: unknown): boolean {
  const mensagem = erro instanceof Error ? erro.message : String(erro);
  return (
    mensagem.includes('429') ||
    mensagem.toLowerCase().includes('rate_limit') ||
    mensagem.toLowerCase().includes('rate limit')
  );
}

/**
 * Executa uma função com retry automático em caso de rate limit (429),
 * respeitando o tempo de espera sugerido pela Groq.
 */
async function comRetryRateLimit<T>(
  fn: () => Promise<T>,
  contexto: string,
): Promise<T> {
  let ultimoErro: unknown;

  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS_RATE_LIMIT; tentativa++) {
    try {
      return await fn();
    } catch (erro) {
      ultimoErro = erro;

      if (!ehRateLimit(erro)) {
        // Erro não recuperável → propaga.
        throw erro;
      }

      const mensagem = erro instanceof Error ? erro.message : String(erro);
      const esperaMs = extrairTempoEspera(mensagem);

      console.warn(
        `   ⏳ Rate limit em "${contexto}" (tentativa ${tentativa}/${MAX_TENTATIVAS_RATE_LIMIT}). ` +
          `Aguardando ${(esperaMs / 1000).toFixed(1)}s...`,
      );

      await dormir(esperaMs);
    }
  }

  throw ultimoErro;
}

/**
 * Salva o arquivo agregado com todas as vagas geradas até o momento.
 * Chamado após cada vaga para preservar progresso em caso de crash.
 */
function salvarArquivoAgregado(vagas: VagaSintetica[]): void {
  const conteudo: ArquivoAgregado = {
    metadados: {
      modelo: MODELO,
      temperatura: TEMPERATURA_GERACAO_DATASET,
      geradoEm: new Date().toISOString(),
      totalVagas: vagas.length,
    },
    vagas,
  };

  fs.writeFileSync(
    CAMINHO_ARQUIVO_SAIDA,
    JSON.stringify(conteudo, null, 2),
    'utf-8',
  );
}

// ---------------------------------------------------------------------------
// Cliente LLM
// ---------------------------------------------------------------------------

function criarLlm(): ChatGroq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GROQ_API_KEY não definida. Configure em .env.local antes de rodar o script.',
    );
  }

  return new ChatGroq({
    apiKey,
    model: MODELO,
    // Override: prioriza diversidade no dataset (em produção usamos CONFIG_LLM.temperatura).
    temperature: TEMPERATURA_GERACAO_DATASET,
    maxTokens: CONFIG_LLM.maxTokensSaida,
    maxRetries: CONFIG_LLM.maxRetries,
    // Timeout em ms repassado ao cliente HTTP subjacente.
    timeout: CONFIG_LLM.timeoutMs,
  });
}

// ---------------------------------------------------------------------------
// Geração de uma vaga
// ---------------------------------------------------------------------------

const PROMPT_TEMPLATE = (area: string, cargo: string): string => `
Você é um recrutador experiente. Gere uma descrição de vaga REALISTA e DETALHADA para o cargo "${cargo}" na área de ${area}, no mercado brasileiro.

Inclua:
- Título da vaga
- 2 parágrafos de visão geral da empresa e do papel
- Seção "Responsabilidades" com 5-7 bullets
- Seção "Requisitos" com 5-7 bullets (hard skills específicas)
- Seção "Diferenciais" com 3-4 bullets
- Seção "Soft skills esperadas" com 3-4 bullets

Use linguagem profissional em português brasileiro. Não invente nomes de empresas reais. Seja específico em tecnologias, frameworks e ferramentas.

Retorne APENAS a descrição em texto puro, sem markdown.
`.trim();

async function gerarVaga(
  llm: ChatGroq,
  area: string,
  cargo: string,
): Promise<VagaSintetica> {
  const prompt = PROMPT_TEMPLATE(area, cargo);
  const resposta = await llm.invoke([new HumanMessage(prompt)]);

  // O conteúdo pode vir como string ou como array de partes (multimodal).
  const descricao =
    typeof resposta.content === 'string'
      ? resposta.content
      : resposta.content
          .map((parte) =>
            typeof parte === 'string'
              ? parte
              : 'text' in parte && typeof parte.text === 'string'
                ? parte.text
                : '',
          )
          .join('\n');

  return {
    titulo: cargo,
    area,
    descricao: descricao.trim(),
  };
}

// ---------------------------------------------------------------------------
// Loop principal
// ---------------------------------------------------------------------------

async function principal(): Promise<void> {
  console.info('🚀 Iniciando geração de vagas sintéticas...');
  console.info(`🤖 Modelo: ${MODELO}`);
  console.info(`🌡️  Temperatura: ${TEMPERATURA_GERACAO_DATASET}`);
  console.info(
    `🎯 Limite desta execução: ${LIMITE_VAGAS === Infinity ? 'todas' : LIMITE_VAGAS} vaga(s)`,
  );
  console.info(`📄 Arquivo de saída: ${CAMINHO_ARQUIVO_SAIDA}`);
  console.info('⚠️  O arquivo será SOBRESCRITO a cada execução.\n');

  // Garante que o diretório existe.
  fs.mkdirSync(DIRETORIO_SAIDA, { recursive: true });

  // Sobrescreve o arquivo logo de cara com array vazio (estado inicial limpo).
  salvarArquivoAgregado([]);

  const llm = criarLlm();

  // Achata a lista (área, cargo) para iteração linear com índice global,
  // depois corta de acordo com LIMITE_VAGAS (modo teste vs. produção).
  const tarefas: Array<{ area: string; cargo: string }> = AREAS.flatMap((a) =>
    a.cargos.map((cargo) => ({ area: a.nome, cargo })),
  ).slice(0, LIMITE_VAGAS);

  const total = tarefas.length;
  const vagasGeradas: VagaSintetica[] = [];
  let falhas = 0;

  for (let i = 0; i < total; i++) {
    const { area, cargo } = tarefas[i];
    const indice = i + 1;

    console.info(`[${indice}/${total}] ✍️  Gerando: ${cargo} (${area})...`);

    try {
      const vaga = await comRetryRateLimit(
        () => gerarVaga(llm, area, cargo),
        `${cargo} (${area})`,
      );

      vagasGeradas.push(vaga);

      // Salva o arquivo agregado após cada vaga (preserva progresso em caso de crash).
      salvarArquivoAgregado(vagasGeradas);

      console.info(
        `[${indice}/${total}] ✅ Vaga adicionada (${vagasGeradas.length} total no arquivo)`,
      );
    } catch (erro) {
      falhas++;
      const mensagem = erro instanceof Error ? erro.message : String(erro);
      console.error(
        `[${indice}/${total}] ❌ Falha em "${cargo}" (${area}): ${mensagem}`,
      );
      // Continua para a próxima vaga sem abortar o script.
    }

    // Delay entre chamadas para respeitar o rate limit da Groq.
    if (i < total - 1) {
      await dormir(DELAY_ENTRE_CHAMADAS_MS);
    }
  }

  // Garante uma gravação final (caso a última iteração tenha falhado mas haja vagas anteriores).
  salvarArquivoAgregado(vagasGeradas);

  // -------------------------------------------------------------------------
  // Resumo final
  // -------------------------------------------------------------------------
  console.info('\n────────────────────────────────────────');
  console.info(`✅ ${vagasGeradas.length} vaga(s) salvas em:`);
  console.info(`   ${CAMINHO_ARQUIVO_SAIDA}`);
  if (falhas > 0) console.info(`❌ ${falhas} falharam`);
  console.info('────────────────────────────────────────\n');
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

principal().catch((erro) => {
  console.error('💥 Erro fatal no script:', erro);
  process.exit(1);
});