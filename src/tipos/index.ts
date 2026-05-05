/**
 * Representa o papel do remetente em uma interação de chat com o LLM.
 */
export type Papel = 'user' | 'assistant' | 'tool' | 'system';

/**
 * Representa uma única mensagem trocada no chat do NextStepAI.
 */
export interface Mensagem {
  id: string;
  papel: Papel;
  conteudo: string;
  timestamp: number;
  toolName?: string;
  criadoEm: Date;
}

/**
 * Formato do payload enviado pelo frontend para a rota da API de mensagens.
 */
export interface RequestMensagens {
  messages: Mensagem[];
  sessionId: string;
}

/**
 * Representa os dados básicos do usuário logado na aplicação.
 */
export interface Usuario {
  id: string;
  nome?: string | null;
  email?: string | null;
  imagem?: string | null;
}