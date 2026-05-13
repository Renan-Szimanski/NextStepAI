// src/app/api/curriculo/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase/server'
import { gerarUrlLeitura, deletarArquivo } from '@/lib/r2/operacoes'

/**
 * GET /api/curriculo
 * Retorna o currículo mais recente do usuário (com URL assinada)
 */
export async function GET() {
  const sessao = await auth()
  if (!sessao?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  // Busca o currículo do usuário (apenas um por usuário)
  const { data, error } = await supabaseAdmin
    .from('curriculos')
    .select('id, nome_arquivo, chave_r2, tamanho_bytes, carregado_em')
    .eq('usuario_id', sessao.user.id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // Nenhum currículo encontrado
      return NextResponse.json({ curriculo: null })
    }
    console.error('[GET /curriculo] erro no banco:', error)
    return NextResponse.json({ error: 'Erro ao buscar currículo' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ curriculo: null })
  }

  try {
    const urlLeitura = await gerarUrlLeitura(data.chave_r2)
    return NextResponse.json({
      curriculo: {
        id: data.id,
        nomeOriginal: data.nome_arquivo,
        tamanhoBytes: data.tamanho_bytes,
        carregadoEm: data.carregado_em,
        urlLeitura,
      },
    })
  } catch (err) {
    console.error('[GET /curriculo] erro ao gerar URL:', err)
    return NextResponse.json({ error: 'Erro ao gerar link de visualização' }, { status: 500 })
  }
}

/**
 * POST /api/curriculo
 * Registra um currículo enviado (após upload para R2)
 * Body: { chave: string, nomeOriginal: string, tamanhoBytes: number }
 */
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

  const { chave: chaveR2, nomeOriginal, tamanhoBytes } = body

  if (!chaveR2 || !nomeOriginal || !tamanhoBytes) {
    return NextResponse.json(
      { error: 'Campos obrigatórios: chave, nomeOriginal, tamanhoBytes' },
      { status: 400 }
    )
  }

  // Valida se a chave pertence ao usuário
  if (!chaveR2.startsWith(`curriculos/${sessao.user.id}/`)) {
    return NextResponse.json({ error: 'Chave inválida para este usuário' }, { status: 403 })
  }

  // Substitui currículo anterior (deleta o antigo do banco e do R2)
  const { data: antigo, error: buscaAntigo } = await supabaseAdmin
    .from('curriculos')
    .select('chave_r2')
    .eq('usuario_id', sessao.user.id)
    .single()

  if (!buscaAntigo && antigo) {
    try {
      await deletarArquivo(antigo.chave_r2)
    } catch (err) {
      console.error('[POST /curriculo] erro ao deletar arquivo antigo:', err)
    }
  }

  // Insere novo currículo
  const { data, error } = await supabaseAdmin
    .from('curriculos')
    .upsert(
      {
        usuario_id: sessao.user.id,
        chave_r2: chaveR2,
        nome_arquivo: nomeOriginal,
        tamanho_bytes: tamanhoBytes,
        // Limpa campos de processamento anteriores
        texto_extraido: null,
        dados_estruturados: null,
        processado_em: null,
      },
      { onConflict: 'usuario_id' }
    )
    .select('id')
    .single()

  if (error) {
    console.error('[POST /curriculo] erro ao inserir:', error)
    return NextResponse.json({ error: 'Erro ao salvar registro do currículo' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: data.id })
}

/**
 * DELETE /api/curriculo
 * Remove o currículo do usuário (arquivo no R2 + registro no banco)
 */
export async function DELETE() {
  const sessao = await auth()
  if (!sessao?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  // Busca o currículo atual
  const { data, error } = await supabaseAdmin
    .from('curriculos')
    .select('chave_r2')
    .eq('usuario_id', sessao.user.id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ ok: true, message: 'Nenhum currículo para remover' })
    }
    console.error('[DELETE /curriculo] erro ao buscar currículo:', error)
    return NextResponse.json({ error: 'Erro ao buscar currículo' }, { status: 500 })
  }

  // Remove do R2
  try {
    await deletarArquivo(data.chave_r2)
  } catch (err) {
    console.error('[DELETE /curriculo] erro ao deletar do R2:', err)
    // Não interrompe, tenta deletar do banco mesmo assim
  }

  // Remove do banco
  const { error: deleteDbError } = await supabaseAdmin
    .from('curriculos')
    .delete()
    .eq('usuario_id', sessao.user.id)

  if (deleteDbError) {
    console.error('[DELETE /curriculo] erro ao deletar do banco:', deleteDbError)
    return NextResponse.json({ error: 'Erro ao remover registro' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}