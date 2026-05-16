// src/agentes/ferramentas/extrair-pdf.ts
import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { buscarCurriculo, atualizarTextoCurriculo } from '@/lib/supabase/curriculo'
import { gerarUrlLeitura } from '@/lib/r2/operacoes'
import { getDocumentProxy, extractText } from 'unpdf'
import { RunnableConfig } from '@langchain/core/runnables'

const PREFIXO_LOG = '[Tool: extrair_texto_pdf]'

// Tentativas e delays escalonados
const RETRY_DELAYS_MS = [0, 600, 1400]

function limparTexto(texto: string): string {
  return texto.replace(/\n{3,}/g, '\n\n').replace(/ +/g, ' ').trim()
}

const dadosEstruturaveisPadrao = {
  formacao: [],
  experiencias: [],
  habilidades: [],
  idiomas: [],
}

function aguardar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function buscarCurriculoComRetry(usuarioId: string) {
  for (let i = 0; i < RETRY_DELAYS_MS.length; i++) {
    const delay = RETRY_DELAYS_MS[i]

    if (delay > 0) {
      console.warn(
        `${PREFIXO_LOG} Currículo não encontrado (tentativa ${i}/${RETRY_DELAYS_MS.length}). ` +
        `Aguardando ${delay}ms...`
      )
      await aguardar(delay)
    }

    const curriculo = await buscarCurriculo(usuarioId)

    if (curriculo) {
      if (i > 0) {
        console.log(`${PREFIXO_LOG} Currículo encontrado na tentativa ${i + 1}.`)
      }
      return curriculo
    }
  }

  console.warn(`${PREFIXO_LOG} Currículo não encontrado após ${RETRY_DELAYS_MS.length} tentativa(s).`)
  return null
}

export const extrairTextoPdf = tool(
  async (_input: Record<string, never>, config?: RunnableConfig) => {
    // O usuário ID deve vir exclusivamente do config.configurable
    const configurable = config?.configurable as Record<string, unknown> | undefined
    const usuarioId = configurable?.usuarioId as string | undefined

    console.log(`${PREFIXO_LOG} configurable recebido:`, JSON.stringify(configurable))
    console.log(`${PREFIXO_LOG} usuarioId extraído do config:`, usuarioId)

    if (!usuarioId) {
      console.error(`${PREFIXO_LOG} usuarioId não encontrado no config.`)
      return (
        'Não foi possível identificar o usuário. ' +
        'Por favor, faça login novamente e tente outra vez.'
      )
    }

    // Busca com retry
    const curriculo = await buscarCurriculoComRetry(usuarioId)

    if (!curriculo) {
      return (
        'Nenhum currículo encontrado. ' +
        'Por favor, envie seu currículo em PDF usando o botão de upload e tente novamente.'
      )
    }

    // URL de leitura
    let urlLeitura: string
    try {
      urlLeitura = await gerarUrlLeitura(curriculo.chaveR2)
    } catch {
      return 'Erro ao acessar o currículo no armazenamento. Tente novamente mais tarde.'
    }

    // Download
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30_000)

    let pdfBuffer: ArrayBuffer
    try {
      const response = await fetch(urlLeitura, { signal: controller.signal })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      pdfBuffer = await response.arrayBuffer()
    } catch (err) {
      clearTimeout(timeoutId)
      if (err instanceof Error && err.name === 'AbortError') {
        return 'Não foi possível baixar o currículo a tempo. Tente novamente.'
      }
      return 'Erro ao baixar o currículo. Verifique sua conexão e tente novamente.'
    } finally {
      clearTimeout(timeoutId)
    }

    // Extração
    let textoExtraido: string
    try {
      const pdfUint8 = new Uint8Array(pdfBuffer)
      const pdfDoc = await getDocumentProxy(pdfUint8)
      const { text } = await extractText(pdfDoc, { mergePages: true })
      textoExtraido = text
    } catch (err) {
      console.error(`${PREFIXO_LOG} Erro no parse do PDF:`, err)
      return (
        'Não foi possível extrair o texto do PDF. ' +
        'O arquivo pode estar corrompido ou ser uma imagem escaneada.'
      )
    }

    const textoLimpo = limparTexto(textoExtraido)

    if (textoLimpo.length < 100) {
      return (
        'O PDF parece ser uma imagem escaneada ou não contém texto extraível. ' +
        'O Pathfinder não consegue ler PDFs escaneados no momento.'
      )
    }

    // Persistência
    try {
      await atualizarTextoCurriculo(
        curriculo.id,
        textoLimpo,
        curriculo.dadosEstruturados || dadosEstruturaveisPadrao,
      )
    } catch (err) {
      console.error(`${PREFIXO_LOG} Erro ao salvar texto extraído:`, err)
    }

    const preview = textoLimpo.slice(0, 2000)
    const sufixo = textoLimpo.length > 2000 ? '... [truncado]' : ''

    return `Texto extraído do currículo (${textoLimpo.length} caracteres):\n\n${preview}${sufixo}`
  },
  {
    name: 'extrair_texto_pdf',
    description: `Baixa e extrai o texto do currículo PDF enviado pelo usuário.
Use esta tool quando o usuário mencionar que enviou um currículo ou quando
precisar analisar as competências atuais do usuário para gap analysis.
Não é necessário fornecer argumentos – o ID do usuário é obtido automaticamente.`,
    schema: z.object({}), // Schema vazio: não aceita argumentos
  },
)