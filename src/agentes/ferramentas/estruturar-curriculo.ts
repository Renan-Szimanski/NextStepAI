// src/agentes/ferramentas/estruturar-curriculo.ts
import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { criarLLM } from '@/lib/langchain/llm'
import { atualizarTextoCurriculo } from '@/lib/supabase/curriculo'
import type { DadosCurriculo } from '@/tipos/curriculo'

function truncarTexto(texto: string, limite: number = 8000): string {
  if (texto.length <= limite) return texto
  return texto.slice(0, limite) + '... [truncado]'
}

function extrairJsonDaResposta(resposta: string): any {
  let limpo = resposta.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
  const match = limpo.match(/\{[\s\S]*\}/)
  if (match) limpo = match[0]
  return JSON.parse(limpo)
}

export const estruturarDadosCurriculo = tool(
  async ({ textoCurriculo, usuarioId }: { textoCurriculo: string; usuarioId: string }) => {
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
          nome: dados.nome ?? null,
          email: dados.email ?? null,
          telefone: dados.telefone ?? null,
          formacao: Array.isArray(dados.formacao) ? dados.formacao : [],
          experiencias: Array.isArray(dados.experiencias) ? dados.experiencias.map((exp: any) => ({
            cargo: exp.cargo ?? '',
            empresa: exp.empresa ?? '',
            periodo: exp.periodo ?? null,
            descricao: exp.descricao ?? null,
          })) : [],
          habilidades: Array.isArray(dados.habilidades) ? dados.habilidades : [],
          idiomas: Array.isArray(dados.idiomas) ? dados.idiomas : [],
          resumo: dados.resumo ?? null,
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

    const { buscarCurriculo } = await import('@/lib/supabase/curriculo')
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

    const numExperiencias = dadosEstruturados.experiencias.length
    const numHabilidades = dadosEstruturados.habilidades.length
    const numIdiomas = dadosEstruturados.idiomas.length
    const avisoTruncado = foiTruncado ? ' (texto truncado, algumas informações podem faltar)' : ''

    return `Currículo estruturado com sucesso${avisoTruncado}. Encontrado: ${numExperiencias} experiência(s), ${numHabilidades} habilidade(s), ${numIdiomas} idioma(s).`
  },
  {
    name: 'estruturar_dados_curriculo',
    description: `Analisa o texto bruto de um currículo e extrai informações estruturadas (experiências, habilidades, formação, idiomas). Use após extrair_texto_pdf, antes de gerar o gap analysis.`,
    schema: z.object({
      textoCurriculo: z.string().describe('Texto bruto extraído do PDF do currículo'),
      usuarioId: z.string().describe('ID do usuário para salvar os dados estruturados'),
    }),
  }
)