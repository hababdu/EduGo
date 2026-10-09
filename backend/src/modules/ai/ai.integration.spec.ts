// To'liq zanjir: HTTP -> AiFeaturesController -> AiFeaturesService -> AiService -> provayder -> SOXTA Anthropic/Groq serveri.
import { CanActivate, ExecutionContext, INestApplication, Injectable, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import * as http from 'node:http';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { AiConfig } from './ai.config';
import { AiService } from './ai.service';
import { AiUsageService } from './ai-usage.service';
import { AiAccessService } from './features/ai-access.service';
import { AiFeaturesController } from './features/ai-features.controller';
import { MaterialContextService } from '../materials/material-context.service';
import { AiFeaturesService } from './features/ai-features.service';
import { AnthropicProvider } from './providers/anthropic.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { GroqProvider } from './providers/groq.provider';

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

const sse = (events: Array<[string, unknown]>) => events.map(([e, d]) => `event: ${e}\ndata: ${JSON.stringify(d)}\n\n`).join('');

function anthropicStream(text: string[]) {
  return sse([
    ['message_start', { type: 'message_start', message: { model: 'claude-haiku-4-5-20251001', usage: { input_tokens: 42, output_tokens: 1 } } }],
    ['content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } }],
    ...text.map((t): [string, unknown] => ['content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: t } }]),
    ['content_block_stop', { type: 'content_block_stop', index: 0 }],
    ['message_delta', { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 9 } }],
    ['message_stop', { type: 'message_stop' }],
  ]);
}

describe('AI zanjiri (soxta provayder serverlari bilan)', () => {
  let app: INestApplication;
  let base: string;
  let anthropicSrv: http.Server;
  let groqSrv: http.Server;
  const anthropicSeen: any[] = [];
  const groqSeen: any[] = [];
  let anthropicHandler: (req: http.IncomingMessage, res: http.ServerResponse, body: any) => void;
  let groqHandler: (req: http.IncomingMessage, res: http.ServerResponse, body: any) => void;
  let env: Record<string, string>;
  let sessions: any[];
  let usedTokens: number;
  const usageCreate = jest.fn();

  const listen = (handler: () => any, seen: any[]) =>
    new Promise<http.Server>((resolve) => {
      const s = http.createServer((req, res) => {
        let raw = '';
        req.on('data', (c) => (raw += c));
        req.on('end', () => {
          const body = raw ? JSON.parse(raw) : undefined;
          seen.push({ url: req.url, headers: req.headers, body });
          handler()(req, res, body);
        });
      });
      s.listen(0, '127.0.0.1', () => resolve(s));
    });
  const port = (s: http.Server) => (s.address() as any).port;

  beforeAll(async () => {
    anthropicSrv = await listen(() => anthropicHandler, anthropicSeen);
    groqSrv = await listen(() => groqHandler, groqSeen);

    const prisma = {
      aiUsage: {
        aggregate: jest.fn().mockImplementation(async () => ({ _sum: { inputTokens: usedTokens, outputTokens: 0 } })),
        create: usageCreate,
      },
      testSession: { findMany: jest.fn().mockImplementation(async () => sessions) },
      user: { findUnique: jest.fn().mockResolvedValue({ firstName: 'Ali' }) },
    };
    const mod = await Test.createTestingModule({
      controllers: [AiFeaturesController],
      providers: [
        { provide: ConfigService, useValue: { get: (k: string) => env[k] } },
        { provide: PrismaService, useValue: prisma },
        AiConfig, AiUsageService, AnthropicProvider, GroqProvider, GeminiProvider, AiService, AiAccessService, AiFeaturesService,
        { provide: MaterialContextService, useValue: { build: jest.fn() } },
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
    anthropicSrv.closeAllConnections?.();
    groqSrv.closeAllConnections?.();
    anthropicSrv.close();
    groqSrv.close();
  });

  beforeEach(() => {
    anthropicSeen.length = 0;
    groqSeen.length = 0;
    usageCreate.mockReset().mockResolvedValue({});
    sessions = [];
    usedTokens = 0;
    env = {
      AI_PROVIDER: 'anthropic',
      ANTHROPIC_API_KEY: 'sk-ant-test',
      ANTHROPIC_BASE_URL: `http://127.0.0.1:${port(anthropicSrv)}`,
    };
  });

  const post = (path: string, body: unknown, role: string) =>
    fetch(`${base}/api/v1/ai/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-test-role': role },
      body: JSON.stringify(body),
    });

  const anthropicJson = (text: string) => (_r: any, res: http.ServerResponse) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ model: 'claude-haiku-4-5-20251001', stop_reason: 'end_turn', content: [{ type: 'text', text }], usage: { input_tokens: 100, output_tokens: 50 } }));
  };

  it('savollar generatsiyasi: Anthropic\'ga to\'g\'ri so\'rov ketadi, ```json``` bilan kelgan javob tozalanib qaytadi, xarajat yoziladi', async () => {
    anthropicHandler = anthropicJson('```json\n{"questions":[{"text":"2+2?","difficulty":"EASY","options":["3","4","5","6"],"correctAnswerIndex":1},{"text":"","options":[]}]}\n```');
    const res = await post('questions', { topic: 'Qo\'shish', count: 5, difficulty: 'EASY' }, 'TEACHER');
    expect(res.status).toBe(201);
    expect((await res.json()).questions).toEqual([{ text: '2+2?', difficulty: 'EASY', points: 1, options: ['3', '4', '5', '6'], correctAnswerIndex: 1 }]);

    const req = anthropicSeen[0];
    expect(req.url).toBe('/v1/messages');
    expect(req.headers['x-api-key']).toBe('sk-ant-test');
    expect(req.headers['anthropic-version']).toBe('2023-06-01');
    expect(req.body.model).toBe('claude-haiku-4-5-20251001'); // 'fast' daraja
    expect(req.body.max_tokens).toBe(4096);
    expect(req.body.system).toContain('JSON');
    expect(req.body.messages).toEqual([{ role: 'user', content: expect.stringContaining('Aynan 5 ta savol') }]);
    expect(usageCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ feature: 'generate-questions', provider: 'anthropic', inputTokens: 100, outputTokens: 50, userId: 'u1' }) });
  });

  it('repetitor stream: Anthropic SSE -> backend SSE; ism va zaif mavzular system prompt\'ga tushadi; salomlashuv tarixdan olib tashlanadi', async () => {
    anthropicHandler = (_r, res) => { res.writeHead(200, { 'content-type': 'text/event-stream' }); res.end(anthropicStream(['Keling ', 'birga ', 'o\'ylaymiz'])); };
    const res = await post('tutor/stream', { history: [{ role: 'assistant', content: 'Salom!' }, { role: 'user', content: 'Kasr nima?' }], weakTopics: ['Kasrlar'] }, 'STUDENT');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    const text = await res.text();
    expect(text).toBe('data: {"delta":"Keling "}\n\ndata: {"delta":"birga "}\n\ndata: {"delta":"o\'ylaymiz"}\n\ndata: [DONE]\n\n');

    const req = anthropicSeen[0];
    expect(req.body.stream).toBe(true);
    expect(req.body.model).toBe('claude-sonnet-5-5'); // 'smart' daraja
    expect(req.body.system).toContain('Ali');
    expect(req.body.system).toContain('Kasrlar');
    expect(req.body.messages).toEqual([{ role: 'user', content: 'Kasr nima?' }]);
    expect(usageCreate).toHaveBeenCalledTimes(1);
    expect(usageCreate.mock.calls[0][0].data).toMatchObject({ feature: 'tutor', inputTokens: 42, outputTokens: 9 });
  });

  it("zaxira: Anthropic 529 (band) bersa Groq'ga o'tadi va foydalanuvchi buni sezmaydi", async () => {
    env.AI_FALLBACK_PROVIDER = 'groq';
    env.GROQ_API_KEY = 'gsk-test';
    env.GROQ_BASE_URL = `http://127.0.0.1:${port(groqSrv)}`;
    anthropicHandler = (_r, res) => { res.writeHead(529, { 'content-type': 'application/json' }); res.end('{"error":{"type":"overloaded_error","message":"Overloaded"}}'); };
    groqHandler = (_r, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ model: 'openai/gpt-oss-20b', choices: [{ finish_reason: 'stop', message: { content: '{"title":"Kasrlar","description":"Tavsif","searchQuery":"kasrlar dars"}' } }], usage: { prompt_tokens: 30, completion_tokens: 20 } }));
    };
    const res = await post('material', { topic: 'Kasrlar', category: 'LESSON' }, 'TEACHER');
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ title: 'Kasrlar', description: 'Tavsif', youtubeSearchUrl: 'https://www.youtube.com/results?search_query=kasrlar%20dars' });
    expect(anthropicSeen).toHaveLength(1);
    expect(groqSeen[0].headers.authorization).toBe('Bearer gsk-test');
    expect(groqSeen[0].body.model).toBe('openai/gpt-oss-20b');
    expect(groqSeen[0].body.response_format).toEqual({ type: 'json_object' });
    expect(usageCreate.mock.calls[0][0].data).toMatchObject({ provider: 'groq', inputTokens: 30, outputTokens: 20 });
  });

  it("Anthropic kaliti noto'g'ri (401) bo'lsa zaxiraga O'TILMAYDI; foydalanuvchiga sir ochilmaydi", async () => {
    env.AI_FALLBACK_PROVIDER = 'groq'; env.GROQ_API_KEY = 'gsk'; env.GROQ_BASE_URL = `http://127.0.0.1:${port(groqSrv)}`;
    anthropicHandler = (_r, res) => { res.writeHead(401, { 'content-type': 'application/json' }); res.end('{"error":{"message":"invalid x-api-key: sk-ant-test"}}'); };
    const res = await post('material', { topic: 'T', category: 'LESSON' }, 'TEACHER');
    expect(res.status).toBe(502);
    const body = JSON.stringify(await res.json());
    expect(body).not.toContain('sk-ant');
    expect(groqSeen).toHaveLength(0);
  });

  it("provayder JSON o'rniga matn qaytarsa -> 422 (frontend PARSE)", async () => {
    anthropicHandler = anthropicJson('Kechirasiz, bunga javob bera olmayman.');
    expect((await post('questions', { topic: 'T', count: 2, difficulty: 'EASY' }, 'TEACHER')).status).toBe(422);
  });

  it("test paytida student uchun repetitor: 403 JSON, provayderga UMUMAN so'rov ketmaydi", async () => {
    sessions = [{ startedAt: new Date(Date.now() - 60_000), durationSeconds: 1800 }];
    anthropicHandler = () => { throw new Error('chaqirilmasligi kerak edi'); };
    const res = await post('tutor/stream', { history: [{ role: 'user', content: 'javobni ayt' }] }, 'STUDENT');
    expect(res.status).toBe(403);
    expect(res.headers.get('content-type')).toContain('application/json');
    expect(anthropicSeen).toHaveLength(0);
  });

  it("kunlik limit tugagan student: 429, provayderga so'rov ketmaydi", async () => {
    usedTokens = 30_000; // STUDENT standart limiti
    const res = await post('mascot', { event: 'INACTIVITY', daysSinceLastActivity: 4 }, 'STUDENT');
    expect(res.status).toBe(429);
    expect(anthropicSeen).toHaveLength(0);
  });

  it("kalit sozlanmagan bo'lsa 503 (frontend NO_API_KEY)", async () => {
    delete env.ANTHROPIC_API_KEY;
    expect((await post('questions', { topic: 'T', count: 2, difficulty: 'EASY' }, 'TEACHER')).status).toBe(503);
  });

  it("stream boshlangach Anthropic uzilsa -> `event: error`, ichki matn sizmaydi, sarflangan tokenlar baribir hisoblanadi", async () => {
    anthropicHandler = (_r, res) => {
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      res.write(sse([
        ['message_start', { type: 'message_start', message: { usage: { input_tokens: 10, output_tokens: 1 } } }],
        ['content_block_start', { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } }],
        ['content_block_delta', { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Yarim javob' } }],
        ['error', { type: 'error', error: { type: 'overloaded_error', message: 'Overloaded (ichki)' } }],
      ]));
      res.end();
    };
    const text = await (await post('chat/stream', { history: [{ role: 'user', content: 'x' }] }, 'TEACHER')).text();
    expect(text).toContain('"delta":"Yarim javob"');
    expect(text).toContain('event: error');
    expect(text).not.toContain('ichki');
    expect(usageCreate).toHaveBeenCalledTimes(1); // taxminiy hisob
  });
});
