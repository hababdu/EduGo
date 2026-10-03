// To'liq zanjir: HTTP -> AssistantController -> AssistantService -> AiService -> provayder -> SOXTA Anthropic/Groq serveri
// (tool_use oqimi bilan) -> AssistantToolRegistry -> (soxta) servislar.
import { CanActivate, ExecutionContext, INestApplication, Injectable, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import * as http from 'node:http';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PrismaService } from '../../../prisma/prisma.service';
import { AiConfig } from '../ai.config';
import { AiService } from '../ai.service';
import { AiUsageService } from '../ai-usage.service';
import { AiAccessService } from '../features/ai-access.service';
import { AnthropicProvider } from '../providers/anthropic.provider';
import { GroqProvider } from '../providers/groq.provider';
import { AuditService } from '../../admin/audit/audit.service';
import { AssistantActionService } from './assistant-action.service';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';
import { AssistantToolRegistry } from './assistant-tool.registry';

@Injectable()
class FakeAuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const role = req.headers['x-test-role'];
    if (!role) return false;
    req.user = { id: req.headers['x-test-uid'] ?? 'u1', telegramId: '1', role, status: 'ACTIVE' };
    return true;
  }
}

/** Xotiradagi soxta AssistantAction jadvali (shartli updateMany — atomik "egallash"ni taqlid qiladi) */
function fakeActionTable() {
  const rows: any[] = [];
  let n = 0;
  const match = (r: any, where: any) => Object.entries(where).every(([k, v]: [string, any]) => (v && typeof v === 'object' && 'gt' in v ? r[k] > v.gt : r[k] === v));
  return {
    rows,
    delegate: {
      create: async ({ data }: any) => { const r = { id: `act${String(++n).padStart(10, '0')}`, status: 'PENDING', error: null, createdAt: new Date(), resolvedAt: null, ...data }; rows.push(r); return { ...r }; },
      findFirst: async ({ where }: any) => { const r = rows.find((x) => match(x, where)); return r ? { ...r } : null; },
      findMany: async ({ where, take }: any) => rows.filter((x) => match(x, where)).slice(0, take ?? 1e9).map((r) => ({ ...r })),
      count: async ({ where }: any) => rows.filter((x) => match(x, where)).length,
      update: async ({ where, data }: any) => { const r = rows.find((x) => x.id === where.id)!; Object.assign(r, data); return { ...r }; },
      updateMany: async ({ where, data }: any) => { const hit = rows.filter((x) => match(x, where)); hit.forEach((r) => Object.assign(r, data)); return { count: hit.length }; },
    },
  };
}

const STUDENT_ID = 'cmstudent1234567890abcdef';
const sse = (events: Array<[string, unknown]>) => events.map(([e, d]) => `event: ${e}\ndata: ${JSON.stringify(d)}\n\n`).join('');
const A = (type: string, extra: object = {}) => [type, { type, ...extra }] as [string, unknown];

/** Anthropic: matn + tool_use oqimi */
const anthropicToolUse = (text: string, id: string, name: string, jsonParts: string[]) =>
  sse([
    A('message_start', { message: { model: 'claude-sonnet-5-5', usage: { input_tokens: 50, output_tokens: 1 } } }),
    A('content_block_start', { index: 0, content_block: { type: 'text', text: '' } }),
    A('content_block_delta', { index: 0, delta: { type: 'text_delta', text } }),
    A('content_block_stop', { index: 0 }),
    A('content_block_start', { index: 1, content_block: { type: 'tool_use', id, name } }),
    ...jsonParts.map((p) => A('content_block_delta', { index: 1, delta: { type: 'input_json_delta', partial_json: p } })),
    A('content_block_stop', { index: 1 }),
    A('message_delta', { delta: { stop_reason: 'tool_use' }, usage: { output_tokens: 20 } }),
    A('message_stop'),
  ]);

