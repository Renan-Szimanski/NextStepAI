// src/agentes/ferramentas/extrair-pdf.ts
import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { buscarCurriculo, atualizarTextoCurriculo } from '@/lib/supabase/curriculo'
import { gerarUrlLeitura } from '@/lib/r2/operacoes'
import { getDocumentProxy, extractText } from 'unpdf'
import { RunnableConfig } from '@langchain/core/runnables'

const PREFIXO_LOG = '[Tool: extrair_texto_pdf]'
const RETRY_DELAYS_MS = [0, 600, 1400]
const FETCH_TIMEOUT_MS = 8000      // 8 segundos para download
const PARSE_TIMEOUT_MS = 5000      // 5 segundos para parse do PDF

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
    if (delay > 0) await aguardar(delay)
    const curriculo = await buscarCurriculo(usuarioId)
    if (curriculo) return curriculo
  }
  return null
}

export const extrairTextoPdf = tool(
  async (_input: Record<string, never>, config?: RunnableConfig) => {
    const configurable = config?.configurable as Record<string, unknown> | undefined
    const usuarioId = configurable?.usuarioId as string | undefined

    if (!usuarioId) {
      return 'Não foi possível identificar o usuário. Faça login novamente.'
    }

    const startTime = Date.now()
    const curriculo = await buscarCurriculoComRetry(usuarioId)

    if (!curriculo) {
      return 'Nenhum currículo encontrado. Envie seu currículo em PDF usando o botão de upload.'
    }

    // ----- CACHE: se já temos texto extraído, retorna imediatamente -----
    if (curriculo.textoExtraido && curriculo.textoExtraido.length > 100) {
      console.log(`${PREFIXO_LOG} Usando texto em cache (${curriculo.textoExtraido.length} caracteres)`)
      const preview = curriculo.textoExtraido.slice(0, 2000)
      const sufixo = curriculo.textoExtraido.length > 2000 ? '... [truncado]' : ''
      return `Texto extraído do currículo (${curriculo.textoExtraido.length} caracteres):\n\n${preview}${sufixo}`
    }

    // ----- Download com timeout curto -----
    let urlLeitura: string
    try {
      urlLeitura = await gerarUrlLeitura(curriculo.chaveR2)
    } catch {
      return 'Erro ao acessar o currículo no armazenamento.'
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    let pdfBuffer: ArrayBuffer
    try {
      const response = await fetch(urlLeitura, { signal: controller.signal })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      pdfBuffer = await response.arrayBuffer()
    } catch (err) {
      clearTimeout(timeoutId)
      if (err instanceof Error && err.name === 'AbortError') {
        return 'Download do currículo demorou demais. Tente novamente ou envie um PDF menor.'
      }
      return 'Erro ao baixar o currículo.'
    } finally {
      clearTimeout(timeoutId)
    }

    // ----- Parse do PDF com timeout -----
    let textoExtraido: string
    const parsePromise = (async () => {
      const pdfUint8 = new Uint8Array(pdfBuffer)
      const pdfDoc = await getDocumentProxy(pdfUint8)
      const { text } = await extractText(pdfDoc, { mergePages: true })
      return text
    })()

    const parseTimeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('parse_timeout')), PARSE_TIMEOUT_MS)
    )

    try {
      textoExtraido = await Promise.race([parsePromise, parseTimeoutPromise])
    } catch (err) {
      console.error(`${PREFIXO_LOG} Erro no parse do PDF:`, err)
      return 'Não foi possível extrair o texto do PDF. O arquivo pode estar corrompido ou ser uma imagem escaneada.'
    }

    const textoLimpo = limparTexto(textoExtraido)

    if (textoLimpo.length < 100) {
      return 'O PDF parece ser uma imagem escaneada ou não contém texto extraível.'
    }

    // Salva em background (não bloqueia a resposta da tool)
    try {
      await atualizarTextoCurriculo(
        curriculo.id,
        textoLimpo,
        curriculo.dadosEstruturados || dadosEstruturaveisPadrao,
      )
    } catch (err) {
      console.error(`${PREFIXO_LOG} Erro ao salvar texto extraído:`, err)
    }

    const duration = Date.now() - startTime
    console.log(`${PREFIXO_LOG} Extração concluída em ${duration}ms`)

    const preview = textoLimpo.slice(0, 2000)
    const sufixo = textoLimpo.length > 2000 ? '... [truncado]' : ''
    return `Texto extraído do currículo (${textoLimpo.length} caracteres):\n\n${preview}${sufixo}`
  },
  {
    name: 'extrair_texto_pdf',
    description: `Baixa e extrai o texto do currículo PDF enviado pelo usuário. Usa cache automático.`,
    schema: z.object({}),
  },
)