/* ============================================================
   SSE o'quvchi — fetch() javobining body'sidan Server-Sent Events
   bloklarini ketma-ket beradi. Iste'molchi `break` qilsa yoki
   xato bo'lsa, oqim yopiladi (server upstream so'rovni bekor qiladi).
   ============================================================ */
export interface SseFrame {
  event?: string;
  data: string;
}

function parseBlock(block: string): SseFrame | null {
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
  return data.length ? { event, data: data.join('\n') } : null;
}

export async function* readSseFrames(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<SseFrame> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
      let idx: number;
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const frame = parseBlock(buffer.slice(0, idx));
        buffer = buffer.slice(idx + 2);
        if (frame) yield frame;
      }
    }
    const tail = buffer.trim() ? parseBlock(buffer) : null;
    if (tail) yield tail;
  } finally {
    reader.cancel().catch(() => undefined);
  }
}
