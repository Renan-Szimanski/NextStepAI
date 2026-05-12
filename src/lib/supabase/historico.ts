// src/lib/supabase/historico.ts
// Funções server-side para persistência de conversas e mensagens no Supabase
// Utiliza supabaseAdmin (service role) - adequado para rotas de API e agentes

import { supabaseAdmin } from '@/lib/supabase/server'
import type { ConversaResumo, ConversaCompleta, MensagemPersistida } from '@/tipos/historico'

/**
 * Cria uma nova conversa.
 * @param usuarioId - ID do usuário (string, vindo do NextAuth)
 * @param primeiraMsg - Conteúdo da primeira mensagem do usuário (usado para gerar título)
 * @param cargoAlvo - (opcional) Cargo identificado na conversa
 * @returns ID da conversa criada (UUID)
 */
export async function criarConversa(
  usuarioId: string,
  primeiraMsg: string,
  cargoAlvo?: string
): Promise<string> {
  const titulo = primeiraMsg.slice(0, 60)

  const { data, error } = await supabaseAdmin
    .from('conversas')
    .insert({
      usuario_id: usuarioId,
      titulo,
      cargo_alvo: cargoAlvo || null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[criarConversa] Erro ao criar conversa:', error)
    throw new Error('Falha ao criar conversa.')
  }

  return data.id
}

/**
 * Salva uma mensagem em uma conversa existente.
 */
export async function salvarMensagem(
  conversaId: string,
  papel: 'usuario' | 'assistente',
  conteudo: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('mensagens')
    .insert({
      conversa_id: conversaId,
      papel,
      conteudo,
    })

  if (error) {
    console.error('[salvarMensagem] Erro ao salvar mensagem:', error)
    throw new Error('Falha ao salvar mensagem.')
  }
}

/**
 * Lista todas as conversas de um usuário (sem mensagens), ordenadas pela mais recente.
 */
export async function listarConversas(usuarioId: string): Promise<ConversaResumo[]> {
  const { data, error } = await supabaseAdmin
    .from('conversas')
    .select('id, titulo, cargo_alvo, criado_em, atualizado_em')
    .eq('usuario_id', usuarioId)
    .order('atualizado_em', { ascending: false })

  if (error) {
    console.error('[listarConversas] Erro ao listar conversas:', error)
    throw new Error('Falha ao listar conversas.')
  }

  return (data || []).map((conv) => ({
    id: conv.id,
    titulo: conv.titulo,
    cargoAlvo: conv.cargo_alvo,
    criadoEm: conv.criado_em,
    atualizadoEm: conv.atualizado_em,
  }))
}

/**
 * Busca uma conversa completa com todas as suas mensagens.
 */
export async function buscarConversa(
  conversaId: string,
  usuarioId: string
): Promise<ConversaCompleta | null> {
  // Primeiro verifica se a conversa pertence ao usuário
  const { data: conversa, error: convError } = await supabaseAdmin
    .from('conversas')
    .select('id, titulo, cargo_alvo, criado_em, atualizado_em')
    .eq('id', conversaId)
    .eq('usuario_id', usuarioId)
    .single()

  if (convError || !conversa) {
    if (convError?.code !== 'PGRST116') {
      console.error('[buscarConversa] Erro ao buscar conversa:', convError)
    }
    return null
  }

  const { data: mensagens, error: msgError } = await supabaseAdmin
    .from('mensagens')
    .select('id, papel, conteudo, criado_em')
    .eq('conversa_id', conversaId)
    .order('criado_em', { ascending: true })

  if (msgError) {
    console.error('[buscarConversa] Erro ao buscar mensagens:', msgError)
    throw new Error('Falha ao buscar mensagens.')
  }

  const mensagensTipadas: MensagemPersistida[] = (mensagens || []).map((msg) => ({
    id: msg.id,
    papel: msg.papel,
    conteudo: msg.conteudo,
    criadoEm: msg.criado_em,
  }))

  return {
    id: conversa.id,
    titulo: conversa.titulo,
    cargoAlvo: conversa.cargo_alvo,
    criadoEm: conversa.criado_em,
    atualizadoEm: conversa.atualizado_em,
    mensagens: mensagensTipadas,
  }
}

/**
 * Deleta uma conversa e todas as suas mensagens (CASCADE).
 */
export async function deletarConversa(
  conversaId: string,
  usuarioId: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('conversas')
    .delete()
    .eq('id', conversaId)
    .eq('usuario_id', usuarioId)

  if (error) {
    console.error('[deletarConversa] Erro ao deletar conversa:', error)
    throw new Error('Falha ao deletar conversa.')
  }
}