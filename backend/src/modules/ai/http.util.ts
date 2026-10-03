// src/modules/ai/http.util.ts
import { AiProviderError } from './ai.types';

export interface PostResult {
  res: Response;
  /**
   * Timeout taymerini to'xtatadi va hali tugamagan so'rovni bekor qiladi
   * (stream oxirigacha o'qilmagan bo'lsa upstream ulanish yopiladi).
   * Javob/stream to'liq o'qib bo'lingach chaqiring.
   */
  release: () => void;
}

export function extractErrorMessage(text: string): string {
  try {
    const parsed = JSON.parse(text);
    const msg = parsed?.error?.message ?? parsed?.message;
    if (typeof msg === 'string' && msg) return msg.slice(0, 300);
  } catch {
    /* JSON emas */
  }
  return (text || 'Noma\'lum xato').slice(0, 300);
}

/** Har qanday xatoni AiProviderError'ga aylantiradi (timeout va tarmoq xatolari qayta urinsa bo'ladigan). */
export function toProviderError(e: unknown): AiProviderError {
  if (e instanceof AiProviderError) return e;
  const err = e as { name?: string; message?: string };
  if (err?.name === 'AbortError') {
    return new AiProviderError('Provayder o\'z vaqtida javob bermadi', {
      retryable: true,
      timeout: true,
    });
  }
  return new AiProviderError(`Tarmoq xatosi: ${err?.message ?? String(e)}`, {
    retryable: true,
  });
}

export async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  timeoutMs: number,
): Promise<PostResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const release = () => {
    clearTimeout(timer);
    controller.abort();
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    release();
    throw toProviderError(e);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    release();
    throw new AiProviderError(extractErrorMessage(text), {
      status: res.status,
      retryable: res.status === 429 || res.status >= 500,
    });
  }

  return { res, release };
}
