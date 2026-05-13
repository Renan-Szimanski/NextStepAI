import 'dotenv/config'
import { estruturarDadosCurriculo } from '@/agentes/ferramentas/estruturar-curriculo'
import { buscarCurriculo } from '@/lib/supabase/curriculo'

const usuarioId = '6116430a-74eb-46ee-8351-41d93c1df878' // substitua pelo seu ID

async function main() {
  const curriculo = await buscarCurriculo(usuarioId)
  if (!curriculo || !curriculo.textoExtraido) {
    console.error('Currículo ou texto extraído não encontrado. Execute extrair_texto_pdf primeiro.')
    return
  }
  const resultado = await estruturarDadosCurriculo.invoke({
    textoCurriculo: curriculo.textoExtraido,
    usuarioId,
  })
  console.log('RESULTADO:\n', resultado)
}

main().catch(console.error)