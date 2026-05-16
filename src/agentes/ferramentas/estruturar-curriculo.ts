import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { RunnableConfig } from '@langchain/core/runnables'
import { criarLLM } from '@/lib/langchain/llm'
import { atualizarTextoCurriculo, buscarCurriculo } from '@/lib/supabase/curriculo'
import type { DadosCurriculo, ExperienciaProfissional } from '@/tipos/curriculo'

function truncarTexto(texto: string, limite: number = 8000): string {
  if (texto.length <= limite) return texto
  return texto.slice(0, limite) + '... [truncado]'
}

function extrairJsonDaResposta(resposta: string): DadosCurriculo {
  let limpo = resposta.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
  const match = limpo.match(/\{[\s\S]*\}/)
  if (match) limpo = match[0]
  return JSON.parse(limpo) as DadosCurriculo
}

function nullToUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value
}

/**
 * Gera um resumo legível dos dados estruturados para o LLM utilizar
 * como fonte de verdade ao montar a Gap Analysis.
 */
function gerarResumoParaLLM(dados: DadosCurriculo): string {
  const habilidadesTecnicas = dados.habilidades?.filter(h => 
    !['comunicação', 'trabalho em equipe', 'liderança', 'proatividade', 'organização', 'gestão', 'planejamento', 'inglês', 'espanhol', 'francês'].includes(h.toLowerCase())
  ) || []
  const habilidadesComportamentais = dados.habilidades?.filter(h => 
    ['comunicação', 'trabalho em equipe', 'liderança', 'proatividade', 'organização', 'gestão', 'planejamento'].includes(h.toLowerCase())
  ) || []
  const idiomas = dados.idiomas || []
  
  const experiencias = dados.experiencias || []
  const resumoExperiencias = experiencias.map(exp => 
    `- ${exp.cargo} na ${exp.empresa}${exp.periodo ? ` (${exp.periodo})` : ''}${exp.descricao ? `: ${exp.descricao.slice(0, 150)}` : ''}`
  ).join('\n')

  return `
=== DADOS REAIS DO CURRÍCULO DO USUÁRIO (USE SOMENTE ESTES) ===

**Formação acadêmica:**
${dados.formacao?.length ? dados.formacao.map(f => `- ${f}`).join('\n') : '- Nenhuma formação listada'}

**Experiências profissionais:**
${resumoExperiencias || '- Nenhuma experiência listada'}

**Habilidades técnicas:**
${habilidadesTecnicas.length ? habilidadesTecnicas.map(h => `- ${h}`).join('\n') : '- Nenhuma habilidade técnica listada'}

**Habilidades comportamentais:**
${habilidadesComportamentais.length ? habilidadesComportamentais.map(h => `- ${h}`).join('\n') : '- Nenhuma habilidade comportamental listada'}

**Idiomas:**
${idiomas.length ? idiomas.map(i => `- ${i}`).join('\n') : '- Nenhum idioma listado'}

**Nome:** ${dados.nome || 'Não informado'}
**Email:** ${dados.email || 'Não informado'}

⚠️ IMPORTANTE: Estas são as ÚNICAS informações que você tem sobre o usuário. 
NÃO invente habilidades, experiências, formação ou tecnologias que não estão nesta lista.
Se uma competência exigida pelo mercado não estiver aqui, trate como lacuna.
`
}

