// src\agentes\ferramentas\estruturar-curriculo.ts

import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { RunnableConfig } from '@langchain/core/runnables'
import { criarLLM } from '@/lib/langchain/llm'
import { atualizarTextoCurriculo, buscarCurriculo } from '@/lib/supabase/curriculo'
import type { DadosCurriculo, ExperienciaProfissional } from '@/tipos/curriculo'

const LLM_TIMEOUT_MS = 4000   // 4 segundos para chamada ao LLM

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
      return 'Não foi possível identificar o usuário.'
    }

    if (!textoCurriculo || textoCurriculo.trim().length === 0) {
      return 'Erro: texto do currículo vazio.'
    }

    // ----- CACHE: se já temos dados estruturados no banco, retorna resumo imediato -----
    const curriculoExistente = await buscarCurriculo(usuarioId)
    if (curriculoExistente?.dadosEstruturados && 
        Object.keys(curriculoExistente.dadosEstruturados).length > 0 &&
        curriculoExistente.dadosEstruturados.habilidades?.length) {
      console.log('[estruturarDadosCurriculo] Usando dados estruturados em cache')
      const resumoCache = gerarResumoParaLLM(curriculoExistente.dadosEstruturados)
      return `✅ Currículo já estruturado anteriormente.\n\n${resumoCache}`
    }

    // ----- Processamento com timeout -----
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

    let dadosEstruturados: DadosCurriculo | null = null
    let sucesso = false
    let erroMensagem = ''

    try {
      const llmPromise = llm.invoke([
        { role: 'system', content: promptSistema },
        { role: 'user', content: `Texto do currículo:\n${textoLimitado}` },
      ])
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('LLM_TIMEOUT')), LLM_TIMEOUT_MS)
      )
      const resposta = await Promise.race([llmPromise, timeoutPromise])
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
      erroMensagem = err instanceof Error ? err.message : String(err)
      console.warn('[estruturarDadosCurriculo] Falha na estruturação:', erroMensagem)
    }

    if (!sucesso || !dadosEstruturados) {
      // Salva um placeholder para não reprocessar sempre
      try {
        if (curriculoExistente?.id) {
          await atualizarTextoCurriculo(
            curriculoExistente.id,
            textoCurriculo,
            { formacao: [], experiencias: [], habilidades: [], idiomas: [] }
          )
        }
      } catch { /* ignora erro no placeholder */ }

      return `⚠️ **Processamento em segundo plano**\n\nNão foi possível analisar seu currículo agora (tempo limite). Continue conversando normalmente – em alguns instantes os dados estarão disponíveis. Você pode pedir para “analisar meu currículo” novamente daqui a pouco.`
    }

    // Salva os dados estruturados
    const curriculo = await buscarCurriculo(usuarioId)
    if (!curriculo) {
      return 'Nenhum currículo encontrado para este usuário.'
    }

    try {
      await atualizarTextoCurriculo(curriculo.id, curriculo.textoExtraido || '', dadosEstruturados)
    } catch (err) {
      console.error('[estruturarDadosCurriculo] erro ao salvar:', err)
    }

    const resumo = gerarResumoParaLLM(dadosEstruturados)
    const avisoTruncado = foiTruncado ? ' (o texto original foi truncado, algumas informações podem faltar)' : ''
    return `✅ Currículo estruturado com sucesso${avisoTruncado}.\n\n${resumo}\n\nAgora você pode usar as informações acima para gerar a Gap Analysis.`
  },
  {
    name: 'estruturar_dados_curriculo',
    description: `Extrai dados estruturados do currículo. Usa cache automático.`,
    schema: z.object({
      textoCurriculo: z.string().describe('Texto bruto extraído do PDF do currículo'),
    }),
  }
)