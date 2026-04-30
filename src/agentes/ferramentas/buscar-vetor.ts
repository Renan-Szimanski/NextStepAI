import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { buscarVagasSimilares, formatarVagasParaContexto } from "@/lib/langchain/vector-store";

/**
 * Ferramenta que o Pathfinder usa para buscar vagas no Supabase.
 */
export const consultarBancoVetorial = tool(
  async ({ query }) => {
    try {
      const vagas = await buscarVagasSimilares(query, 5);
      return formatarVagasParaContexto(vagas);
    } catch (error) {
      console.error("[Tool] Erro ao buscar no banco:", error);
      return "Não foi possível buscar vagas no momento. Tente novamente mais tarde.";
    }
  },
  {
    name: "consultar_banco_vetorial",
    description: "Busca vagas similares no banco de dados para auxiliar na criação do roadmap.",
    schema: z.object({
      query: z.string().describe("A descrição do cargo ou competências que o usuário busca."),
    }),
  }
);