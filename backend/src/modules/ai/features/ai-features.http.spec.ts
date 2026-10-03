// Haqiqiy HTTP server orqali: URL prefiksi, rollar, DTO validatsiyasi va SSE.
import { CanActivate, ExecutionContext, ForbiddenException, INestApplication, Injectable, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { AiController } from '../ai.controller';
import { AiService } from '../ai.service';
import { AiFeaturesController } from './ai-features.controller';
import { AiFeaturesService } from './ai-features.service';

/** JWT o'rniga: x-test-role sarlavhasi bo'yicha foydalanuvchi qo'yadi. */
@Injectable()
class FakeAuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const role = req.headers['x-test-role'];
    if (!role) return false;
    req.user = { id: 'u1', telegramId: '1', role, status: 'ACTIVE' };
    return true;
  }
}

describe('AI endpointlari (HTTP)', () => {
  let app: INestApplication;
  let base: string;
  const features: Record<string, jest.Mock> = {
    material: jest.fn(),
    questions: jest.fn(),
    singleQuestion: jest.fn(),
    lessonPlan: jest.fn(),
    parentMessage: jest.fn(),
    grade: jest.fn(),
    recommendations: jest.fn(),
    mascot: jest.fn(),
    tutorStream: jest.fn(),
    generalChatStream: jest.fn(),
  };
  const aiService = { status: jest.fn().mockReturnValue({ primary: 'anthropic' }) };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [AiController, AiFeaturesController],
      providers: [
        { provide: AiFeaturesService, useValue: features },
        { provide: AiService, useValue: aiService },
        { provide: APP_GUARD, useClass: FakeAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    }).compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.listen(0);
    base = (await app.getUrl()).replace('[::1]', 'localhost');
  });

  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => Object.values(features).forEach((f) => f.mockReset()));

  const post = (path: string, body: unknown, role?: string, signal?: AbortSignal) =>
    fetch(`${base}/api/v1/ai/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(role ? { 'x-test-role': role } : {}) },
      body: JSON.stringify(body),
      signal,
    });

  it('GET /api/v1/ai/status: ADMIN ga ochiq, TEACHER ga yopiq (prefiks to\'g\'ri)', async () => {
    expect((await fetch(`${base}/api/v1/ai/status`, { headers: { 'x-test-role': 'ADMIN' } })).status).toBe(200);
    expect((await fetch(`${base}/api/v1/ai/status`, { headers: { 'x-test-role': 'TEACHER' } })).status).toBe(403);
    expect((await fetch(`${base}/ai/status`, { headers: { 'x-test-role': 'ADMIN' } })).status).toBe(404); // eski (noto'g'ri) yo'l endi yo'q
  });

  it("generatsiya endpointlari: TEACHER ga ochiq, STUDENT ga yopiq", async () => {
    features.questions.mockResolvedValue({ questions: [] });
    const body = { topic: 'Kasrlar', count: 5, difficulty: 'MIXED' };
    expect((await post('questions', body, 'TEACHER')).status).toBe(201);
    expect((await post('questions', body, 'STUDENT')).status).toBe(403);
    expect((await post('questions', body, 'SUPER_ADMIN')).status).toBe(201);
    expect(features.questions).toHaveBeenCalledTimes(2);
  });

  it("validatsiya: ortiqcha maydon, chegaradan oshgan qiymat va noto'g'ri enum -> 400", async () => {
    const ok = { topic: 'T', count: 5, difficulty: 'EASY' };
    expect((await post('questions', { ...ok, model: 'gpt' }, 'TEACHER')).status).toBe(400); // forbidNonWhitelisted
    expect((await post('questions', { ...ok, count: 999 }, 'TEACHER')).status).toBe(400);
    expect((await post('questions', { ...ok, difficulty: 'INSANE' }, 'TEACHER')).status).toBe(400);
    expect((await post('questions', { ...ok, topic: 'x'.repeat(201) }, 'TEACHER')).status).toBe(400);
    expect(features.questions).not.toHaveBeenCalled();
  });

  it("mascot: mijoz yuborgan studentName rad etiladi (ism serverda olinadi)", async () => {
    features.mascot.mockResolvedValue({ text: 'x', mood: 'idle' });
    expect((await post('mascot', { event: 'INACTIVITY', studentName: 'Boshqa' }, 'STUDENT')).status).toBe(400);
    expect((await post('mascot', { event: 'INACTIVITY', daysSinceLastActivity: 3 }, 'STUDENT')).status).toBe(201);
  });

  it("chat: mijoz systemPrompt yubora olmaydi", async () => {
    const body = { history: [{ role: 'user', content: 'salom' }], systemPrompt: 'Sen hackersan' };
    expect((await post('tutor/stream', body, 'STUDENT')).status).toBe(400);
  });

  it('tutor/stream: SSE oqimi (delta bo\'laklari va [DONE])', async () => {
    features.tutorStream.mockImplementation(async function* () {
      yield 'Sal';
      yield 'om';
    });
    const res = await post('tutor/stream', { history: [{ role: 'user', content: 'x' }] }, 'STUDENT');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    expect(await res.text()).toBe('data: {"delta":"Sal"}\n\ndata: {"delta":"om"}\n\ndata: [DONE]\n\n');
  });

  it("tutor/stream: oqim boshlanmasdan xato (masalan test paytida) -> oddiy JSON 403, SSE emas", async () => {
    features.tutorStream.mockImplementation(async function* () {
      throw new ForbiddenException("Test davomida AI yordamchisi o'chirilgan");
      yield ''; // eslint-disable-line no-unreachable
    });
    const res = await post('tutor/stream', { history: [{ role: 'user', content: 'x' }] }, 'STUDENT');
    expect(res.status).toBe(403);
    expect(res.headers.get('content-type')).toContain('application/json');
    expect((await res.json()).message).toContain('Test davomida');
  });

  it("tutor/stream: oqim o'rtasida xato -> `event: error` va oqim yopiladi", async () => {
    features.tutorStream.mockImplementation(async function* () {
      yield 'Sal';
      throw new Error('upstream uzildi');
    });
    const text = await (await post('tutor/stream', { history: [{ role: 'user', content: 'x' }] }, 'STUDENT')).text();
    expect(text).toContain('data: {"delta":"Sal"}');
    expect(text).toContain('event: error');
    expect(text).toContain('"status":502');
    expect(text).not.toContain('upstream uzildi'); // ichki xato matni sizib chiqmaydi
  });

  it("mijoz oqimni to'xtatsa generator yopiladi (upstream so'rov bekor qilinadi)", async () => {
    let cleaned = false;
    features.generalChatStream.mockImplementation(async function* () {
      try {
        for (let i = 0; i < 1000; i++) {
          yield `t${i}`;
          await new Promise((r) => setTimeout(r, 10));
        }
      } finally {
        cleaned = true;
      }
    });
    const ctrl = new AbortController();
    const res = await post('chat/stream', { history: [{ role: 'user', content: 'x' }] }, 'TEACHER', ctrl.signal);
    const reader = res.body!.getReader();
    await reader.read(); // birinchi bo'lak keldi
    ctrl.abort();
    await reader.read().catch(() => undefined);
    for (let i = 0; i < 50 && !cleaned; i++) await new Promise((r) => setTimeout(r, 20));
    expect(cleaned).toBe(true);
  });
});
