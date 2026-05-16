// scripts/testar-extrair-pdf.ts

import 'dotenv/config'
import { extrairTextoPdf } from '@/agentes/ferramentas/extrair-pdf'

async function main() {
  // A tool não espera argumentos – o currículo já está no contexto
  const resultado = await extrairTextoPdf.invoke({})
  console.log('RESULTADO:\n', resultado)
}

main().catch(console.error)