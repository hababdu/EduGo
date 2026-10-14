import { extractJson, estimateTokens } from './ai.util';
import { parseSse } from './sse.util';

describe('extractJson', () => {
  it('oddiy JSON', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });
  it('```json``` to\'siqlarini olib tashlaydi', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
  it("atrofdagi ortiqcha matnni qirqadi", () => {
    expect(extractJson('Mana javob: {"a":[1,2]} umid qilaman yoqadi')).toEqual({ a: [1, 2] });
  });
  it('massiv qaytara oladi', () => {
    expect(extractJson('Natija:\n[{"q":1},{"q":2}]')).toEqual([{ q: 1 }, { q: 2 }]);
  });
  it("yaroqsiz bo'lsa xato tashlaydi", () => {
    expect(() => extractJson('umuman json emas')).toThrow();
  });
});

describe('estimateTokens', () => {
  it('~4 belgi = 1 token', () => {
    expect(estimateTokens('abcdefgh')).toBe(2);
  });
});

async function collect(chunks: string[]) {
  const enc = new TextEncoder();
  async function* body() {
    for (const c of chunks) yield enc.encode(c);
  }
  const out: any[] = [];
  for await (const m of parseSse(body())) out.push(m);
  return out;
}

describe('parseSse', () => {
  it("xabar chunk o'rtasida bo'linsa ham to'g'ri yig'iladi", async () => {
    const out = await collect(['event: a\ndata: {"x"', ':1}\n\nevent: b\ndata: 2\n\n']);
    expect(out).toEqual([
      { event: 'a', data: '{"x":1}' },
      { event: 'b', data: '2' },
    ]);
  });
  it('CRLF, izoh va ko\'p qatorli data', async () => {
    const out = await collect([': ping\r\n\r\ndata: bir\r\ndata: ikki\r\n\r\n']);
    expect(out).toEqual([{ event: undefined, data: 'bir\nikki' }]);
  });
  it("oxirgi bo'sh qator bo'lmasa ham oxirgi xabarni beradi", async () => {
    const out = await collect(['data: oxirgi']);
    expect(out).toEqual([{ event: undefined, data: 'oxirgi' }]);
  });
});

import { AiConfig } from './ai.config';

describe('AiConfig: super admin tanlovi', () => {
  const mk = (env: Record<string, string> = {}) =>
    new AiConfig({ get: (k: string) => env[k] } as any);

  it('standart asosiy AI — gemini; env undan ustun emas holatda ham ishlaydi', () => {
    expect(mk().primary).toBe('gemini');
    expect(mk({ AI_PROVIDER: 'groq' }).primary).toBe('groq');
  });

  it('super admin tanlovi env dan ustun; zaxira asosiy bilan bir xil bo\'lsa — yo\'q', () => {
    const c = mk({ AI_PROVIDER: 'groq', AI_FALLBACK_PROVIDER: 'anthropic' });
    c.applyOverrides({ primary: 'gemini', fallback: 'gemini' });
    expect(c.primary).toBe('gemini');
    expect(c.fallback).toBeNull();
    c.applyOverrides({ primary: 'gemini', fallback: 'none' });
    expect(c.fallback).toBeNull();
    c.applyOverrides({ primary: 'gemini', fallback: 'groq' });
    expect(c.fallback).toBe('groq');
  });

  it('model nomi: super admin > env > standart', () => {
    const c = mk({ GEMINI_MODEL_SMART: 'env-model' });
    expect(c.model('gemini', 'smart')).toBe('env-model');
    c.applyOverrides({ models: { gemini: { smart: 'gemini-2.5-pro' } } });
    expect(c.model('gemini', 'smart')).toBe('gemini-2.5-pro');
    expect(c.model('gemini', 'fast')).toBe('gemini-3.8-flash');
  });
});
