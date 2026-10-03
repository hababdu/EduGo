// src/modules/ai/ai.util.ts
import { UnprocessableEntityException } from '@nestjs/common';

/**
 * Model javobidan JSON ajratib oladi: ```json``` to'siqlarini olib tashlaydi,
 * atrofdagi ortiqcha matnni kesib tashlaydi.
 */
export function extractJson<T = unknown>(raw: string): T {
  let text = (raw ?? '').trim();
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  try {
    return JSON.parse(text) as T;
  } catch {
    /* pastda qirqib ko'ramiz */
  }

  const firstObj = text.indexOf('{');
  const firstArr = text.indexOf('[');
  const start =
    firstObj === -1 ? firstArr : firstArr === -1 ? firstObj : Math.min(firstObj, firstArr);
  const end = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));

  if (start !== -1 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1)) as T;
    } catch {
      /* quyida xato */
    }
  }
  // 422: frontend buni "AI javobini o'qib bo'lmadi" (PARSE) deb tushunadi va qayta urinishni taklif qiladi
  throw new UnprocessableEntityException("AI noto'g'ri formatda javob qaytardi");
}

/** Provayder usage qaytarmagan holatda taxminiy token soni (~4 belgi = 1 token). */
export function estimateTokens(value: unknown): number {
  const s = typeof value === 'string' ? value : JSON.stringify(value ?? '');
  return Math.ceil(s.length / 4);
}
