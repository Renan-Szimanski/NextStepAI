// src/agentes/pathfinder.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
// src/agentes/pathfinder.test.ts (ou onde estiver)
import { converterMensagensParaLangChain } from '@/agentes/pathfinder';
import type { Mensagem, Papel } from '@/tipos';

// Mocks para evitar chamadas reais a Groq/Supabase nos testes
vi.mock('@/lib/langchain/llm', () => ({ criarLLM: vi.fn() }));
vi.mock('@/agentes/ferramentas/buscar-vetor', () => ({
  consultarBancoVetorial: {},
}));

// ─── Helper de fábrica ────────────────────────────────────
let _idCounter = 0;

function criarMensagem(papel: Papel, conteudo: string): Mensagem {
  return {
    id: `msg-${++_idCounter}`,
    papel,
    conteudo,
    timestamp: Date.now(),
  };
}
// ──────────────────────────────────────────────────────────

describe('converterMensagensParaLangChain', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _idCounter = 0;
  });

  describe('mapeamento de papéis', () => {
    it('converte user → HumanMessage', async () => {
      const msgs = [criarMensagem('user', 'oi')];
      const r = await converterMensagensParaLangChain(msgs);

      expect(r).toHaveLength(1);
      expect(r[0].getType()).toBe('human');
      expect(r[0].content).toBe('oi');
    });

    it('converte assistant → AIMessage', async () => {
      const msgs = [
        criarMensagem('user', 'oi'),
        criarMensagem('assistant', 'olá'),
      ];
      const r = await converterMensagensParaLangChain(msgs);

      expect(r).toHaveLength(2);
      expect(r[1].getType()).toBe('ai');
      expect(r[1].content).toBe('olá');
    });

    it('ignora papel "tool"', async () => {
      const msgs = [
        criarMensagem('user', 'oi'),
        criarMensagem('tool', 'resultado'),
        criarMensagem('assistant', 'olá'),
      ];
      const r = await converterMensagensParaLangChain(msgs);

      expect(r).toHaveLength(2);
      expect(r.every((m) => m.getType() !== 'tool')).toBe(true);
    });

    it('ignora papel "system"', async () => {
      const msgs = [
        criarMensagem('system', 'instruções'),
        criarMensagem('user', 'oi'),
      ];
      const r = await converterMensagensParaLangChain(msgs);

      expect(r).toHaveLength(1);
      expect(r[0].getType()).toBe('human');
    });
  });

  describe('filtros de conteúdo', () => {
    it('ignora mensagens com conteúdo vazio', async () => {
      const msgs = [
        criarMensagem('user', ''),
        criarMensagem('user', 'válida'),
      ];
      const r = await converterMensagensParaLangChain(msgs);
      expect(r).toHaveLength(1);
    });

    it('ignora mensagens só com espaços em branco', async () => {
      const msgs = [
        criarMensagem('user', '   \n\t  '),
        criarMensagem('user', 'válida'),
      ];
      const r = await converterMensagensParaLangChain(msgs);
      expect(r).toHaveLength(1);
    });

    it('retorna array vazio para entrada vazia', async () => {
      const r = await converterMensagensParaLangChain([]);
      expect(r).toEqual([]);
    });
  });

  describe('janela deslizante (Estratégia 2)', () => {
    it('NÃO apara histórico curto que cabe no limite', async () => {
      const msgs = [
        criarMensagem('user', 'Pergunta curta'),
        criarMensagem('assistant', 'Resposta curta'),
      ];
      const r = await converterMensagensParaLangChain(msgs);
      expect(r).toHaveLength(2);
    });

    it('APARA histórico longo que excede o limite de tokens', async () => {
      // Cada msg ~5000 chars ≈ 1250 tokens; 10 msgs ≈ 12500 tokens >> 4000
      const msgs = Array.from({ length: 10 }, (_, i) =>
        criarMensagem(
          i % 2 === 0 ? 'user' : 'assistant',
          'a'.repeat(5000),
        ),
      );
      const r = await converterMensagensParaLangChain(msgs);
      expect(r.length).toBeLessThan(msgs.length);
    });

    it('preserva as mensagens MAIS RECENTES após apara', async () => {
      const msgs = Array.from({ length: 20 }, (_, i) =>
        criarMensagem(
          i % 2 === 0 ? 'user' : 'assistant',
          `MSG_${i}_${'x'.repeat(2000)}`,
        ),
      );
      const r = await converterMensagensParaLangChain(msgs);

      // A última (índice 19) DEVE estar presente
      const ultima = r[r.length - 1];
      expect(String(ultima.content)).toContain('MSG_19');

      // A primeira (índice 0) NÃO deve estar
      expect(r.every((m) => !String(m.content).includes('MSG_0_'))).toBe(true);
    });

    it('garante que primeira msg após trim seja HumanMessage', async () => {
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