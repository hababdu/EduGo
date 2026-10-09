import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiConfig } from '../ai.config';
import { AiAccessService } from './ai-access.service';
import { AiFeaturesService } from './ai-features.service';

const student = { id: 's1', telegramId: '1', role: 'STUDENT', status: 'ACTIVE' };
const teacher = { id: 't1', telegramId: '2', role: 'TEACHER', status: 'ACTIVE' };

const NOW = Date.now();
const session = (minutesAgo: number, durationMin: number) => ({
  startedAt: new Date(NOW - minutesAgo * 60_000),
  durationSeconds: durationMin * 60,
});

function build(opts: { material?: any; sessions?: any[]; env?: Record<string, string>; jsonReply?: any; streamText?: string[] } = {}) {
  const prisma: any = {
    testSession: { findMany: jest.fn().mockResolvedValue(opts.sessions ?? []) },
    user: { findUnique: jest.fn().mockResolvedValue({ firstName: 'Ali' }) },
  };
  const ai: any = {
    completeJson: jest.fn().mockResolvedValue(opts.jsonReply ?? {}),
    complete: jest.fn().mockResolvedValue({ text: '  Assalomu alaykum  ' }),
    stream: jest.fn().mockImplementation(async function* () {
      for (const t of opts.streamText ?? ['Sal', 'om']) yield { type: 'text', text: t };
      yield { type: 'done', response: {} };
    }),
  };
  const cfg = new AiConfig({ get: (k: string) => opts.env?.[k] } as unknown as ConfigService);
  const materialCtx: any = { build: jest.fn().mockResolvedValue(opts.material ?? { title: 'T', text: '', used: [], skipped: [] }) };
  const svc = new AiFeaturesService(ai, new AiAccessService(prisma), cfg, materialCtx);
  return { svc, ai, prisma, materialCtx };
}

describe('AiFeaturesService — anti-cheat', () => {
  const activeTest = [session(5, 30)]; // 5 daqiqa oldin boshlangan, 30 daqiqalik test -> hali davom etmoqda
  const expiredTest = [session(60, 30)]; // vaqti o'tib ketgan (status hali IN_PROGRESS bo'lishi mumkin)

  it('student test paytida repetitordan foydalana olmaydi (provayder chaqirilmaydi)', async () => {
    const { svc, ai } = build({ sessions: activeTest });
    await expect(svc.tutorStream(student, { history: [{ role: 'user', content: 'x' }] }).next()).rejects.toBeInstanceOf(ForbiddenException);
    expect(ai.stream).not.toHaveBeenCalled();
  });

  it('vaqti tugagan (eskirgan IN_PROGRESS) sessiya bloklamaydi', async () => {
    const { svc } = build({ sessions: expiredTest });
    const parts: string[] = [];
    for await (const t of svc.tutorStream(student, { history: [{ role: 'user', content: 'x' }] })) parts.push(t);
    expect(parts.join('')).toBe('Salom');
  });

  it("test paytida tavsiya va maskot bloklanadi", async () => {
    const { svc } = build({ sessions: activeTest });
    await expect(svc.recommendations(student, { results: [{ topic: 'A', scorePercent: 10 }] })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.mascot(student, { event: 'INACTIVITY', daysSinceLastActivity: 3 })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("grade: standartda test paytida ishlaydi (mavjud AIAnswerCheck saqlanadi)", async () => {
    const { svc } = build({ sessions: activeTest, jsonReply: { score: 80 } });
    expect((await svc.grade(student, { question: 'q', studentAnswer: 'a' })).score).toBe(80);
  });

  it("grade: AI_ALLOW_GRADE_DURING_TEST=false bo'lsa test paytida bloklanadi", async () => {
    const { svc } = build({ sessions: activeTest, env: { AI_ALLOW_GRADE_DURING_TEST: 'false' } });
    await expect(svc.grade(student, { question: 'q', studentAnswer: 'a' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("o'qituvchi uchun bazaga umuman murojaat qilinmaydi", async () => {
    const { svc, prisma } = build({ jsonReply: { title: 'T', description: 'D' } });
    await svc.material(teacher, { topic: 'Mavzu', category: 'LESSON' });
    expect(prisma.testSession.findMany).not.toHaveBeenCalled();
  });
});

describe('AiFeaturesService — funksiyalar', () => {
  it('questions: 4096 token, normalizatsiya va so\'ralgan soncha qirqish', async () => {
    const q = { text: 'Q', options: ['a', 'b', 'c', 'd'] };
    const { svc, ai } = build({ jsonReply: { questions: [q, q, q, q] } });
    const res = await svc.questions(teacher, { topic: 'T', count: 3, difficulty: 'EASY' });
    expect(res.questions).toHaveLength(3);
    const [, feature, req, tier] = ai.completeJson.mock.calls[0];
    expect(feature).toBe('generate-questions');
    expect(req.maxTokens).toBe(4096);
    expect(tier).toBe('fast');
  });

  it("mascot: ism mijozdan emas, bazadan olinadi", async () => {
    const { svc, ai } = build({ jsonReply: { text: 'Barakalla!', mood: 'happy' } });
    await svc.mascot(student, { event: 'TEST_RESULT', percent: 90, passed: true });
    const req = ai.completeJson.mock.calls[0][2];
    expect(req.messages[0].content).toContain("O'quvchi ismi: Ali");
  });

  it('parentMessage: oddiy matn qaytaradi (JSON emas), bo\'sh joylar qirqiladi', async () => {
    const { svc, ai } = build();
    expect(await svc.parentMessage(teacher, { studentName: 'Vali', context: 'yaxshi o\'qidi' })).toEqual({ message: 'Assalomu alaykum' });
    expect(ai.completeJson).not.toHaveBeenCalled();
  });

  it("chat: tarixdagi salomlashuv olib tashlanib provayderga uzatiladi, faqat matn yield qilinadi", async () => {
    const { svc, ai } = build();
    const out: string[] = [];
    for await (const t of svc.generalChatStream(teacher, {
      history: [
        { role: 'assistant', content: 'Salom!' },
        { role: 'user', content: 'Savol' },
      ],
    })) out.push(t);
    expect(out).toEqual(['Sal', 'om']);
    expect(ai.stream.mock.calls[0][2].messages).toEqual([{ role: 'user', content: 'Savol' }]);
  });
});

describe('AiFeaturesService — material asosida savollar', () => {
  const dto = { topic: 'T', count: 3, difficulty: 'MIXED' as const, assignmentId: 'a1' };

  it('material matni promptga <material> sifatida kiradi va manba qaytariladi', async () => {
    const text = 'Fotosintez — o\'simliklar yorug\'likdan energiya olish jarayoni. '.repeat(5);
    const { svc, ai } = build({
      material: { title: 'Biologiya', text, used: ['a.pdf'], skipped: [] },
      jsonReply: { questions: [{ text: 'q?', options: ['a', 'b'], correctAnswerIndex: 0 }] },
    });
    const res: any = await svc.questions(teacher, dto);
    const call = ai.completeJson.mock.calls[0][2];
    expect(call.messages[0].content).toContain('<material>');
    expect(call.system).toContain('FAQAT <material>');
    expect(res.source.used).toEqual(['a.pdf']);
  });

  it("matni yo'q material — 422, AI chaqirilmaydi", async () => {
    const { svc, ai } = build({ material: { title: 'T', text: 'qisqa', used: [], skipped: [] } });
    await expect(svc.questions(teacher, dto)).rejects.toThrow(/matn yo'q/);
    expect(ai.completeJson).not.toHaveBeenCalled();
  });
});
