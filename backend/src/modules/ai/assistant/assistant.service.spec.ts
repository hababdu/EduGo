import { ForbiddenException } from '@nestjs/common';
import { AiMessage, AiStreamEvent, AiToolUseBlock } from '../ai.types';
import { AssistantEvent } from './assistant.types';
import { AssistantService, MAX_PROPOSALS_PER_CHAT, MAX_STEPS, MAX_TOOL_CALLS_PER_STEP } from './assistant.service';

const user = { id: 'u1', telegramId: '1', role: 'STUDENT', status: 'ACTIVE' } as any;
const call = (id: string, name: string, input: any = {}): AiToolUseBlock => ({ type: 'tool_use', id, name, input });

interface Step { text?: string[]; calls?: AiToolUseBlock[]; stop?: 'end' | 'tool_use' | 'max_tokens' }

function build(steps: Step[], opts: { execute?: (u: any, n: string, i: any) => Promise<any>; blocked?: boolean; writeTools?: string[]; propose?: (u: any, t: any, i: any) => Promise<any> } = {}) {
  const seen: { messages: AiMessage[]; tools: any; system: string }[] = [];
  let i = 0;
  const ai: any = {
    stream: jest.fn().mockImplementation(async function* (_u: any, _f: string, req: any): AsyncGenerator<AiStreamEvent> {
      seen.push({ messages: JSON.parse(JSON.stringify(req.messages)), tools: req.tools, system: req.system });
      const s = steps[Math.min(i++, steps.length - 1)];
      for (const t of s.text ?? []) yield { type: 'text', text: t };
      const content: any[] = [...(s.text?.length ? [{ type: 'text', text: s.text.join('') }] : []), ...(s.calls ?? [])];
      yield {
        type: 'done',
        response: { text: (s.text ?? []).join(''), content, toolCalls: s.calls ?? [], stopReason: s.stop ?? (s.calls?.length ? 'tool_use' : 'end'), usage: { inputTokens: 1, outputTokens: 1 }, model: 'm' },
      };
    }),
  };
  const registry: any = {
    definitionsFor: jest.fn().mockReturnValue([{ name: 'get_my_results', description: 'd', inputSchema: { type: 'object' } }]),
    label: jest.fn().mockImplementation((_u: any, n: string) => `label:${n}`),
    execute: jest.fn().mockImplementation(opts.execute ?? (async () => ({ ok: true, content: '{"results":[]}' }))),
    writeToolByName: jest.fn().mockImplementation((_u: any, n: string) => (opts.writeTools?.includes(n) ? { name: n } : undefined)),
  };
  const actions: any = {
    propose: jest.fn().mockImplementation(
      opts.propose ??
        (async (_u: any, t: any) => ({
          ok: true,
          card: { id: `act-${t.name}`, tool: t.name, summary: 'Server yozgan matn', details: [], risk: 'HIGH', expiresAt: '2026-10-01T00:00:00.000Z' },
          content: '{"status":"PENDING_CONFIRMATION"}',
        })),
    ),
  };
  const access: any = {
    assertAllowed: jest.fn().mockImplementation(async () => { if (opts.blocked) throw new ForbiddenException('Test davomida AI yordamchisi o\'chirilgan'); }),
    displayName: jest.fn().mockResolvedValue('Ali'),
  };
  return { svc: new AssistantService(ai, registry, access, actions), ai, registry, access, actions, seen };
}

async function run(svc: AssistantService, page?: string) {
  const events: AssistantEvent[] = [];
  for await (const e of svc.chat(user, { history: [{ role: 'user', content: 'Natijalarim qanday?' }], page })) events.push(e);
  return events;
}
const text = (ev: AssistantEvent[]) => ev.filter((e): e is Extract<AssistantEvent, { type: 'text' }> => e.type === 'text').map((e) => e.delta).join('');

