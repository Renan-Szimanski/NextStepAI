import type { Mensagem } from './index';

/**
 * Representa os diferentes tipos de eventos emitidos via Server-Sent Events (SSE)
 * durante o streaming da resposta do agente (LLM).
 */
export type EventoStreamSSE =
  | { type: 'token'; content: string }
  | { type: 'tool_call'; name: string; args?: Record<string, unknown> }
  | { type: 'tool_result'; name: string; success: boolean }
  | { type: 'done' }
  | { type: 'error'; message: string };

/**
 * Estrutura de dados necessária para invocar o agente (Pathfinder) no backend.
 */
export interface EntradaAgente {
  messages: Mensagem[];
  userId: string;
  sessionId: string;
}