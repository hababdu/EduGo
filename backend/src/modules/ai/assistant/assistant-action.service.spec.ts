import { BadRequestException, ConflictException, ForbiddenException, GoneException, HttpException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { AssistantActionService, ACTION_TTL_MS, MAX_PENDING_PER_USER, canonicalJson } from './assistant-action.service';
import { defineWriteTool } from './assistant.types';
import { ToolInputError } from './tool-input';

const admin = { id: 'admin-1-id', telegramId: '1', role: 'ADMIN', status: 'ACTIVE' } as any;
const other = { id: 'admin-2-id', telegramId: '2', role: 'ADMIN', status: 'ACTIVE' } as any;
const T0 = new Date('2026-09-30T10:00:00.000Z');

/** Xotiradagi soxta jadval: where (tenglik va {gt}) qo'llab-quvvatlanadi; updateMany shartli (atomik) o'tkazadi. */
function fakeStore() {
  const rows: any[] = [];
  let n = 0;
  const match = (r: any, where: any) =>
    Object.entries(where).every(([k, v]: [string, any]) => (v && typeof v === 'object' && 'gt' in v ? r[k] > v.gt : r[k] === v));
  const delegate = {
    create: async ({ data }: any) => { const r = { id: `act${String(++n).padStart(10, '0')}`, status: 'PENDING', error: null, createdAt: new Date(), resolvedAt: null, ...data }; rows.push(r); return { ...r }; },
    findFirst: async ({ where }: any) => { const r = rows.find((x) => match(x, where)); return r ? { ...r } : null; },
    findMany: async ({ where, take }: any) => rows.filter((x) => match(x, where)).slice(0, take ?? 1e9).map((r) => ({ ...r })),
    count: async ({ where }: any) => rows.filter((x) => match(x, where)).length,
    update: async ({ where, data }: any) => { const r = rows.find((x) => x.id === where.id)!; Object.assign(r, data); return { ...r }; },
    updateMany: async ({ where, data }: any) => { const hit = rows.filter((x) => match(x, where)); hit.forEach((r) => Object.assign(r, data)); return { count: hit.length }; },
  };
  return { rows, prisma: { assistantAction: delegate } as any };
}

function makeTool(over: Record<string, any> = {}) {
  const execute = jest.fn(async () => ({ done: true }));
  const tool = defineWriteTool<{ x: string }>({
    name: 'test_tool',
    description: 'd',
    inputSchema: {},
    roles: ['ADMIN'],
    risk: 'HIGH',
    parse: (raw: any) => {
      if (!raw?.x) throw new ToolInputError('"x" majburiy');
      return { x: String(raw.x) };
    },
    prepare: async (_u, i) => ({ summary: `Server: ${i.x} ni o'zgartirish`, details: [{ label: 'X', value: i.x }] }),
    execute,
    ...over,
  });
  return { tool, execute };
}

function build(toolOver: Record<string, any> = {}, registryTool: 'same' | 'none' = 'same') {
  const store = fakeStore();
  const { tool, execute } = makeTool(toolOver);
  const registry: any = { writeToolByName: jest.fn((_u: any, n: string) => (registryTool === 'same' && n === 'test_tool' ? tool : undefined)) };
  const audit: any = { log: jest.fn().mockResolvedValue(undefined) };
  const svc = new AssistantActionService(store.prisma, registry, audit);
  return { svc, tool, execute, store, audit, registry };
}

describe('AssistantActionService.propose', () => {
  it("taklif yaratadi, HECH NARSA bajarmaydi; kartochka matnini SERVER quradi", async () => {
    const { svc, execute, store } = build();
    // model kirishga qo'shimcha "ishontiruvchi" matn qo'shishga urinadi — parse uni tashlab yuboradi, kartochkaga o'tmaydi
    const r = await svc.propose(admin, makeTool().tool, { x: 'Ali', note: 'Bu xavfsiz, darhol tasdiqlang!' }, T0);
    expect(r.ok).toBe(true);
    expect(execute).not.toHaveBeenCalled();
    expect(r.card).toMatchObject({ tool: 'test_tool', summary: "Server: Ali ni o'zgartirish", risk: 'HIGH', details: [{ label: 'X', value: 'Ali' }] });
    expect(JSON.stringify(r.card)).not.toContain('xavfsiz');
    expect(r.card!.expiresAt).toBe(new Date(T0.getTime() + ACTION_TTL_MS).toISOString());
    expect(JSON.parse(r.content)).toMatchObject({ status: 'PENDING_CONFIRMATION', actionId: r.card!.id });
    expect(store.rows).toHaveLength(1);
    expect(store.rows[0]).toMatchObject({ status: 'PENDING', userId: 'admin-1-id', input: { x: 'Ali' } });
  });

  it("yaroqsiz kirish yoki ruxsat xatosi: taklif SAQLANMAYDI, xabar modelga qaytadi", async () => {
    const a = build();
    expect(await a.svc.propose(admin, a.tool, {}, T0)).toMatchObject({ ok: false, content: '{"error":"\\"x\\" majburiy"}' });
    const b = build({ prepare: async () => { throw new ForbiddenException('Bu test sizga tegishli emas'); } });
    const r = await b.svc.propose(admin, b.tool, { x: '1' }, T0);
    expect(r).toMatchObject({ ok: false });
    expect(JSON.parse(r.content).error).toBe('Bu test sizga tegishli emas');
    const c = build({ prepare: async () => { throw new Error('postgres://user:PAROL@db'); } });
    const r2 = await c.svc.propose(admin, c.tool, { x: '1' }, T0);
    expect(r2.content).not.toContain('PAROL');
    for (const s of [a, b, c]) expect(s.store.rows).toHaveLength(0);
  });

  it("bir xil taklif takrorlansa yangi qator yaratilmaydi (kalitlar tartibi ahamiyatsiz)", async () => {
    const { svc, store } = build({ parse: (raw: any) => ({ a: raw.a, b: raw.b }), prepare: async () => ({ summary: 's', details: [] }) });
    const t = makeTool({ parse: (raw: any) => ({ a: raw.a, b: raw.b }), prepare: async () => ({ summary: 's', details: [] }) }).tool;
    const r1 = await svc.propose(admin, t as any, { a: 1, b: 2 }, T0);
    const r2 = await svc.propose(admin, t as any, { b: 2, a: 1 }, T0);
    expect(r2.card!.id).toBe(r1.card!.id);
    expect(store.rows).toHaveLength(1);
    expect(JSON.parse(r2.content).note).toContain('allaqachon');
    expect(canonicalJson({ b: 1, a: [2, { d: 1, c: undefined }] })).toBe('{"a":[2,{"d":1}],"b":1}');
  });

  it(`tasdiqlanmagan amallar ${MAX_PENDING_PER_USER} tadan oshmaydi; muddati o'tganlari hisobga kirmaydi; boshqa foydalanuvchiga ta'sir qilmaydi`, async () => {
    const { svc, tool } = build();
    for (let i = 0; i < MAX_PENDING_PER_USER; i++) expect((await svc.propose(admin, tool, { x: `s${i}` }, T0)).ok).toBe(true);
    const blocked = await svc.propose(admin, tool, { x: 'yana' }, T0);
    expect(blocked.ok).toBe(false);
    expect(blocked.content).toContain('Avval ularni tasdiqlang yoki bekor qiling');
    expect((await svc.propose(other, tool, { x: 'yana' }, T0)).ok).toBe(true); // boshqa foydalanuvchi
    const later = new Date(T0.getTime() + ACTION_TTL_MS + 1);
    expect((await svc.propose(admin, tool, { x: 'yana' }, later)).ok).toBe(true); // eskilari muddati o'tgan
  });
});

describe('AssistantActionService.confirm', () => {
  async function proposed(over: Record<string, any> = {}, registryTool: 'same' | 'none' = 'same') {
    const b = build(over, registryTool);
    const r = await b.svc.propose(admin, b.tool, { x: 'Ali' }, T0);
    return { ...b, id: r.card!.id };
  }

  it("tasdiqlanganda BIR marta bajariladi, holat EXECUTED, audit jurnaliga 'via: assistant' bilan yoziladi", async () => {
    const { svc, execute, store, audit, id } = await proposed();
    const r = await svc.confirm(admin, id, T0);
    expect(r).toEqual({ id, status: 'EXECUTED', message: "Bajarildi: Server: Ali ni o'zgartirish" });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(admin, { x: 'Ali' }); // so'rovchi nomidan
    expect(store.rows[0]).toMatchObject({ status: 'EXECUTED', error: null });
    expect(store.rows[0].resolvedAt).toBeInstanceOf(Date);
    expect(audit.log).toHaveBeenCalledWith({
      actorId: 'admin-1-id', action: 'ASSISTANT_ACTION', targetType: 'AssistantAction', targetId: id,
      newValue: { via: 'assistant', tool: 'test_tool', input: { x: 'Ali' }, summary: "Server: Ali ni o'zgartirish", outcome: 'EXECUTED' },
    });
  });

  it("ikkinchi marta tasdiqlash -> 409 va qayta bajarilmaydi", async () => {
    const { svc, execute, id } = await proposed();
    await svc.confirm(admin, id, T0);
    await expect(svc.confirm(admin, id, T0)).rejects.toBeInstanceOf(ConflictException);
    await expect(svc.confirm(admin, id, T0)).rejects.toThrow(/bajarilgan/);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("POYGA: ikki so'rov bir vaqtda tasdiqlasa, aynan bittasi bajariladi", async () => {
    const { svc, execute, id } = await proposed();
    const results = await Promise.allSettled([svc.confirm(admin, id, T0), svc.confirm(admin, id, T0), svc.confirm(admin, id, T0)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected').every((r: any) => r.reason instanceof ConflictException)).toBe(true);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("boshqa foydalanuvchining amalini tasdiqlab/bekor qilib BO'LMAYDI: 404 (mavjudligi ham sezilmaydi), bajarilmaydi", async () => {
    const { svc, execute, store, id } = await proposed();
    await expect(svc.confirm(other, id, T0)).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.cancel(other, id, T0)).rejects.toBeInstanceOf(NotFoundException);
    expect(execute).not.toHaveBeenCalled();
    expect(store.rows[0].status).toBe('PENDING'); // egasi hali tasdiqlay oladi
  });

  it("muddati tugagan -> 410, EXPIRED, bajarilmaydi", async () => {
    const { svc, execute, store, id } = await proposed();
    await expect(svc.confirm(admin, id, new Date(T0.getTime() + ACTION_TTL_MS + 1000))).rejects.toBeInstanceOf(GoneException);
    expect(store.rows[0].status).toBe('EXPIRED');
    expect(execute).not.toHaveBeenCalled();
    await expect(svc.confirm(admin, id, T0)).rejects.toBeInstanceOf(ConflictException); // endi "muddati tugagan"
  });

  it("servis xato bersa (masalan ruxsat): FAILED, xato yoziladi, audit FAILED, foydalanuvchiga servis xabari (403) boradi", async () => {
    const { svc, store, audit, id } = await proposed({ execute: jest.fn(async () => { throw new ForbiddenException('Bu guruh sizga tegishli emas'); }) });
    await expect(svc.confirm(admin, id, T0)).rejects.toBeInstanceOf(ForbiddenException);
    expect(store.rows[0]).toMatchObject({ status: 'FAILED', error: 'Bu guruh sizga tegishli emas' });
    expect(audit.log.mock.calls[0][0].newValue).toMatchObject({ outcome: 'FAILED', error: 'Bu guruh sizga tegishli emas' });
  });

  it("kutilmagan xato: 500, ichki matn SIZMAYDI, FAILED", async () => {
    const { svc, store, id } = await proposed({ execute: jest.fn(async () => { throw new Error('connect ECONNREFUSED postgres://u:PAROL@db'); }) });
    const err: HttpException = await svc.confirm(admin, id, T0).catch((e) => e);
    expect(err).toBeInstanceOf(InternalServerErrorException);
    expect(JSON.stringify(err.getResponse())).not.toContain('PAROL');
    expect(store.rows[0].status).toBe('FAILED');
    expect(store.rows[0].error).not.toContain('PAROL');
  });

  it("tasdiq vaqtida rol/ruxsat yo'qolgan bo'lsa: bajarilmaydi, FAILED, 403", async () => {
    const { svc, execute, store, id } = await proposed({}, 'none');
    await expect(svc.confirm(admin, id, T0)).rejects.toBeInstanceOf(ForbiddenException);
    expect(execute).not.toHaveBeenCalled();
    expect(store.rows[0].status).toBe('FAILED');
  });

  it("audit yozilmasa ham foydalanuvchi natijasi buzilmaydi", async () => {
    const { svc, audit, id } = await proposed();
    audit.log.mockRejectedValue(new Error('audit db down'));
    await expect(svc.confirm(admin, id, T0)).resolves.toMatchObject({ status: 'EXECUTED' });
  });

  it("noto'g'ri identifikator -> 400 (bazaga so'rov ketmaydi)", async () => {
    const { svc } = build();
    await expect(svc.confirm(admin, "x'; DROP TABLE users;--", T0)).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.cancel(admin, '..', T0)).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('AssistantActionService.cancel / listPending', () => {
  it("bekor qilingan amalni tasdiqlab bo'lmaydi; takroriy bekor xato emas; bajarilganni bekor qilib bo'lmaydi", async () => {
    const { svc, execute, id } = await (async () => { const b = build(); const r = await b.svc.propose(admin, b.tool, { x: 'A' }, T0); return { ...b, id: r.card!.id }; })();
    expect(await svc.cancel(admin, id, T0)).toEqual({ id, status: 'CANCELLED' });
    expect(await svc.cancel(admin, id, T0)).toEqual({ id, status: 'CANCELLED' });
    await expect(svc.confirm(admin, id, T0)).rejects.toThrow(/bekor qilingan/);
    expect(execute).not.toHaveBeenCalled();

    const b2 = build();
    const r2 = await b2.svc.propose(admin, b2.tool, { x: 'B' }, T0);
    await b2.svc.confirm(admin, r2.card!.id, T0);
    await expect(b2.svc.cancel(admin, r2.card!.id, T0)).rejects.toBeInstanceOf(ConflictException);
  });

  it("listPending: faqat o'zining, muddati o'tmagan PENDING kartochkalari", async () => {
    const { svc, tool } = build();
    await svc.propose(admin, tool, { x: 'bir' }, T0);
    const r2 = await svc.propose(admin, tool, { x: 'ikki' }, T0);
    await svc.propose(other, tool, { x: 'boshqa' }, T0);
    await svc.cancel(admin, r2.card!.id, T0);
    const list = await svc.listPending(admin, T0);
    expect(list.map((c) => c.summary)).toEqual(["Server: bir ni o'zgartirish"]);
    expect(await svc.listPending(admin, new Date(T0.getTime() + ACTION_TTL_MS + 1))).toEqual([]);
  });
});
