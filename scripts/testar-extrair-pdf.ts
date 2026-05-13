import 'dotenv/config'
import { extrairTextoPdf } from '@/agentes/ferramentas/extrair-pdf'

const usuarioId = '6116430a-74eb-46ee-8351-41d93c1df878'

async function main() {
  // Agora podemos passar usuarioId como parâmetro opcional
  const resultado = await extrairTextoPdf.invoke({ usuarioId })
  console.log('RESULTADO:\n', resultado)
}

main().catch(console.error)