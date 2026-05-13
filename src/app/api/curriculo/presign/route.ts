// src/app/api/curriculo/presign/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { gerarUrlUpload } from '@/lib/r2/operacoes'

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

  const { nomeArquivo, tamanhoBytes } = body

  // Validações
  if (!nomeArquivo || typeof nomeArquivo !== 'string') {
    return NextResponse.json({ error: 'nomeArquivo é obrigatório' }, { status: 400 })
  }
  if (typeof tamanhoBytes !== 'number' || tamanhoBytes <= 0) {
    return NextResponse.json({ error: 'tamanhoBytes inválido' }, { status: 400 })
  }

  // Limite de 5 MB
  const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
  if (tamanhoBytes > MAX_SIZE) {
    return NextResponse.json({ error: 'Arquivo muito grande. Máximo de 5 MB.' }, { status: 400 })
  }

  // Verifica extensão .pdf
  if (!nomeArquivo.toLowerCase().endsWith('.pdf')) {
    return NextResponse.json({ error: 'Apenas arquivos PDF são permitidos' }, { status: 400 })
  }

  // Sanitiza nome: remove espaços e caracteres especiais
  const nomeSanitizado = nomeArquivo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .substring(0, 100)

  const timestamp = Date.now()
  const chave = `curriculos/${sessao.user.id}/${timestamp}-${nomeSanitizado}`

  try {
    const urlUpload = await gerarUrlUpload(chave, 'application/pdf')
    return NextResponse.json({ urlUpload, chave })
  } catch (error) {
    console.error('[presign] erro ao gerar URL:', error)
    return NextResponse.json({ error: 'Erro ao gerar URL de upload' }, { status: 500 })
  }
}