export const estruturarDadosCurriculo = tool(
  async ({ textoCurriculo }: { textoCurriculo: string }, config?: RunnableConfig) => {
    const configurable = config?.configurable as Record<string, unknown> | undefined
    const usuarioId = configurable?.usuarioId as string | undefined

    if (!usuarioId) {
      console.error('[estruturarDadosCurriculo] usuarioId não encontrado no config.')
      return 'Não foi possível identificar o usuário. Por favor, faça login novamente.'
    }

    if (!textoCurriculo || textoCurriculo.trim().length === 0) {
      return 'Erro: texto do currículo vazio. Execute extrair_texto_pdf primeiro.'
    }

    const textoLimitado = truncarTexto(textoCurriculo, 8000)
    const foiTruncado = textoLimitado.length < textoCurriculo.length
    const llm = criarLLM('principal')

    const promptSistema = `Você é um parser de currículos. Extraia SOMENTE os dados presentes no texto fornecido. NÃO invente ou infira informações ausentes.

Responda APENAS com um objeto JSON válido, sem texto adicional, sem \`\`\`json, sem explicações. Use null para campos ausentes.

Esquema esperado:
{
  "nome": string | null,
  "email": string | null,
  "telefone": string | null,
  "formacao": string[],
  "experiencias": [
    {
      "cargo": string,
      "empresa": string,
      "periodo": string | null,
      "descricao": string | null
    }
  ],
  "habilidades": string[],
  "idiomas": string[],
  "resumo": string | null
}`

    let tentativas = 0
    let sucesso = false
    let dadosEstruturados: DadosCurriculo | null = null
    let ultimoErro = ''

    while (tentativas < 2 && !sucesso) {
      try {
        const resposta = await llm.invoke([
          { role: 'system', content: promptSistema },
          { role: 'user', content: `Texto do currículo:\n${textoLimitado}` },
        ])
        const conteudo = typeof resposta.content === 'string' ? resposta.content : String(resposta.content)
        const dados = extrairJsonDaResposta(conteudo)

        if (!dados || typeof dados !== 'object') throw new Error('Resposta não é objeto JSON')

        dadosEstruturados = {
          nome: nullToUndefined(dados.nome),
          email: nullToUndefined(dados.email),
          telefone: nullToUndefined(dados.telefone),
          formacao: Array.isArray(dados.formacao) ? dados.formacao : [],
          experiencias: Array.isArray(dados.experiencias) ? dados.experiencias.map((exp: Partial<ExperienciaProfissional>) => ({
            cargo: exp.cargo ?? '',
            empresa: exp.empresa ?? '',
            periodo: nullToUndefined(exp.periodo),
            descricao: nullToUndefined(exp.descricao),
          })) : [],
          habilidades: Array.isArray(dados.habilidades) ? dados.habilidades : [],
          idiomas: Array.isArray(dados.idiomas) ? dados.idiomas : [],
          resumo: nullToUndefined(dados.resumo),
        }
        sucesso = true
      } catch (err) {
        ultimoErro = err instanceof Error ? err.message : String(err)
        tentativas++
      }
    }

    if (!sucesso || !dadosEstruturados) {
      return `Falha ao estruturar o currículo: ${ultimoErro}. O texto extraído pode estar mal formatado.`
    }

    const curriculo = await buscarCurriculo(usuarioId)
    if (!curriculo) {
      return 'Nenhum currículo encontrado para este usuário. Faça upload primeiro.'
    }

    try {
      await atualizarTextoCurriculo(curriculo.id, curriculo.textoExtraido || '', dadosEstruturados)
    } catch (err) {
      console.error('[estruturarDadosCurriculo] erro ao salvar:', err)
      return `Erro ao salvar dados estruturados no banco: ${err instanceof Error ? err.message : 'desconhecido'}`
    }

    // Gera o resumo para o LLM usar na resposta
    const resumo = gerarResumoParaLLM(dadosEstruturados)
    const avisoTruncado = foiTruncado ? ' (o texto original foi truncado, algumas informações podem faltar)' : ''

    // Retorna tanto uma mensagem de sucesso quanto o resumo estruturado
    return `✅ Currículo estruturado com sucesso${avisoTruncado}.

${resumo}

Agora você pode usar as informações acima para gerar a Gap Analysis.`
  },
  {
    name: 'estruturar_dados_curriculo',
    description: `Analisa o texto bruto de um currículo e extrai informações estruturadas (experiências, habilidades, formação, idiomas). Use após extrair_texto_pdf, antes de gerar o gap analysis. Não é necessário fornecer argumentos – o ID do usuário é obtido automaticamente. Retorna os dados reais do currículo para você usar na análise.`,
    schema: z.object({
      textoCurriculo: z.string().describe('Texto bruto extraído do PDF do currículo'),
    }),
  }
)