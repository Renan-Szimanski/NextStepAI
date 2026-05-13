import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { getDocumentProxy, extractText } from 'unpdf'

async function testLocal() {
  const pdfPath = path.join(process.cwd(), 'teste.pdf')
  if (!fs.existsSync(pdfPath)) {
    console.error('Arquivo teste.pdf não encontrado.')
    return
  }
  const dataBuffer = fs.readFileSync(pdfPath)
  const pdfUint8 = new Uint8Array(dataBuffer)
  const pdfDoc = await getDocumentProxy(pdfUint8)
  const { text } = await extractText(pdfDoc, { mergePages: true })
  console.log('✅ Texto extraído com unpdf!')
  console.log('Primeiros 500 caracteres:\n', text.slice(0, 500))
}

testLocal().catch(console.error)