import 'dotenv/config'
import { buscarRecursosEducacionais } from '@/agentes/ferramentas/buscar-recursos'

async function main() {
  const resultado = await buscarRecursosEducacionais.invoke({
    habilidades: ['Python', 'SQL'],
    nivel: 'iniciante',
  })
  console.log(resultado)
}

main().catch(console.error)