const anthropicText = (parts: string[]) =>
  sse([
    A('message_start', { message: { model: 'claude-sonnet-5-5', usage: { input_tokens: 90, output_tokens: 1 } } }),
    A('content_block_start', { index: 0, content_block: { type: 'text', text: '' } }),
    ...parts.map((t) => A('content_block_delta', { index: 0, delta: { type: 'text_delta', text: t } })),
    A('content_block_stop', { index: 0 }),
    A('message_delta', { delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 12 } }),
    A('message_stop'),
  ]);

describe("Yordamchi zanjiri (soxta provayder serverlari bilan)", () => {
  let app: INestApplication;
  let base: string;
  let anthropicSrv: http.Server;
  let groqSrv: http.Server;
  const anthropicSeen: any[] = [];
  const groqSeen: any[] = [];
  let anthropicHandler: (body: any, res: http.ServerResponse) => void;
  let groqHandler: (body: any, res: http.ServerResponse) => void;
  let env: Record<string, string>;
  let sessions: any[];
  const usageCreate = jest.fn();
  const table = fakeActionTable();
  const audit = { log: jest.fn() };
  const services = {
    data: { myResults: jest.fn() },
    overview: { getOverview: jest.fn() },
    students: { getDetail: jest.fn(), adjustScore: jest.fn(), setBlocked: jest.fn(), list: jest.fn() },
  };

  const listen = (get: () => (b: any, r: http.ServerResponse) => void, seen: any[]) =>
    new Promise<http.Server>((resolve) => {
      const s = http.createServer((req, res) => {
        let raw = '';
        req.on('data', (c) => (raw += c));
        req.on('end', () => {
          const body = JSON.parse(raw);
          seen.push({ url: req.url, body });
          get()(body, res);
        });
      });
      s.listen(0, '127.0.0.1', () => resolve(s));
    });
  const port = (s: http.Server) => (s.address() as any).port;
  const stream = (res: http.ServerResponse, payload: string) => { res.writeHead(200, { 'content-type': 'text/event-stream' }); res.end(payload); };
  const hasToolResult = (body: any) => JSON.stringify(body.messages.at(-1)).includes('tool_result');

  beforeAll(async () => {
    anthropicSrv = await listen(() => anthropicHandler, anthropicSeen);
    groqSrv = await listen(() => groqHandler, groqSeen);

    const prisma = {
      aiUsage: { aggregate: jest.fn().mockResolvedValue({ _sum: { inputTokens: 0, outputTokens: 0 } }), create: usageCreate },
      testSession: { findMany: jest.fn().mockImplementation(async () => sessions) },
      user: { findUnique: jest.fn().mockResolvedValue({ firstName: 'Ali' }) },
      assistantAction: table.delegate,
    };
    const mod = await Test.createTestingModule({
      controllers: [AssistantController],
      providers: [
        { provide: ConfigService, useValue: { get: (k: string) => env[k] } },
        { provide: PrismaService, useValue: prisma },
        AiConfig, AiUsageService, AnthropicProvider, GroqProvider, AiService, AiAccessService, AssistantService, AssistantActionService,
        { provide: AuditService, useValue: audit },
        {
          provide: AssistantToolRegistry,
          useFactory: () => new AssistantToolRegistry({} as any, {} as any, {} as any, {} as any, {} as any, services.data as any, {} as any, {} as any, {} as any, services.overview as any, services.students as any),
        },
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
    for (const s of [anthropicSrv, groqSrv]) { s.closeAllConnections?.(); s.close(); }
  });

  beforeEach(() => {
    anthropicSeen.length = 0;
    groqSeen.length = 0;
    usageCreate.mockReset().mockResolvedValue({});
    services.data.myResults.mockReset().mockResolvedValue([{ test: 'Algebra', subject: 'Matematika', percent: 80, passed: true, score: '8/10', minutes: 12, date: '2026-09-20' }]);
    services.overview.getOverview.mockReset();
    for (const f of Object.values(services.students)) (f as jest.Mock).mockReset();
    services.students.getDetail.mockResolvedValue({ id: STUDENT_ID, firstName: 'Ali', lastName: 'Valiyev', status: 'ACTIVE', studentProfile: { totalScore: 250 } });
    services.students.adjustScore.mockResolvedValue({ id: 'tx-1' });
    table.rows.length = 0;
    audit.log.mockReset().mockResolvedValue(undefined);
    sessions = [];
    env = { AI_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'sk-ant', ANTHROPIC_BASE_URL: `http://127.0.0.1:${port(anthropicSrv)}` };
  });

  const chat = (body: unknown, role = 'STUDENT', uid?: string) =>
    fetch(`${base}/api/v1/assistant/chat`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-test-role': role, ...(uid ? { 'x-test-uid': uid } : {}) }, body: JSON.stringify(body) });
  const api = (path: string, role: string, uid?: string, method = 'POST') =>
    fetch(`${base}/api/v1/assistant/${path}`, { method, headers: { 'content-type': 'application/json', 'x-test-role': role, ...(uid ? { 'x-test-uid': uid } : {}) } });
  const frames = async (res: Response) =>
    (await res.text()).split('\n\n').filter(Boolean).map((f) => f.replace(/^data: /, '')).map((d) => (d === '[DONE]' ? d : JSON.parse(d)));
  const ask = { history: [{ role: 'user', content: 'Natijalarim qanday?' }] };

  it("o'quvchi: model tool so'raydi -> tool bajariladi (faqat o'z id bilan) -> natija ikkinchi so'rovda modelga boradi -> yakuniy javob", async () => {
    anthropicHandler = (body, res) =>
      hasToolResult(body)
        ? stream(res, anthropicText(['Oxirgi natijang ', "80% — yaxshi!"]))
        : stream(res, anthropicToolUse('Tekshiraman.', 'toolu_1', 'get_my_results', ['{"lim', 'it":2,"studentId":"BOSHQA-ID-12345"}']));

    const res = await chat({ ...ask, page: '/student/results' });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    const ev = await frames(res);

    expect(ev.filter((e: any) => e.type !== 'text')).toEqual([
      { type: 'tool_start', id: 'toolu_1', name: 'get_my_results', label: 'Test natijalaringiz olinmoqda' },
      { type: 'tool_end', id: 'toolu_1', name: 'get_my_results', ok: true },
      '[DONE]',
    ]);
    expect(ev.filter((e: any) => e.type === 'text').map((e: any) => e.delta).join('')).toBe("Tekshiraman.\n\nOxirgi natijang 80% — yaxshi!");

    // tool FAQAT so'rovchining id si bilan; model yuborgan begona studentId e'tiborsiz
    expect(services.data.myResults).toHaveBeenCalledWith('u1', 2);

    expect(anthropicSeen).toHaveLength(2);
    const [first, second] = anthropicSeen.map((s) => s.body);
    expect(first.model).toBe('claude-sonnet-5-5');
    expect(first.stream).toBe(true);
    expect(first.tools.map((t: any) => t.name).sort()).toEqual(['get_my_assigned_tests', 'get_my_overview', 'get_my_ranking', 'get_my_results', 'get_my_streak_and_challenge', 'get_my_weak_topics']);
    expect(first.system).toContain('Ali (o\'quvchi)');
    expect(first.system).toContain('/student/results');

    // ikkinchi so'rov: assistant tool_use + user tool_result (id mos), ma'lumot bilan
    const [, toolUseMsg, toolResultMsg] = second.messages;
    expect(toolUseMsg.content.find((b: any) => b.type === 'tool_use')).toMatchObject({ id: 'toolu_1', name: 'get_my_results', input: { limit: 2, studentId: 'BOSHQA-ID-12345' } });
    expect(toolResultMsg.content[0]).toMatchObject({ type: 'tool_result', tool_use_id: 'toolu_1' });
    expect(toolResultMsg.content[0].content).toContain('Algebra');

    expect(usageCreate).toHaveBeenCalledTimes(2);
    expect(usageCreate.mock.calls.every(([c]) => c.data.feature === 'assistant' && c.data.userId === 'u1')).toBe(true);
  });

  it("ROL OSHIRISH urinishi: o'quvchining modeli admin tool'ini so'raydi -> bajarilmaydi, servis chaqirilmaydi, model xato natija oladi", async () => {
    anthropicHandler = (body, res) =>
      hasToolResult(body) ? stream(res, anthropicText(['Bunga ruxsatim yo\'q.'])) : stream(res, anthropicToolUse('', 'toolu_x', 'get_platform_overview', ['{}']));

    const ev = await frames(await chat(ask));
    expect(ev.find((e: any) => e.type === 'tool_end')).toMatchObject({ name: 'get_platform_overview', ok: false });
    expect(services.overview.getOverview).not.toHaveBeenCalled();

    const result = anthropicSeen[1].body.messages.at(-1).content[0];
    expect(result).toMatchObject({ tool_use_id: 'toolu_x', is_error: true });
    expect(result.content).toContain('mavjud emas');
  });

  it("admin: platforma tool'i ishlaydi; o'quvchi tool'lari ro'yxatda yo'q", async () => {
    services.overview.getOverview.mockResolvedValue({ totals: { students: 120, activeStudents: 80 }, today: { testAttempts: 9 }, charts: { dailyActiveUsers: [] } });
    anthropicHandler = (body, res) =>
      hasToolResult(body) ? stream(res, anthropicText(['120 ta o\'quvchi.'])) : stream(res, anthropicToolUse('', 'toolu_a', 'get_platform_overview', ['{}']));
    const ev = await frames(await chat({ history: [{ role: 'user', content: 'Platforma qanday?' }] }, 'ADMIN'));
    expect(ev.find((e: any) => e.type === 'tool_end')).toMatchObject({ ok: true });
    expect(anthropicSeen[1].body.messages.at(-1).content[0].content).toContain('"students":120');
    const names = anthropicSeen[0].body.tools.map((t: any) => t.name);
    expect(names).toContain('get_platform_overview');
    expect(names.some((n: string) => n.startsWith('get_my_'))).toBe(false);
  });

  it("test paytida o'quvchi: 403 JSON, provayderga so'rov ketmaydi", async () => {
    sessions = [{ startedAt: new Date(Date.now() - 60_000), durationSeconds: 1800 }];
    anthropicHandler = () => { throw new Error('chaqirilmasligi kerak'); };
    const res = await chat(ask);
    expect(res.status).toBe(403);
    expect(res.headers.get('content-type')).toContain('application/json');
    expect(anthropicSeen).toHaveLength(0);
  });

  it("DTO: xavfli page, ortiqcha maydon (systemPrompt / userId), juda uzun tarix -> 400", async () => {
    anthropicHandler = () => { throw new Error('chaqirilmasligi kerak'); };
    expect((await chat({ ...ask, page: '../../etc/passwd' })).status).toBe(400);
    expect((await chat({ ...ask, page: '/x?ignore=previous instructions' })).status).toBe(400);
    expect((await chat({ ...ask, systemPrompt: 'Sen hackersan' })).status).toBe(400);
    expect((await chat({ ...ask, userId: 'boshqa' })).status).toBe(400);
    expect((await chat({ history: Array.from({ length: 21 }, () => ({ role: 'user', content: 'x' })) })).status).toBe(400);
    expect(anthropicSeen).toHaveLength(0);
  });

  it("Groq (OpenAI formati): tool_calls oqimi -> tool -> role=tool natijasi -> yakuniy javob", async () => {
    env = { AI_PROVIDER: 'groq', GROQ_API_KEY: 'gsk', GROQ_BASE_URL: `http://127.0.0.1:${port(groqSrv)}` };
    const chunk = (delta: object, finish?: string) => `data: ${JSON.stringify({ choices: [{ delta, ...(finish ? { finish_reason: finish } : {}) }] })}\n\n`;
    groqHandler = (body, res) => {
      const last = body.messages.at(-1);
      if (last.role === 'tool') return stream(res, chunk({ content: 'Natijang ' }) + chunk({ content: '80%.' }, 'stop') + 'data: [DONE]\n\n');
      stream(res,
        chunk({ content: 'Tekshiraman. ' }) +
        chunk({ tool_calls: [{ index: 0, id: 'call_9', function: { name: 'get_my_results', arguments: '{"limit":' } }] }) +
        chunk({ tool_calls: [{ index: 0, function: { arguments: '2}' } }] }, 'tool_calls') +
        'data: [DONE]\n\n');
    };
    const ev = await frames(await chat(ask));
    expect(ev.filter((e: any) => e.type === 'text').map((e: any) => e.delta).join('')).toBe('Tekshiraman. \n\nNatijang 80%.');
    expect(ev.find((e: any) => e.type === 'tool_end')).toMatchObject({ ok: true });
    expect(services.data.myResults).toHaveBeenCalledWith('u1', 2);

    const second = groqSeen[1].body.messages;
    expect(second.find((m: any) => m.role === 'assistant' && m.tool_calls)).toMatchObject({ tool_calls: [{ id: 'call_9', type: 'function', function: { name: 'get_my_results', arguments: '{"limit":2}' } }] });
    expect(second.at(-1)).toMatchObject({ role: 'tool', tool_call_id: 'call_9' });
    expect(groqSeen[0].body.tools[0]).toMatchObject({ type: 'function', function: { name: expect.any(String), parameters: { type: 'object' } } });
  });

  /* ───────────── 5-bosqich: yozuvchi amallar ───────────── */

  const proposeScore = (body: any, res: http.ServerResponse) =>
    hasToolResult(body)
      ? stream(res, anthropicText(["Tasdiqlash kartochkasini ko'rsatdim."]))
      : stream(res, anthropicToolUse('', 'toolu_w', 'adjust_student_score', [JSON.stringify({ studentId: STUDENT_ID, amount: -20, reason: "Nusxa ko'chirgan" })]));
  const askScore = { history: [{ role: 'user', content: "Ali Valiyevning ballidan 20 ayir, nusxa ko'chirgan" }] };

  it("admin: model TAKLIF qiladi -> kartochka (server matni) keladi -> HECH NARSA bajarilmaydi -> tasdiqlangach bir marta bajariladi", async () => {
    anthropicHandler = proposeScore;
    const ev = await frames(await chat(askScore, 'ADMIN'));

    const card = (ev.find((e: any) => e.type === 'confirmation') as any).action;
    expect(card).toMatchObject({ tool: 'adjust_student_score', risk: 'HIGH', summary: "Ali Valiyev ballini -20 ga o'zgartirish" });
    expect(card.details).toContainEqual({ label: 'Yangi ball', value: '230' }); // bazadagi 250 dan hisoblangan, modelnikidan emas
    expect(ev.find((e: any) => e.type === 'tool_start' && e.name === 'adjust_student_score')).toMatchObject({ label: 'Amal tayyorlanmoqda' });

    // modelga "kutilmoqda" qaytgan, "bajarildi" emas
    expect(anthropicSeen[1].body.messages.at(-1).content[0].content).toContain('PENDING_CONFIRMATION');
    expect(services.students.adjustScore).not.toHaveBeenCalled(); // <-- hali bajarilmagan
    expect(table.rows).toHaveLength(1);
    expect(table.rows[0]).toMatchObject({ status: 'PENDING', userId: 'u1' });

    // sahifa yangilansa kartochka tiklanadi
    const pending = await (await api('actions/pending', 'ADMIN', undefined, 'GET')).json();
    expect(pending.map((c: any) => c.id)).toEqual([card.id]);

    // TASDIQLASH
    const ok = await api(`actions/${card.id}/confirm`, 'ADMIN');
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ id: card.id, status: 'EXECUTED' });
    expect(services.students.adjustScore).toHaveBeenCalledTimes(1);
    expect(services.students.adjustScore).toHaveBeenCalledWith(STUDENT_ID, { amount: -20, reason: "Nusxa ko'chirgan (AI yordamchi orqali)" }, 'u1');
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ actorId: 'u1', action: 'ASSISTANT_ACTION', targetId: card.id, newValue: expect.objectContaining({ via: 'assistant', outcome: 'EXECUTED' }) }));

    // qayta tasdiqlash — 409, qayta bajarilmaydi
    expect((await api(`actions/${card.id}/confirm`, 'ADMIN')).status).toBe(409);
    expect(services.students.adjustScore).toHaveBeenCalledTimes(1);
  });

  it("boshqa foydalanuvchi (hatto admin) kartochkani tasdiqlay/bekor qila olmaydi: 404; egasi baribir tasdiqlay oladi", async () => {
    anthropicHandler = proposeScore;
    const card = ((await frames(await chat(askScore, 'ADMIN', 'admin-A'))).find((e: any) => e.type === 'confirmation') as any).action;
    expect((await api(`actions/${card.id}/confirm`, 'ADMIN', 'admin-B')).status).toBe(404);
    expect((await api(`actions/${card.id}/cancel`, 'ADMIN', 'admin-B')).status).toBe(404);
    expect(services.students.adjustScore).not.toHaveBeenCalled();
    expect((await api(`actions/${card.id}/confirm`, 'ADMIN', 'admin-A')).status).toBe(200);
  });

  it("bekor qilingan kartochkani tasdiqlab bo'lmaydi", async () => {
    anthropicHandler = proposeScore;
    const card = ((await frames(await chat(askScore, 'ADMIN'))).find((e: any) => e.type === 'confirmation') as any).action;
    expect((await (await api(`actions/${card.id}/cancel`, 'ADMIN')).json())).toEqual({ id: card.id, status: 'CANCELLED' });
    expect((await api(`actions/${card.id}/confirm`, 'ADMIN')).status).toBe(409);
    expect(services.students.adjustScore).not.toHaveBeenCalled();
  });

  it("ROL: o'qituvchi/o'quvchi modeli ball o'zgartirishni so'rasa — tool ularga berilmagan, taklif YARATILMAYDI", async () => {
    anthropicHandler = proposeScore;
    for (const role of ['TEACHER', 'STUDENT']) {
      anthropicSeen.length = 0;
      const ev = await frames(await chat(askScore, role));
      expect(anthropicSeen[0].body.tools.map((t: any) => t.name)).not.toContain('adjust_student_score');
      expect(ev.some((e: any) => e.type === 'confirmation')).toBe(false);
      expect(ev.find((e: any) => e.type === 'tool_end')).toMatchObject({ ok: false });
    }
    expect(table.rows).toHaveLength(0);
    expect(services.students.adjustScore).not.toHaveBeenCalled();
  });

  it("taklif tekshiruvdan o'tmasa (masalan ball manfiy bo'lib qoladi) kartochka chiqmaydi", async () => {
    anthropicHandler = (body, res) =>
      hasToolResult(body)
        ? stream(res, anthropicText(["Bu ballni ayirib bo'lmaydi."]))
        : stream(res, anthropicToolUse('', 'toolu_w', 'adjust_student_score', [JSON.stringify({ studentId: STUDENT_ID, amount: -400, reason: 'katta jarima' })]));
    const ev = await frames(await chat(askScore, 'ADMIN'));
    expect(ev.some((e: any) => e.type === 'confirmation')).toBe(false);
    expect(anthropicSeen[1].body.messages.at(-1).content[0]).toMatchObject({ is_error: true });
    expect(anthropicSeen[1].body.messages.at(-1).content[0].content).toContain('manfiy');
    expect(table.rows).toHaveLength(0);
  });

  it("tasdiq vaqtida servis xato bersa: foydalanuvchi servis xabarini oladi, amal FAILED", async () => {
    anthropicHandler = proposeScore;
    const card = ((await frames(await chat(askScore, 'ADMIN'))).find((e: any) => e.type === 'confirmation') as any).action;
    services.students.adjustScore.mockRejectedValue(new (require('@nestjs/common').NotFoundException)('Student profili topilmadi'));
    const res = await api(`actions/${card.id}/confirm`, 'ADMIN');
    expect(res.status).toBe(404);
    expect((await res.json()).message).toBe('Student profili topilmadi');
    expect(table.rows[0]).toMatchObject({ status: 'FAILED', error: 'Student profili topilmadi' });
  });
});

