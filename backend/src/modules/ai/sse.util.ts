// src/modules/ai/sse.util.ts
export interface SseMessage {
  event?: string;
  data: string;
}

/** fetch() javobining body'sidan Server-Sent Events xabarlarini ketma-ket o'qiydi. */
export async function* parseSse(body: any): AsyncGenerator<SseMessage> {
  const decoder = new TextDecoder();
  let buffer = '';

  const flush = function* (block: string): Generator<SseMessage> {
    let event: string | undefined;
    const data: string[] = [];
    for (const line of block.split('\n')) {
      if (!line || line.startsWith(':')) continue;
      const idx = line.indexOf(':');
      const field = idx === -1 ? line : line.slice(0, idx);
      let value = idx === -1 ? '' : line.slice(idx + 1);
      if (value.startsWith(' ')) value = value.slice(1);
      if (field === 'event') event = value;
      else if (field === 'data') data.push(value);
    }
    if (data.length) yield { event, data: data.join('\n') };
  };

  for await (const chunk of body) {
    buffer += typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true });
    buffer = buffer.replace(/\r\n/g, '\n');
    let idx: number;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      yield* flush(block);
    }
  }
  if (buffer.trim()) yield* flush(buffer);
}
