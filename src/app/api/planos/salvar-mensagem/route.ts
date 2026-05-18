// src/app/api/planos/salvar-mensagem/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { criarConversa, salvarMensagem } from '@/lib/supabase/historico'
import { contemRoadmap } from '@/lib/detectar-roadmap'
import { supabaseAdmin } from '@/lib/supabase/server' // usado para bypass RLS

export async function POST(req: NextRequest) {
  const sessao = await auth()
  if (!sessao?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const { conversaId, papel, conteudo, primeiraMsgTitulo, cargoAlvo } = body

  let papelNormalizado = papel
  if (papel === 'assistant') papelNormalizado = 'assistente'
  if (papelNormalizado !== 'usuario' && papelNormalizado !== 'assistente') {
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

    // --- Persistência do roadmap com supabaseAdmin (bypass RLS) ---
    if (papelNormalizado === 'assistente' && contemRoadmap(conteudo)) {
      const { data: conversa } = await supabaseAdmin
        .from('conversas')
        .select('roadmap_data')
        .eq('id', idConversa)
        .single()

      if (!conversa?.roadmap_data) {
        const { error: updateError } = await supabaseAdmin
          .from('conversas')
          .update({ roadmap_data: conteudo })
          .eq('id', idConversa)
        if (updateError) {
          console.error('[salvar-mensagem] Erro ao salvar roadmap:', updateError)
        } else {
          console.log('[salvar-mensagem] Roadmap salvo para conversa:', idConversa)
        }
      } else {
        console.log('[salvar-mensagem] Roadmap já existente, não sobrescrevendo')
      }
    }

    return NextResponse.json({ ok: true, conversaId: idConversa })
  } catch (error) {
    console.error('[salvar-mensagem] erro:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno' },
      { status: 500 }
    )
  }
}