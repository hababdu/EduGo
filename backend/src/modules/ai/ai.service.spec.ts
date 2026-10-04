import { HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiConfig } from './ai.config';
import { AiService } from './ai.service';
import { AiUsageService } from './ai-usage.service';
import { AiProvider, AiProviderError, AiResponse, AiStreamEvent } from './ai.types';

const user = { id: 'u1', telegramId: '1', role: 'STUDENT', status: 'ACTIVE' };

const okResponse = (text: string): AiResponse => ({
  text,
  content: [{ type: 'text', text }],
  toolCalls: [],
  stopReason: 'end',
  usage: { inputTokens: 10, outputTokens: 5 },
  model: 'm',
});

function fakeProvider(name: 'anthropic' | 'groq' | 'gemini', opts: { configured?: boolean; complete?: () => Promise<AiResponse>; stream?: () => AsyncGenerator<AiStreamEvent> }): AiProvider {
  return {
    name,
    isConfigured: () => opts.configured ?? true,
    complete: opts.complete ?? (async () => okResponse(name)),
    stream: opts.stream ?? (async function* () { yield { type: 'done', response: okResponse(name) }; }),
  };
}

function build(env: Record<string, string>, a: AiProvider, g: AiProvider, prismaSum = 0) {
  const cfg = new AiConfig({ get: (k: string) => env[k] } as unknown as ConfigService);
  const prisma: any = {
    aiUsage: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { inputTokens: prismaSum, outputTokens: 0 } }),
      create: jest.fn().mockResolvedValue({}),
    },
  };
  const usage = new AiUsageService(prisma, cfg);
  const svc = new AiService(cfg, usage, a as any, g as any, fakeProvider('gemini', { configured: false }) as any);
  return { svc, prisma };
}

const retryable = () => new AiProviderError('503', { status: 503, retryable: true });

