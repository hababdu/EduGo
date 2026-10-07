import 'reflect-metadata';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { currentMonth, monthEndsAfter, parseMonth, PaymentsService } from './payments.service';
import { GroupsService } from './groups.service';
import { MarkPaymentsDto } from './dto/payments.dto';
import { CreateGroupDto, UpdateGroupDto } from './dto/groups.dto';

const admin: any = { id: 'adm', role: 'ADMIN' };
const teacher: any = { id: 'tA', role: 'TEACHER' };
const student: any = { id: 's1', role: 'STUDENT' };
const NOW = new Date('2026-10-04T10:00:00Z'); // Toshkent: 2026-10-04

describe('oy yordamchilari', () => {
  it('currentMonth: Toshkent chegarasi (oyning oxirgi kuni 19:00 UTC dan keyin keyingi oy)', () => {
    expect(currentMonth(new Date('2026-10-31T18:59:00Z'))).toBe('2026-10');
    expect(currentMonth(new Date('2026-10-31T19:00:00Z'))).toBe('2026-11');
  });
  it("parseMonth: formatni, kelajakni va 24 oydan eskini rad etadi", () => {
    expect(parseMonth('2026-10', NOW)).toBe('2026-10');
    expect(parseMonth('2024-10', NOW)).toBe('2024-10');
    for (const bad of ['2026-13', '2026-00', '2026-1', '26-10', '2026-11', '2027-01', '2024-09', 12, undefined, '2026-10-01']) {
      expect(() => parseMonth(bad as any, NOW)).toThrow(BadRequestException);
    }
  });
  it("monthEndsAfter: oy tugagandan keyin qo'shilgan o'quvchi to'lamaydi", () => {
    expect(monthEndsAfter('2026-09', new Date('2026-09-15T00:00:00Z'))).toBe(true);
    expect(monthEndsAfter('2026-09', new Date('2026-10-02T00:00:00Z'))).toBe(false);
    // Toshkent: 30-sentabr 19:00 UTC = 1-oktabr 00:00 → sentabrdan keyin
    expect(monthEndsAfter('2026-09', new Date('2026-09-30T19:00:00Z'))).toBe(false);
    expect(monthEndsAfter('2026-09', new Date('2026-09-30T18:59:00Z'))).toBe(true);
  });
});

describe('DTO', () => {
  const errs = async (cls: any, body: object) => (await validate(plainToInstance(cls, body))).length;
  it("to'lov belgilari validatsiyasi", async () => {
    expect(await errs(MarkPaymentsDto, { month: '2026-10', records: [{ studentId: 'a', status: 'PAID', amount: 300000 }] })).toBe(0);
    for (const bad of [
      { month: '2026-13', records: [{ studentId: 'a', status: 'PAID' }] },
      { month: '2026-10', records: [] },
      { month: '2026-10', records: [{ studentId: 'a', status: 'MAYBE' }] },
      { month: '2026-10', records: [{ studentId: 'a', status: 'PAID', amount: -5 }] },
      { month: '2026-10', records: [{ studentId: 'a', status: 'PAID', amount: 1.5 }] },
      { month: '2026-10', records: [{ studentId: 'a', status: 'PAID', amount: 999_999_999 }] },
    ]) expect(await errs(MarkPaymentsDto, bad)).toBeGreaterThan(0);
  });
  it('monthlyFee: manfiy yoki juda katta qiymat rad etiladi', async () => {
    expect(await errs(UpdateGroupDto, { monthlyFee: 250000 })).toBe(0);
    expect(await errs(UpdateGroupDto, { monthlyFee: null })).toBe(0);
    expect(await errs(UpdateGroupDto, { monthlyFee: -1 })).toBeGreaterThan(0);
    expect(await errs(CreateGroupDto, { name: 'G', monthlyFee: 1e12 })).toBeGreaterThan(0);
  });
});

