// src/modules/ai/sse-response.util.ts
//
// Server-Sent Events javobi: `data: <json>` ... `data: [DONE]`.
// Birinchi elementni sarlavhalardan OLDIN kutamiz — shunda limit/ruxsat/provayder xatolari
// oddiy JSON xato (403/429/5xx) sifatida qaytadi. Oqim boshlangandan keyingi xato
// `event: error` sifatida yuboriladi. Mijoz uzilsa generator yopiladi (upstream so'rov bekor bo'ladi).
import { HttpException } from '@nestjs/common';
import type { Response } from 'express';

export async function streamSse<T>(
  res: Response,
  gen: AsyncGenerator<T>,
  toData: (value: T) => unknown,
): Promise<void> {
  let first: IteratorResult<T>;
  try {
    first = await gen.next();
  } catch (e) {
    await gen.return(undefined).catch(() => undefined);
    throw e; // Nest exception filter JSON javob qaytaradi (sarlavhalar hali yuborilmagan)
  }

  let aborted = false;
  res.on('close', () => {
    if (!res.writableEnded) {
      aborted = true; // mijoz to'xtatdi/uzildi
      void gen.return(undefined).catch(() => undefined);
    }
  });

  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // nginx/Render proksisi buferlamasin
  res.flushHeaders();

  try {
    let r = first;
    while (!r.done && !aborted) {
      res.write(`data: ${JSON.stringify(toData(r.value))}\n\n`);
      r = await gen.next();
    }
    if (!aborted) res.write('data: [DONE]\n\n');
  } catch (e) {
    if (!aborted) {
      const status = e instanceof HttpException ? e.getStatus() : 502;
      const body = e instanceof HttpException ? e.getResponse() : null;
      const message = typeof body === 'string' ? body : ((body as any)?.message ?? 'AI xizmati vaqtincha ishlamayapti');
      res.write(`event: error\ndata: ${JSON.stringify({ status, message })}\n\n`);
    }
  } finally {
    res.end();
  }
}
