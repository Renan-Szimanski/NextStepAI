// src/agentes/pathfinder.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { converterMensagensParaLangChain } from './pathfinder';
import type { Mensagem, Papel } from '@/tipos';

// Mocks para evitar chamadas reais a Groq/Supabase nos testes
vi.mock('@/lib/langchain/llm', () => ({ criarLLM: vi.fn() }));
vi.mock('@/agentes/ferramentas/buscar-vetor', () => ({
  consultarBancoVetorial: {},
}));

// ─── Helper de fábrica de mensagens ──────────────────────
let _idCounter = 0;

function criarMensagem(papel: Papel, conteudo: string): Mensagem {
  return {
    id: `msg-${++_idCounter}`,
    papel,
    conteudo,
    criadoEm: new Date(),
    timestamp: Date.now(),
  };
}
// ─────────────────────────────────────────────────────────

describe('converterMensagensParaLangChain', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _idCounter = 0;
  });

  describe('mapeamento de papéis', () => {
    it('converte user → HumanMessage', async () => {
      const r = await converterMensagensParaLangChain([
        criarMensagem('user', 'oi'),
      ]);
      expect(r).toHaveLength(1);
      expect(r[0].getType()).toBe('human');
      expect(r[0].content).toBe('oi');
    });

    it('converte assistant → AIMessage', async () => {
      const r = await converterMensagensParaLangChain([
        criarMensagem('user', 'oi'),
        criarMensagem('assistant', 'olá'),
      ]);
      expect(r).toHaveLength(2);
      expect(r[1].getType()).toBe('ai');
    });

    it('ignora papel "tool"', async () => {
      const r = await converterMensagensParaLangChain([
        criarMensagem('user', 'oi'),
        criarMensagem('tool', 'resultado'),
        criarMensagem('assistant', 'olá'),
      ]);
      expect(r).toHaveLength(2);
    });

    it('ignora papel "system"', async () => {
      const r = await converterMensagensParaLangChain([
        criarMensagem('system', 'instruções'),
        criarMensagem('user', 'oi'),
      ]);
      expect(r).toHaveLength(1);
      expect(r[0].getType()).toBe('human');
    });
  });

  describe('filtros de conteúdo', () => {
    it('ignora mensagens com conteúdo vazio', async () => {
      const r = await converterMensagensParaLangChain([
        criarMensagem('user', ''),
        criarMensagem('user', 'válida'),
      ]);
      expect(r).toHaveLength(1);
    });

    it('ignora mensagens só com espaços', async () => {
      const r = await converterMensagensParaLangChain([
        criarMensagem('user', '   \n\t  '),
        criarMensagem('user', 'válida'),
      ]);
      expect(r).toHaveLength(1);
    });

    it('retorna array vazio para entrada vazia', async () => {
      const r = await converterMensagensParaLangChain([]);
      expect(r).toEqual([]);
    });
  });

  describe('janela deslizante (Estratégia 2)', () => {
    it('NÃO apara histórico curto', async () => {
      const r = await converterMensagensParaLangChain([
        criarMensagem('user', 'curta'),
        criarMensagem('assistant', 'curta'),
      ]);
      expect(r).toHaveLength(2);
    });

    it('APARA histórico longo (>4000 tokens)', async () => {
      const msgs = Array.from({ length: 10 }, (_, i) =>
        criarMensagem(
          i % 2 === 0 ? 'user' : 'assistant',
          'a'.repeat(5000),
        ),
      );
      const r = await converterMensagensParaLangChain(msgs);
      expect(r.length).toBeLessThan(msgs.length);
    });

    it('preserva as mensagens MAIS RECENTES', async () => {
      const msgs = Array.from({ length: 20 }, (_, i) =>
        criarMensagem(
          i % 2 === 0 ? 'user' : 'assistant',
          `MSG_${i}_${'x'.repeat(2000)}`,
        ),
      );
      const r = await converterMensagensParaLangChain(msgs);

      // A última (índice 19) deve estar
      expect(String(r[r.length - 1].content)).toContain('MSG_19');
      // A primeira (índice 0) NÃO deve estar
      expect(r.every((m) => !String(m.content).includes('MSG_0_'))).toBe(true);
    });

    it('primeira msg após trim é HumanMessage', async () => {
      const msgs = Array.from({ length: 30 }, (_, i) =>
        criarMensagem(
          i % 2 === 0 ? 'user' : 'assistant',
          'a'.repeat(1000),
        ),
      );
      const r = await converterMensagensParaLangChain(msgs);
      expect(r[0].getType()).toBe('human');
    });
  });
});