function build(opts: { fee?: number | null; members?: any[]; payments?: any[]; groups?: any[] } = {}) {
  const prisma: any = {
    group: {
      findUnique: jest.fn().mockResolvedValue({ id: 'g', name: 'G', monthlyFee: opts.fee === undefined ? 300000 : opts.fee, deletedAt: null }),
      findMany: jest.fn().mockResolvedValue(opts.groups ?? []),
    },
    groupMember: {
      findMany: jest.fn().mockImplementation(async (a: any) => {
        const all = opts.members ?? [];
        const ids: string[] | undefined = a?.where?.studentId?.in;
        return ids ? all.filter((m) => ids.includes(m.studentId ?? m.student.id)).map((m) => ({ studentId: m.studentId ?? m.student.id })) : all;
      }),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    payment: {
      findMany: jest.fn().mockResolvedValue(opts.payments ?? []),
      upsert: jest.fn().mockImplementation((a: any) => ({ op: 'upsert', a })),
      deleteMany: jest.fn().mockImplementation((a: any) => ({ op: 'delete', a })),
    },
    $transaction: jest.fn().mockResolvedValue([]),
  };
  return { prisma, svc: new PaymentsService(prisma) };
}
const mem = (id: string, joinedAt = '2026-01-10T00:00:00Z') => ({ studentId: id, joinedAt, student: { id, firstName: id.toUpperCase(), lastName: null, username: null } });

describe('PaymentsService: kirish huquqi', () => {
  it("o'qituvchi va o'quvchi pul ma'lumotlarini ko'ra/o'zgartira olmaydi", async () => {
    const { svc } = build();
    for (const u of [teacher, student]) {
      await expect(svc.overview('2026-10', u, NOW)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(svc.groupMonth('g', '2026-10', u, NOW)).rejects.toBeInstanceOf(ForbiddenException);
      await expect(svc.markMonth('g', { month: '2026-10', records: [{ studentId: 'a', status: 'PAID' }] }, u, NOW)).rejects.toBeInstanceOf(ForbiddenException);
    }
  });
  it('admin va super admin kira oladi', async () => {
    const { svc } = build({ members: [mem('a')] });
    await expect(svc.groupMonth('g', '2026-10', { id: 'x', role: 'SUPER_ADMIN' } as any, NOW)).resolves.toBeTruthy();
  });
});

describe('PaymentsService.markMonth', () => {
  const run = (records: any[], o: Parameters<typeof build>[0] = { members: [mem('a'), mem('b')] }) => {
    const b = build(o);
    return { ...b, p: b.svc.markMonth('g', { month: '2026-10', records }, admin, NOW) };
  };
  it("PAID summa bermasa guruhning oylik to'lovini oladi", async () => {
    const { p, prisma } = run([{ studentId: 'a', status: 'PAID' }]);
    await p;
    const call = prisma.payment.upsert.mock.calls[0][0];
    expect(call.create).toMatchObject({ amount: 300000, status: 'PAID', month: '2026-10', markedById: 'adm' });
  });
  it("PAID aniq summa bilan — o'sha summa; WAIVED — 0", async () => {
    const { p, prisma } = run([{ studentId: 'a', status: 'PAID', amount: 150000, note: ' yarmi ' }, { studentId: 'b', status: 'WAIVED', amount: 999 }]);
    await p;
    expect(prisma.payment.upsert.mock.calls[0][0].create).toMatchObject({ amount: 150000, note: 'yarmi' });
    expect(prisma.payment.upsert.mock.calls[1][0].create).toMatchObject({ status: 'WAIVED', amount: 0 });
  });
  it("UNPAID yozuvni o'chiradi (upsert emas)", async () => {
    const { p, prisma } = run([{ studentId: 'a', status: 'UNPAID' }]);
    await p;
    expect(prisma.payment.deleteMany).toHaveBeenCalledWith({ where: { groupId: 'g', studentId: 'a', month: '2026-10' } });
    expect(prisma.payment.upsert).not.toHaveBeenCalled();
  });
  it("oylik to'lov ham, summa ham yo'q bo'lsa — rad etiladi va hech narsa yozilmaydi", async () => {
    const { p, prisma } = run([{ studentId: 'a', status: 'PAID' }], { fee: null, members: [mem('a')] });
    await expect(p).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it("guruh a'zosi bo'lmagan o'quvchi rad etiladi", async () => {
    const { p, prisma } = run([{ studentId: 'zzz', status: 'PAID' }]);
    await expect(p).rejects.toThrow(/a'zosi emas/);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('takror o‘quvchi rad etiladi; kelajak oyi rad etiladi', async () => {
    await expect(run([{ studentId: 'a', status: 'PAID' }, { studentId: 'a', status: 'UNPAID' }]).p).rejects.toBeInstanceOf(BadRequestException);
    const { svc } = build({ members: [mem('a')] });
    await expect(svc.markMonth('g', { month: '2026-12', records: [{ studentId: 'a', status: 'PAID' }] }, admin, NOW)).rejects.toBeInstanceOf(BadRequestException);
  });
  it("o'chirilgan/yo'q guruh — 404", async () => {
    const { svc, prisma } = build();
    prisma.group.findUnique.mockResolvedValue({ id: 'g', deletedAt: new Date() });
    await expect(svc.markMonth('g', { month: '2026-10', records: [{ studentId: 'a', status: 'PAID' }] }, admin, NOW)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('PaymentsService.groupMonth / overview', () => {
  it("holat va jami: to'lagan, imtiyoz, qarzdor; kutilgan summa imtiyozlilarsiz", async () => {
    const { svc } = build({
      members: [mem('a'), mem('b'), mem('c'), mem('late', '2026-10-03T00:00:00Z')],
      payments: [
        { studentId: 'a', status: 'PAID', amount: 300000, note: null, paidAt: NOW },
        { studentId: 'b', status: 'WAIVED', amount: 0, note: null, paidAt: NOW },
      ],
    });
    const r = await svc.groupMonth('g', '2026-09', admin, NOW);
    const by = Object.fromEntries(r.students.map((s: any) => [s.studentId, s]));
    expect(by.a.status).toBe('PAID');
    expect(by.c.status).toBe('UNPAID');
    expect(by.late.due).toBe(false); // sentabr tugagach qo'shilgan
    expect(r.totals).toEqual({ paid: 1, waived: 1, unpaid: 1, collected: 300000, expected: 600000 });
  });

  it("overview: qarzdorlar ro'yxati va jami; oy tugagach qo'shilganlar qarzdor emas", async () => {
    const groups = [
      { id: 'g1', name: 'IELTS', monthlyFee: 400000, members: [mem('a'), mem('b'), mem('late', '2026-10-03T00:00:00Z')] },
      { id: 'g2', name: 'Mat', monthlyFee: null, members: [mem('c')] },
    ];
    const { svc } = build({
      groups,
      payments: [{ groupId: 'g1', studentId: 'a', status: 'PAID', amount: 400000 }],
    });
    const r = await svc.overview('2026-09', admin, NOW);
    expect(r.debtors.map((d: any) => d.studentId).sort()).toEqual(['b', 'c']);
    expect(r.debtors.find((d: any) => d.studentId === 'b')).toMatchObject({ groupName: 'IELTS', monthlyFee: 400000 });
    expect(r.totals).toMatchObject({ collected: 400000, paid: 1, unpaid: 2 });
    expect(r.groups[0]).toMatchObject({ groupId: 'g1', paid: 1, unpaid: 1, expected: 800000 });
    expect(r.groups[1].expected).toBeNull();
  });
});

describe('PaymentsService.myPayments', () => {
  it("a'zo bo'lmagan o'quvchi — 404 (boshqa guruh to'lovini ko'rmaydi)", async () => {
    const { svc } = build();
    await expect(svc.myPayments('g', student, NOW)).rejects.toBeInstanceOf(NotFoundException);
  });
  it("faqat o'zining yozuvlari so'raladi va qo'shilgandan oldingi oylar chiqmaydi", async () => {
    const { svc, prisma } = build({ payments: [{ month: '2026-10', status: 'PAID' }] });
    prisma.groupMember.findUnique.mockResolvedValue({ joinedAt: new Date('2026-08-10T00:00:00Z'), group: { monthlyFee: 300000, deletedAt: null } });
    const r = await svc.myPayments('g', student, NOW);
    expect(prisma.payment.findMany.mock.calls[0][0].where).toMatchObject({ groupId: 'g', studentId: 's1' });
    expect(r.months.map((m: any) => m.month)).toEqual(['2026-10', '2026-09', '2026-08']);
    expect(r.months[0].status).toBe('PAID');
    expect(r.months[1].status).toBe('UNPAID');
    expect(r.monthlyFee).toBe(300000);
  });
});

describe('GroupsService: oylik to\'lovni faqat admin belgilaydi', () => {
  const mk = () => {
    const prisma: any = {
      group: {
        findUnique: jest.fn().mockResolvedValue({ id: 'g', teacherId: 'tA', deletedAt: null, members: [], teacher: null }),
        update: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({}),
      },
      groupMember: { count: jest.fn().mockResolvedValue(0) },
      user: { findFirst: jest.fn().mockResolvedValue({ id: 't' }) },
    };
    return { prisma, svc: new GroupsService(prisma) };
  };
  it("o'qituvchi oylik to'lovni o'zgartira olmaydi", async () => {
    const { svc, prisma } = mk();
    await expect(svc.updateGroup('g', { monthlyFee: 1 }, teacher)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.group.update).not.toHaveBeenCalled();
  });
  it("admin o'zgartira oladi (0 va null ham)", async () => {
    const { svc, prisma } = mk();
    await svc.updateGroup('g', { monthlyFee: 250000 }, admin);
    expect(prisma.group.update.mock.calls[0][0].data.monthlyFee).toBe(250000);
    await svc.updateGroup('g', { monthlyFee: null }, admin);
    expect(prisma.group.update.mock.calls[1][0].data.monthlyFee).toBeNull();
  });
  it("o'qituvchi guruh yaratganda yuborgan monthlyFee e'tiborga olinmaydi", async () => {
    const { svc, prisma } = mk();
    await svc.createGroup({ name: 'G', monthlyFee: 999 } as any, teacher);
    expect(prisma.group.create.mock.calls[0][0].data.monthlyFee).toBeNull();
    await svc.createGroup({ name: 'G', monthlyFee: 999 } as any, admin);
    expect(prisma.group.create.mock.calls[1][0].data.monthlyFee).toBe(999);
  });
});
