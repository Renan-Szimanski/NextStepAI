// src/tipos/agente.ts

import type { Mensagem } from './index';

/**
 * Re-exporta `Mensagem` para que outros módulos possam importá-lo
 * tanto de `@/tipos` quanto de `@/tipos/agente` sem quebrar.
 *
 * Convenção do projeto:
 * - `@/tipos` (index.ts)  → tipos de domínio gerais (Mensagem, Usuario, etc.)
 * - `@/tipos/agente`      → tipos específicos do agente Pathfinder
 */
export type { Mensagem };

/**
 * Representa os diferentes tipos de eventos emitidos via Server-Sent Events (SSE)
 * pelo orquestrador para o frontend durante o streaming da resposta do agente.
 *
 * - `token`        → fragmento de texto gerado pelo LLM (streaming).
 * - `tool_call`    → o agente decidiu invocar uma ferramenta (ex.: RAG).
 * - `tool_result`  → a ferramenta terminou a execução.
 * - `done`         → fim do stream com sucesso.
 * - `error`        → falha irrecuperável; mensagem amigável para o usuário.
 */
export type EventoStreamSSE =
  | { type: 'token'; content: string }
  | { type: 'tool_call'; name: string; args?: Record<string, unknown> }
  | { type: 'tool_result'; name: string; success: boolean }
  | { type: 'done' }
  | { type: 'error'; message: string };

/**
 * Estrutura de dados necessária para invocar o agente Pathfinder no backend.
 *
 * - `messages`  → histórico completo da conversa (incluindo a mensagem atual do usuário).
 * - `userId`    → identificador do usuário autenticado (NextAuth / GitHub OAuth).
 * - `sessionId` → identificador da sessão de chat (para memória de conversa).
 */
export interface EntradaAgente {
  messages: Mensagem[];
  userId: string;
  sessionId: string;
}