import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { criarConversa, salvarMensagem } from '@/lib/supabase/historico'

export async function POST(req: NextRequest) {
  const sessao = await auth()
  if (!sessao?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  let body
  try {
    body = await req.json()
    console.log('[salvar-mensagem] body recebido:', body) // LOG
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const { conversaId, papel, conteudo, primeiraMsgTitulo, cargoAlvo } = body

  // Normaliza: aceita 'assistant' (inglês) ou 'assistente' (português)
  let papelNormalizado = papel
  if (papel === 'assistant') papelNormalizado = 'assistente'
  if (papelNormalizado !== 'usuario' && papelNormalizado !== 'assistente') {
    console.error('[salvar-mensagem] papel inválido:', papel)
    return NextResponse.json(
      { error: `Papel inválido: ${papel}. Use 'usuario' ou 'assistente'` },
      { status: 400 }
    )
  }

  if (!conteudo) {
    return NextResponse.json({ error: 'Conteúdo obrigatório' }, { status: 400 })
  }

  try {
    let idConversa = conversaId

    if (!idConversa) {
      if (!primeiraMsgTitulo) {
        return NextResponse.json(
          { error: 'Para nova conversa, forneça primeiraMsgTitulo' },
          { status: 400 }
        )
      }
      idConversa = await criarConversa(
        sessao.user.id,
        primeiraMsgTitulo,
        cargoAlvo || undefined
      )
    }

    await salvarMensagem(idConversa, papelNormalizado, conteudo)
    return NextResponse.json({ ok: true, conversaId: idConversa })
  } catch (error) {
    console.error('[salvar-mensagem] erro:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    )
  }
}