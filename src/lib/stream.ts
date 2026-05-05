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

  while (true) {
    const { value, done } = await reader.read();

    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const eventos = buffer.split('\n\n');
    buffer = eventos.pop() || '';

    for (const evento of eventos) {
      const linha = evento.trim();

      if (!linha.startsWith('data: ')) continue;

      const json = linha.replace('data: ', '');

      try {
        const parsed: EventoStreamSSE = JSON.parse(json);
        yield parsed;
      } catch (err) {
        console.error('Erro ao parsear evento SSE:', err);
      }
    }
  }
}