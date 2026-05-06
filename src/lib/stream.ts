import { EventoStreamSSE } from '@/tipos/agente';

export async function* lerStreamSSE(
  response: Response,
  signal?: AbortSignal
): AsyncGenerator<EventoStreamSSE> {
  if (!response.body) {
    throw new Error('Response sem body para leitura de stream');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      if (signal?.aborted) {
        await reader.cancel();
        break;
      }

      const { value, done } = await reader.read();

      if (done) {
        // flush final do decoder (importante!)
        buffer += decoder.decode();
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      const eventos = buffer.split(/\r?\n\r?\n/);
      buffer = eventos.pop() || '';

      for (const evento of eventos) {
        const linhas = evento.split(/\r?\n/);
        let dataAcumulado = '';

        for (const linha of linhas) {
          if (!linha || linha.startsWith(':')) continue;

          if (linha.startsWith('data:')) {
            // suporta "data:" com ou sem espaço
            const conteudo = linha.slice(5).trimStart();
            dataAcumulado += conteudo + '\n';
          }
        }

        if (!dataAcumulado) continue;

        const trimData = dataAcumulado.trim();

        if (trimData === '[DONE]') {
          return;
        }

        try {
          const parsed: EventoStreamSSE = JSON.parse(trimData);
          yield parsed;
        } catch (err) {
          // mantém no buffer se parecer incompleto
          buffer = trimData + '\n\n' + buffer;
          console.warn('JSON incompleto, aguardando mais chunks...');
        }
      }
    }

    // tenta processar resto do buffer após o loop
    if (buffer.trim()) {
      try {
        const parsed: EventoStreamSSE = JSON.parse(buffer.trim());
        yield parsed;
      } catch {
        // ignora lixo final
      }
    }
  } finally {
    reader.releaseLock();
  }
}