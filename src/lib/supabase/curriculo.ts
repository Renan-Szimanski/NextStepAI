// src/lib/supabase/curriculo.ts
import { supabaseAdmin } from '@/lib/supabase/server'
import type { NovoCurriculo, CurriculoCompleto, DadosCurriculo } from '@/tipos/curriculo'

export async function salvarCurriculo(dados: NovoCurriculo): Promise<string> {
  const { usuarioId, nomeArquivo, chaveR2, tamanhoBytes } = dados

  const { data, error } = await supabaseAdmin
    .from('curriculos')
    .upsert(
      {
        usuario_id: usuarioId,
        nome_arquivo: nomeArquivo,
        chave_r2: chaveR2,
        tamanho_bytes: tamanhoBytes,
        processado_em: null,
        texto_extraido: null,
        dados_estruturados: null,
      },
      { onConflict: 'usuario_id' }
    )
    .select('id')
    .single()

  if (error) {
    console.error('[salvarCurriculo] erro:', error)
    throw new Error('Falha ao salvar currículo.')
  }
  return data.id
}

export async function atualizarTextoCurriculo(
  id: string,
  textoExtraido: string,
  dadosEstruturados: DadosCurriculo
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('curriculos')
    .update({
      texto_extraido: textoExtraido,
      dados_estruturados: dadosEstruturados,
      processado_em: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('[atualizarTextoCurriculo] erro:', error)
    throw new Error('Falha ao atualizar dados do currículo.')
  }
}

export async function buscarCurriculo(usuarioId: string): Promise<CurriculoCompleto | null> {
  const { data, error } = await supabaseAdmin
    .from('curriculos')
    .select('id, usuario_id, nome_arquivo, chave_r2, tamanho_bytes, carregado_em, processado_em, texto_extraido, dados_estruturados')
    .eq('usuario_id', usuarioId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('[buscarCurriculo] erro:', error)
    throw new Error('Falha ao buscar currículo.')
  }

  return {
    id: data.id,
    usuarioId: data.usuario_id,
    nomeArquivo: data.nome_arquivo,
    chaveR2: data.chave_r2,
    tamanhoBytes: data.tamanho_bytes,
    carregadoEm: data.carregado_em,
    processadoEm: data.processado_em,
    textoExtraido: data.texto_extraido,
    dadosEstruturados: data.dados_estruturados as DadosCurriculo | null,
  }
}

export async function deletarCurriculo(usuarioId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('curriculos')
    .delete()
    .eq('usuario_id', usuarioId)

  if (error) {
    console.error('[deletarCurriculo] erro:', error)
    throw new Error('Falha ao deletar currículo.')
  }
}