describe('AssistantService — tool sikli', () => {
  it("tool so'ralmasa: bitta murojaat, matn oqimi", async () => {
    const { svc, ai } = build([{ text: ['Salom, ', 'Ali!'] }]);
    expect(text(await run(svc))).toBe('Salom, Ali!');
    expect(ai.stream).toHaveBeenCalledTimes(1);
  });

  it("tool so'ralsa: bajariladi, natija modelga qaytadi (id mos), javob oxirida keladi, hodisalar tartibli", async () => {
    const { svc, registry, seen } = build([
      { text: ['Ko\'rib chiqaman.'], calls: [call('toolu_1', 'get_my_results', { limit: 3 })] },
      { text: ['Oxirgi natijang 80%.'] },
    ], { execute: async () => ({ ok: true, content: '{"results":[{"percent":80}]}' }) });

    const ev = await run(svc);
    expect(ev.map((e) => e.type)).toEqual(['text', 'tool_start', 'tool_end', 'text', 'text']);
    expect(ev[1]).toEqual({ type: 'tool_start', id: 'toolu_1', name: 'get_my_results', label: 'label:get_my_results' });
    expect(ev[2]).toEqual({ type: 'tool_end', id: 'toolu_1', name: 'get_my_results', ok: true });
    expect(text(ev)).toBe("Ko'rib chiqaman.\n\nOxirgi natijang 80%."); // tool oldi va keyingi matn yopishmaydi
    expect(registry.execute).toHaveBeenCalledWith(user, 'get_my_results', { limit: 3 });

    const second = seen[1].messages;
    expect(second[second.length - 2]).toMatchObject({ role: 'assistant', content: [{ type: 'text' }, { type: 'tool_use', id: 'toolu_1' }] });
    expect(second[second.length - 1]).toEqual({ role: 'user', content: [{ type: 'tool_result', toolUseId: 'toolu_1', content: '{"results":[{"percent":80}]}' }] });
  });

  it("tool xatosi modelga is_error bilan qaytadi va model davom etadi", async () => {
    const { svc, seen } = build(
      [{ calls: [call('t1', 'get_group_students', { groupId: 'x' })] }, { text: ['Bu guruhga kira olmayman.'] }],
      { execute: async () => ({ ok: false, content: '{"error":"Bu guruh sizga biriktirilmagan"}' }) },
    );
    const ev = await run(svc);
    expect(ev.find((e) => e.type === 'tool_end')).toMatchObject({ ok: false });
    expect((seen[1].messages.at(-1) as any).content[0]).toMatchObject({ toolUseId: 't1', isError: true });
    expect(text(ev)).toContain('kira olmayman');
  });

  it(`bir qadamda ${MAX_TOOL_CALLS_PER_STEP} tadan ortiq tool so'ralsa: ortiqchasi bajarilmaydi, LEKIN har biriga natija (xato) beriladi`, async () => {
    const calls = Array.from({ length: MAX_TOOL_CALLS_PER_STEP + 2 }, (_, i) => call(`t${i}`, 'get_my_results'));
    const { svc, registry, seen } = build([{ calls }, { text: ['tayyor'] }]);
    await run(svc);
    expect(registry.execute).toHaveBeenCalledTimes(MAX_TOOL_CALLS_PER_STEP);
    const results = (seen[1].messages.at(-1) as any).content;
    expect(results.map((r: any) => r.toolUseId)).toEqual(calls.map((c) => c.id)); // hammasiga natija bor
    expect(results.slice(MAX_TOOL_CALLS_PER_STEP).every((r: any) => r.isError)).toBe(true);
  });

  it(`cheksiz sikldan himoya: ${MAX_STEPS} qadamdan keyin to'xtaydi va notice yuboradi`, async () => {
    const { svc, ai } = build([{ calls: [call('t', 'get_my_results')] }]); // model tool so'rashdan to'xtamaydi
    const ev = await run(svc);
    expect(ai.stream).toHaveBeenCalledTimes(MAX_STEPS);
    expect(ev.at(-1)).toMatchObject({ type: 'notice' });
  });

  it("student test paytida: AI umuman chaqirilmaydi", async () => {
    const { svc, ai } = build([{ text: ['x'] }], { blocked: true });
    await expect(run(svc)).rejects.toBeInstanceOf(ForbiddenException);
    expect(ai.stream).not.toHaveBeenCalled();
  });

  it("modelga faqat rolga mos tool'lar, ism va sahifa kontekstli system prompt beriladi; sana bor", async () => {
    const { svc, registry, seen } = build([{ text: ['ok'] }]);
    await run(svc, '/student/results');
    expect(registry.definitionsFor).toHaveBeenCalledWith(user);
    expect(seen[0].tools).toEqual([{ name: 'get_my_results', description: 'd', inputSchema: { type: 'object' } }]);
    expect(seen[0].system).toContain('Ali (o\'quvchi)');
    expect(seen[0].system).toContain('/student/results');
    expect(seen[0].system).toMatch(/Bugun: \d{4}-\d{2}-\d{2}/);
    expect(seen[0].system).toContain('faqat ma\'lumot KO\'RSATA'); // yozuv amallari hali yo'q
  });

  it("javob bo'sh bo'lsa yoki uzunlik chegarasiga yetsa foydalanuvchi bilishi uchun notice", async () => {
    expect((await run(build([{ text: [] }]).svc)).at(-1)).toMatchObject({ type: 'notice' });
    const ev = await run(build([{ text: ['Uzun javob…'], stop: 'max_tokens' }]).svc);
    expect(ev.at(-1)).toMatchObject({ type: 'notice', message: expect.stringContaining('Davom et') });
  });

  it('salomlashuv (assistant) bilan boshlangan tarix provayderga user xabaridan boshlanib boradi', async () => {
    const { svc, seen } = build([{ text: ['ok'] }]);
    for await (const _ of svc.chat(user, { history: [{ role: 'assistant', content: 'Salom!' }, { role: 'user', content: 'Savol' }] })) void _;
    expect(seen[0].messages).toEqual([{ role: 'user', content: 'Savol' }]);
  });

  /* ───── Yozuvchi tool'lar (4-bosqichdan keyin) ───── */

  it("yozuvchi tool: BAJARILMAYDI (registry.execute chaqirilmaydi), taklif yaratiladi va kartochka hodisasi yuboriladi", async () => {
    const { svc, registry, actions, seen } = build(
      [{ text: ['Tayyorlayman.'], calls: [call('w1', 'adjust_student_score', { studentId: 'x', amount: -20, reason: 'sabab' })] }, { text: ['Tasdiqlang.'] }],
      { writeTools: ['adjust_student_score'] },
    );
    const ev = await run(svc);
    expect(registry.execute).not.toHaveBeenCalled(); // o'qish tool'lari yo'li umuman ishlatilmadi
    expect(actions.propose).toHaveBeenCalledWith(user, { name: 'adjust_student_score' }, { studentId: 'x', amount: -20, reason: 'sabab' });
    expect(ev.map((e) => e.type)).toEqual(['text', 'tool_start', 'tool_end', 'confirmation', 'text', 'text']);
    expect(ev.find((e) => e.type === 'confirmation')).toMatchObject({ action: { id: 'act-adjust_student_score', summary: 'Server yozgan matn' } });
    // modelga faqat "kutilmoqda" natijasi qaytadi
    expect((seen[1].messages.at(-1) as any).content[0]).toEqual({ type: 'tool_result', toolUseId: 'w1', content: '{"status":"PENDING_CONFIRMATION"}' });
  });

  it("taklif rad etilsa (ruxsat/tekshiruv xatosi) kartochka CHIQMAYDI, model xatoni oladi", async () => {
    const { svc, seen } = build(
      [{ calls: [call('w1', 'publish_test', { testId: 'x' })] }, { text: ['Bu testni e\'lon qila olmayman.'] }],
      { writeTools: ['publish_test'], propose: async () => ({ ok: false, content: '{"error":"Bu test sizga tegishli emas"}' }) },
    );
    const ev = await run(svc);
    expect(ev.some((e) => e.type === 'confirmation')).toBe(false);
    expect(ev.find((e) => e.type === 'tool_end')).toMatchObject({ ok: false });
    expect((seen[1].messages.at(-1) as any).content[0]).toMatchObject({ isError: true });
  });

  it(`bir suhbatda ko'pi bilan ${MAX_PROPOSALS_PER_CHAT} ta amal taklif qilinadi; ortiqchasi rad etiladi (lekin natija beriladi)`, async () => {
    const calls = Array.from({ length: MAX_PROPOSALS_PER_CHAT + 1 }, (_, i) => call(`w${i}`, 'publish_test', { testId: `t${i}` }));
    const { svc, actions, seen } = build([{ calls }, { text: ['ok'] }], { writeTools: ['publish_test'] });
    const ev = await run(svc);
    expect(actions.propose).toHaveBeenCalledTimes(MAX_PROPOSALS_PER_CHAT);
    expect(ev.filter((e) => e.type === 'confirmation')).toHaveLength(MAX_PROPOSALS_PER_CHAT);
    const results = (seen[1].messages.at(-1) as any).content;
    expect(results).toHaveLength(MAX_PROPOSALS_PER_CHAT + 1); // har tool_use ga natija bor
    expect(results.at(-1)).toMatchObject({ isError: true });
  });

  it("o'qish tool'i bilan yozuvchi tool bir qadamda aralash kelsa ham to'g'ri ishlaydi", async () => {
    const { svc, registry, actions } = build(
      [{ calls: [call('r1', 'get_my_results'), call('w1', 'publish_test', { testId: 'x' })] }, { text: ['tayyor'] }],
      { writeTools: ['publish_test'] },
    );
    await run(svc);
    expect(registry.execute).toHaveBeenCalledTimes(1);
    expect(registry.execute).toHaveBeenCalledWith(user, 'get_my_results', {});
    expect(actions.propose).toHaveBeenCalledTimes(1);
  });
});
