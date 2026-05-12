// src/tipos/historico.ts
// Definições dos tipos utilizados no histórico de conversas

/**
 * Resumo de uma conversa (sem mensagens)
 */
export type ConversaResumo = {
  id: string
  titulo: string
  cargoAlvo: string | null
  criadoEm: string   // timestamp ISO
  atualizadoEm: string
}

/**
 * Mensagem persistida no banco
 */
export type MensagemPersistida = {
  id: string
  papel: 'usuario' | 'assistente'
  conteudo: string
  criadoEm: string
}

/**
 * Conversa completa com todas as mensagens
 */
export type ConversaCompleta = ConversaResumo & {
  mensagens: MensagemPersistida[]
}