describe('AiService', () => {
  it('asosiy provayder ishlasa — zaxiraga tegmaydi va xarajatni yozadi', async () => {
    const { svc, prisma } = build({ AI_PROVIDER: 'anthropic', AI_FALLBACK_PROVIDER: 'groq' }, fakeProvider('anthropic', {}), fakeProvider('groq', {}));
    const res = await svc.complete(user, 'test', { messages: [] });
    expect(res.text).toBe('anthropic');
    expect(prisma.aiUsage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: 'u1', feature: 'test', provider: 'anthropic', inputTokens: 10, outputTokens: 5 }),
    });
  });

  it("retryable xatoda zaxira provayderga o'tadi", async () => {
    const { svc } = build(
      { AI_PROVIDER: 'anthropic', AI_FALLBACK_PROVIDER: 'groq' },
      fakeProvider('anthropic', { complete: async () => { throw retryable(); } }),
      fakeProvider('groq', {}),
    );
    expect((await svc.complete(user, 't', { messages: [] })).text).toBe('groq');
  });

  it("retryable BO'LMAGAN xatoda (masalan 401) zaxiraga o'tmaydi va sirsiz xato beradi", async () => {
    const groqSpy = jest.fn();
    const { svc } = build(
      { AI_PROVIDER: 'anthropic', AI_FALLBACK_PROVIDER: 'groq' },
      fakeProvider('anthropic', { complete: async () => { throw new AiProviderError('invalid x-api-key sk-secret', { status: 401 }); } }),
      fakeProvider('groq', { complete: async () => { groqSpy(); return okResponse('groq'); } }),
    );
    const err: HttpException = await svc.complete(user, 't', { messages: [] }).catch((e) => e);
    expect(err.getStatus()).toBe(502);
    expect(JSON.stringify(err.getResponse())).not.toContain('sk-secret');
    expect(groqSpy).not.toHaveBeenCalled();
  });

  it("sozlanmagan asosiy provayderni o'tkazib, sozlangan zaxiradan foydalanadi", async () => {
    const { svc } = build(
      { AI_PROVIDER: 'anthropic', AI_FALLBACK_PROVIDER: 'groq' },
      fakeProvider('anthropic', { configured: false }),
      fakeProvider('groq', {}),
    );
    expect((await svc.complete(user, 't', { messages: [] })).text).toBe('groq');
  });

  it('hech bir provayder sozlanmagan bo\'lsa 503', async () => {
    const { svc } = build({}, fakeProvider('anthropic', { configured: false }), fakeProvider('groq', { configured: false }));
    const err: HttpException = await svc.complete(user, 't', { messages: [] }).catch((e) => e);
    expect(err.getStatus()).toBe(503);
  });

  it('kunlik limit oshgan bo\'lsa 429 va provayder chaqirilmaydi', async () => {
    const spy = jest.fn();
    const { svc } = build(
      { AI_DAILY_TOKENS_STUDENT: '100' },
      fakeProvider('anthropic', { complete: async () => { spy(); return okResponse('x'); } }),
      fakeProvider('groq', {}),
      100,
    );
    const err: HttpException = await svc.complete(user, 't', { messages: [] }).catch((e) => e);
    expect(err.getStatus()).toBe(429);
    expect(spy).not.toHaveBeenCalled();
  });

  it('limit 0 (SUPER_ADMIN) — cheklanmagan, hisob so\'ralmaydi', async () => {
    const { svc, prisma } = build({}, fakeProvider('anthropic', {}), fakeProvider('groq', {}), 999_999);
    await svc.complete({ ...user, role: 'SUPER_ADMIN' }, 't', { messages: [] });
    expect(prisma.aiUsage.aggregate).not.toHaveBeenCalled();
  });

  it("stream: hech narsa yuborilmasdan xato bo'lsa zaxiraga o'tadi", async () => {
    const { svc } = build(
      { AI_PROVIDER: 'anthropic', AI_FALLBACK_PROVIDER: 'groq' },
      fakeProvider('anthropic', { stream: async function* () { throw retryable(); } }),
      fakeProvider('groq', {}),
    );
    const evs: AiStreamEvent[] = [];
    for await (const e of svc.stream(user, 't', { messages: [] })) evs.push(e);
    expect((evs[evs.length - 1] as any).response.text).toBe('groq');
  });

  it("stream: yarim javobdan keyin xato bo'lsa zaxiraga O'TMAYDI", async () => {
    const groqSpy = jest.fn();
    const { svc } = build(
      { AI_PROVIDER: 'anthropic', AI_FALLBACK_PROVIDER: 'groq' },
      fakeProvider('anthropic', {
        stream: async function* () {
          yield { type: 'text', text: 'Sal' };
          throw retryable();
        },
      }),
      fakeProvider('groq', { stream: async function* () { groqSpy(); } }),
    );
    const got: AiStreamEvent[] = [];
    await expect(
      (async () => { for await (const e of svc.stream(user, 't', { messages: [] })) got.push(e); })(),
    ).rejects.toBeInstanceOf(HttpException);
    expect(got).toHaveLength(1);
    expect(groqSpy).not.toHaveBeenCalled();
  });

  it('completeJson: JSON ni ajratib beradi va system ga JSON talabini qo\'shadi', async () => {
    let seenSystem = '';
    const { svc } = build(
      {},
      fakeProvider('anthropic', {
        complete: async () => okResponse('```json\n{"questions":[1,2]}\n```'),
      }),
      fakeProvider('groq', {}),
    );
    const orig = (svc as any).providers.anthropic.complete;
    (svc as any).providers.anthropic.complete = async (req: any, m: string) => { seenSystem = req.system; return orig(req, m); };
    expect(await svc.completeJson<{ questions: number[] }>(user, 't', { system: 'Savol tuz', messages: [] })).toEqual({ questions: [1, 2] });
    expect(seenSystem).toContain('Savol tuz');
    expect(seenSystem).toContain('JSON');
  });

  it("startOfToday: Toshkent (+5) yarim tunida chegara to'g'ri", () => {
    const { svc } = build({ AI_TZ_OFFSET_HOURS: '5' }, fakeProvider('anthropic', {}), fakeProvider('groq', {}));
    const usage = new AiUsageService({} as any, new AiConfig({ get: (k: string) => ({ AI_TZ_OFFSET_HOURS: '5' } as any)[k] } as any));
    // 2026-09-30 21:30 UTC == 2026-10-01 02:30 Toshkent -> kun boshi 2026-09-30 19:00 UTC
    expect(usage.startOfToday(Date.UTC(2026, 8, 30, 21, 30)).toISOString()).toBe('2026-09-30T19:00:00.000Z');
    expect(svc).toBeDefined();
  });
});

describe('AiService — stream bekor qilinganda hisob', () => {
  it("foydalanuvchi to'xtatsa ham sarflangan tokenlar taxminan yoziladi", async () => {
    const provider = fakeProvider('anthropic', {
      stream: async function* () {
        yield { type: 'text', text: 'a'.repeat(40) };
        yield { type: 'text', text: 'b'.repeat(40) };
        yield { type: 'done', response: okResponse('x') };
      },
    });
    const { svc, prisma } = build({ AI_PROVIDER: 'anthropic' }, provider, fakeProvider('groq', {}));
    const gen = svc.stream(user, 'tutor', { messages: [{ role: 'user', content: 'salom' }] });
    await gen.next(); // 40 belgi keldi
    await gen.return(undefined); // mijoz to'xtatdi
    expect(prisma.aiUsage.create).toHaveBeenCalledTimes(1);
    const data = prisma.aiUsage.create.mock.calls[0][0].data;
    expect(data.outputTokens).toBe(10); // 40 belgi / 4
    expect(data.inputTokens).toBeGreaterThan(0);
  });

  it("stream to'liq tugasa — faqat BIR marta (haqiqiy usage bilan) yoziladi", async () => {
    const { svc, prisma } = build({}, fakeProvider('anthropic', {}), fakeProvider('groq', {}));
    for await (const _ of svc.stream(user, 't', { messages: [] })) void _;
    expect(prisma.aiUsage.create).toHaveBeenCalledTimes(1);
    expect(prisma.aiUsage.create.mock.calls[0][0].data.inputTokens).toBe(10);
  });
});
