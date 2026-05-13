// src/agentes/ferramentas/extrair-pdf.ts
import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { buscarCurriculo, atualizarTextoCurriculo } from '@/lib/supabase/curriculo'
import { gerarUrlLeitura } from '@/lib/r2/operacoes'
import { getDocumentProxy, extractText } from 'unpdf'

function limparTexto(texto: string): string {
  return texto.replace(/\n{3,}/g, '\n\n').replace(/ +/g, ' ').trim()
}

const dadosEstruturaveisPadrao = {
  formacao: [],
  experiencias: [],
  habilidades: [],
  idiomas: [],
}

export const extrairTextoPdf = tool(
  async ({ usuarioId: usuarioIdParam }: { usuarioId?: string } = {}) => {
    let usuarioId = usuarioIdParam
    if (!usuarioId) {
      const sessao = await auth()
      usuarioId = sessao?.user?.id
    }
    if (!usuarioId) {
      return 'Usuário não autenticado. Por favor, faça login novamente.'
    }

    const curriculo = await buscarCurriculo(usuarioId)
    if (!curriculo) {
      return 'Nenhum currículo encontrado. Por favor, envie seu currículo em PDF.'
    }

    let urlLeitura: string
    try {
      urlLeitura = await gerarUrlLeitura(curriculo.chaveR2)
    } catch {
      return 'Erro ao acessar o currículo. Tente novamente mais tarde.'
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    let pdfBuffer: ArrayBuffer
    try {
      const response = await fetch(urlLeitura, { signal: controller.signal })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      pdfBuffer = await response.arrayBuffer()
    } catch (err) {
      clearTimeout(timeoutId)
      if (err instanceof Error && err.name === 'AbortError')
        return 'Não foi possível baixar o currículo. Tente novamente.'
      return 'Erro ao baixar o currículo. Verifique sua conexão e tente novamente.'
    }
    clearTimeout(timeoutId)

    let textoExtraido: string
    try {
      const pdfUint8 = new Uint8Array(pdfBuffer)
      const pdfDoc = await getDocumentProxy(pdfUint8)
      const { text } = await extractText(pdfDoc, { mergePages: true })
      textoExtraido = text
    } catch (err) {
      console.error('[extrairTextoPdf] erro no parse do PDF:', err)
      return 'Não foi possível extrair o texto do PDF. O arquivo pode estar corrompido ou ser uma imagem escaneada.'
    }

    const textoLimpo = limparTexto(textoExtraido)
    if (textoLimpo.length < 100) {
      return 'O PDF parece ser uma imagem escaneada ou não contém texto extraível. O Pathfinder não consegue ler PDFs escaneados no momento.'
    }

    try {
      await atualizarTextoCurriculo(
        curriculo.id,
        textoLimpo,
        curriculo.dadosEstruturados || dadosEstruturaveisPadrao
      )
    } catch (err) {
      console.error('[extrairTextoPdf] erro ao salvar texto:', err)
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
Não é necessário fornecer argumentos – o ID do usuário é obtido da sessão autenticada.`,
    schema: z.object({
      usuarioId: z.string().optional().describe('ID do usuário (opcional, para testes).'),
    }),
  }
)