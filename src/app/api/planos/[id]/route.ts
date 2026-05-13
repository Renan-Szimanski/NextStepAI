// src/app/api/planos/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { deletarConversa } from '@/lib/supabase/historico'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessao = await auth()
  if (!sessao?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'ID da conversa não fornecido' }, { status: 400 })
  }

  try {
    await deletarConversa(id, sessao.user.id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[DELETE /planos]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Falha ao deletar conversa' },
      { status: 500 }
    )
  }
}