// src/agentes/ferramentas/buscar-vetor.ts
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import {
  buscarVagasSimilares,
  formatarVagasParaContexto,
} from '@/lib/langchain/vector-store';

const PREFIXO_LOG = '[Tool: consultar_banco_vetorial]';
const TOP_K_VAGAS = 3;

// Bug 2 fix: timeout total da tool (em ms).
// O vector-store já aplica 12 s por operação; aqui garantimos que a tool
// inteira (embedding + RPC + formatação) nunca ultrapasse 15 s.
// Isso impede que o LangChain entre em loop de re-chamada por ausência de resposta.
const TIMEOUT_TOOL_MS = 15_000;

/**
 * Executa a busca com um timeout global via Promise.race.
 * Se `buscarVagasSimilares` não resolver em TIMEOUT_TOOL_MS, rejeita com
 * mensagem de timeout — evitando que a tool fique presa indefinidamente.
 */
async function buscarComTimeout(query: string): Promise<string> {
  const timeoutPromise = new Promise<never>((_, rejeitar) =>
    setTimeout(
      () =>
        rejeitar(
          new Error(`Timeout de ${TIMEOUT_TOOL_MS / 1000}s atingido na tool.`),
        ),
      TIMEOUT_TOOL_MS,
    ),
  );

  const buscaPromise = (async () => {
    const vagas = await buscarVagasSimilares(query, TOP_K_VAGAS);

    if (!vagas || vagas.length === 0) {
      console.warn(`${PREFIXO_LOG} Nenhuma vaga encontrada.`);
      return JSON.stringify({
        erro: false,
        mensagem:
          `Nenhuma vaga similar encontrada no banco para a query "${query}". ` +
          'Continue o roadmap usando seu conhecimento geral sobre o cargo, ' +
          'sem inventar dados específicos de empresas ou requisitos.',
        vagas: [],
      });
    }

    console.log(`${PREFIXO_LOG} ${vagas.length} vaga(s) encontrada(s).`);
    return formatarVagasParaContexto(vagas);
  })();

  // Bug 2 fix: a corrida garante rejeição limpa se qualquer I/O travar.
  return Promise.race([buscaPromise, timeoutPromise]);
}

/**
 * Ferramenta que o Pathfinder usa para buscar vagas reais no banco vetorial
 * (Supabase + pgvector) via busca semântica por similaridade de embeddings.
 *
 * Correções do Bug 2:
 * - Timeout de 15 s via Promise.race (tanto aqui quanto em vector-store.ts).
 * - Em caso de erro ou timeout, retorna JSON de fallback amigável em vez de
 *   lançar exceção — evitando que o LangChain fique em loop de re-chamada
 *   aguardando uma resposta que nunca chega.
 * - O JSON de fallback instrui o LLM a prosseguir com conhecimento geral,
 *   mantendo a conversa fluindo sem travar.
 */
export const consultarBancoVetorial = tool(
  async ({ query }) => {
    console.log(`${PREFIXO_LOG} Buscando vagas para: "${query}"`);

    try {
      return await buscarComTimeout(query);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      const ehTimeout = msg.toLowerCase().includes('timeout');

      // Bug 2 fix: log detalhado para rastreabilidade, mas sempre retorna
      // string (nunca lança) para evitar loop de re-chamada pelo LangChain.
      if (ehTimeout) {
        console.warn(`${PREFIXO_LOG} Timeout na busca vetorial: ${msg}`);
      } else {
        console.error(`${PREFIXO_LOG} Erro na busca vetorial:`, msg);
      }

      // Retorna fallback estruturado — o LLM consegue interpretar e prosseguir.
      return JSON.stringify({
        erro: true,
        tipoErro: ehTimeout ? 'timeout' : 'erro_generico',
        mensagem: ehTimeout
          ? 'A busca no banco de vagas demorou demais e foi interrompida. ' +
            'Continue a resposta usando seu conhecimento geral sobre o cargo. ' +
            'Informe ao usuário que o banco de vagas estava indisponível ' +
            'e que as recomendações são baseadas em conhecimento geral.'
          : 'A busca no banco de vagas falhou temporariamente. ' +
            'Continue a resposta usando seu conhecimento geral sobre o cargo ' +
            'e mencione ao usuário que algumas recomendações são baseadas em ' +
            'conhecimento geral, não em dados específicos do banco.',
      });
    }
  },
  {
    name: 'consultar_banco_vetorial',
    description: `Busca vagas reais no banco vetorial usando similaridade semântica.
Use SEMPRE que precisar identificar competências, ferramentas, requisitos ou tendências de mercado
para um cargo específico antes de montar o roadmap de carreira do usuário.
Quando usar:
- O usuário menciona um cargo-alvo (ex.: "quero ser Engenheiro de Dados").
- Você precisa fundamentar recomendações em dados reais de vagas.
- Você precisa identificar skills mais frequentes para um perfil.
Retorna: até ${TOP_K_VAGAS} vagas similares formatadas em texto, com cargo, empresa, requisitos e descrição.`,
    schema: z.object({
      query: z
        .string()
        .min(3, 'A query deve ter pelo menos 3 caracteres.')
        .max(500, 'A query não pode exceder 500 caracteres.')
        .describe(
          'Descrição em linguagem natural do cargo, competência ou tecnologia que se quer buscar. ' +
            'Exemplos: "Engenheiro de Dados júnior com Python e Spark", ' +
            '"Front-end React Next.js", "Cientista de Dados com foco em LLMs".',
        ),
    }),
  },
);