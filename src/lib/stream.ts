import { EventoStreamSSE } from '@/tipos/agente';

export async function* lerStreamSSE(
  response: Response
): AsyncGenerator<EventoStreamSSE> {
  if (!response.body) {
    throw new Error('Response sem body para leitura de stream');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');

  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();

      // Flush final do decoder para liberar caracteres multi-byte pendentes
      // (ex: acentos e caracteres especiais do português cortados entre chunks).
      buffer += done
        ? decoder.decode()                         // ← flush sem stream:true
        : decoder.decode(value, { stream: true }); // ← decodificação incremental

      // Separa os eventos pelo delimitador SSE padrão (linha dupla).
      const eventos = buffer.split('\n\n');

      // O último item pode ser um evento incompleto — mantém no buffer
      // para ser completado no próximo chunk.
      buffer = eventos.pop() ?? '';

      for (const bloco of eventos) {
        // SSE suporta múltiplas linhas por bloco (ex: "event:", "id:", "data:").
        // Procura especificamente a linha com o payload "data:".
        const linhaData = bloco
          .split('\n')
          .find((l) => l.startsWith('data: '));

        if (!linhaData) continue;

        // Remove o prefixo pela posição, não por substituição de string
        // (evita comportamento inesperado se o JSON contiver "data: " no valor).
        const json = linhaData.slice('data: '.length);

        try {
          const parsed: EventoStreamSSE = JSON.parse(json);
          yield parsed;
        } catch (err) {
          console.error('[lerStreamSSE] Erro ao parsear evento SSE:', err, { json });
        }
      }

      // Sai do loop apenas APÓS processar o buffer restante do chunk final.
      if (done) break;
    }
  } finally {
    // Garante liberação do reader mesmo em caso de erro ou abort do cliente.
    reader.releaseLock();
  }
}