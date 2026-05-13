// src/agentes/ferramentas/buscar-recursos.ts
import { tool } from '@langchain/core/tools'
import { TavilySearch } from '@langchain/tavily'
import { z } from 'zod'

const tavily = new TavilySearch({
  maxResults: 5,
  includeAnswer: false,
  includeRawContent: false,
})

function formatarResultadoItem(resultado: any): string {
  return `- [${resultado.title}](${resultado.url}) — ${resultado.content?.slice(0, 120) || 'sem descrição'}`
}

export const buscarRecursosEducacionais = tool(
  async ({ habilidades, nivel }) => {
    if (!habilidades || habilidades.length === 0) {
      return 'Nenhuma habilidade fornecida. Informe as habilidades desejadas.'
    }

    let query = habilidades.join(', ')
    if (nivel) {
      query += ` para ${nivel}`
    }
    query += ' cursos, tutoriais e recursos'

    // Chamada correta: passando um objeto com a propriedade 'query'
    const response = await tavily._call({ query })

    // Verifica se houve erro (a resposta pode conter a propriedade 'error')
    if ('error' in response) {
      console.error('[buscarRecursos] Erro na API Tavily:', response.error)
      return `Não foi possível buscar recursos: ${response.error}`
    }

    // TavilySearchResponse normalmente tem uma propriedade 'results'
    const results = (response as any).results || []
    if (results.length === 0) {
      return `Não encontrei recursos para "${habilidades.join(', ')}". Tente termos mais genéricos.`
    }

    const formatados = results.map(formatarResultadoItem).join('\n')
    return `# Sugestões de recursos educacionais encontrados na web\n\n${formatados}\n\n*Links obtidos pela busca Tavily — verifique a atualidade do conteúdo.*`
  },
  {
    name: 'buscar_recursos_educacionais',
    description: `Busca na web por cursos, tutoriais e materiais sobre habilidades específicas.
Use quando o usuário pedir recomendações de onde estudar uma skill.
Retorna títulos e links reais de recursos encontrados em plataformas como Coursera, Udemy, YouTube, documentações, etc.`,
    schema: z.object({
      habilidades: z.array(z.string()).describe('Lista de habilidades para buscar recursos'),
      nivel: z.enum(['iniciante', 'intermediário', 'avançado']).optional()
        .describe('Nível desejado (iniciante/intermediário/avançado)'),
    }),
  }
)