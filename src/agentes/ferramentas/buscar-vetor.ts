import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import {
  buscarVagasSimilares,
  formatarVagasParaContexto,
} from '@/lib/langchain/vector-store';

const PREFIXO_LOG = '[Tool: consultar_banco_vetorial]';
const TOP_K_VAGAS = 3;

/**
 * Ferramenta que o Pathfinder usa para buscar vagas reais no banco vetorial
 * (Supabase + pgvector) via busca semântica por similaridade de embeddings.
 *
 * Esta é a tool RAG principal do MVP — atende ao requisito de "pelo menos 1 tool
 * sendo invocada" do princípio do projeto.
 */
export const consultarBancoVetorial = tool(
  async ({ query }) => {
    console.log(`${PREFIXO_LOG} Buscando vagas para: "${query}"`);

    try {
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
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`${PREFIXO_LOG} Erro:`, msg);

      return JSON.stringify({
        erro: true,
        mensagem:
          'A busca no banco de vagas falhou temporariamente. ' +
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