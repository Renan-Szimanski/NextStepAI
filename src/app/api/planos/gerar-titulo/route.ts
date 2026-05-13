// src/app/api/planos/gerar-titulo/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { gerarTituloConversa } from '@/lib/supabase/historico'

export async function POST(req: NextRequest) {
  const sessao = await auth()
  if (!sessao?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { conversaId } = await req.json()
  if (!conversaId) {
    return NextResponse.json({ error: 'conversaId obrigatório' }, { status: 400 })
  }

  try {
    const novoTitulo = await gerarTituloConversa(conversaId, sessao.user.id)
    if (novoTitulo) {
      return NextResponse.json({ titulo: novoTitulo })
    } else {
      return NextResponse.json({ error: 'Falha ao gerar título' }, { status: 500 })
    }
  } catch (error) {
    console.error('[POST /gerar-titulo]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}