import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AttendanceService, parseAttendanceDate, tashkentToday } from './attendance.service';

// 2026-10-03 20:00 UTC = 2026-10-04 01:00 Toshkent -> "bugun" 2026-10-04
const NOW = new Date('2026-10-03T20:00:00Z');
const teacherA: any = { id: 'tA', role: 'TEACHER' };
const teacherB: any = { id: 'tB', role: 'TEACHER' };
const admin: any = { id: 'adm', role: 'ADMIN' };
const student: any = { id: 's1', role: 'STUDENT' };

function build(over: any = {}) {
  const prisma: any = {
    group: { findUnique: jest.fn().mockResolvedValue({ id: 'g', teacherId: 'tA', deletedAt: null }) },
    groupMember: {
      findMany: jest.fn().mockResolvedValue([
        { studentId: 's1', student: { id: 's1', firstName: 'Ali', lastName: 'V', username: null } },
        { studentId: 's2', student: { id: 's2', firstName: 'Vali', lastName: null, username: 'vali' } },
      ]),
      findUnique: jest.fn().mockResolvedValue({ id: 'm' }),
    },
    attendanceRecord: {
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn().mockImplementation((a: any) => ({ __upsert: a })),
    },
    $transaction: jest.fn().mockImplementation(async (ops: any[]) => ops),
    ...over,
  };
  return { prisma, svc: new AttendanceService(prisma) };
}

describe('sana tekshiruvi', () => {
  it('Toshkent "bugun"i', () => expect(tashkentToday(NOW)).toBe('2026-10-04'));
  it("noto'g'ri, kelajak va juda eski sanalarni rad etadi", () => {
    for (const bad of ['2026-13-01', '2026-02-30', 'abc', '2026-10-05', '2026-06-01', undefined, 123 as any]) {
      expect(() => parseAttendanceDate(bad, NOW)).toThrow(BadRequestException);
    }
    expect(parseAttendanceDate('2026-10-04', NOW).iso).toBe('2026-10-04');
    expect(parseAttendanceDate('2026-07-06', NOW).iso).toBe('2026-07-06'); // aynan 90 kun oldin
  });
});

describe("egalik — o'qituvchi faqat O'Z guruhida", () => {
  it("boshqa o'qituvchi 403, o'quvchi 403, admin ruxsat, guruh yo'q 404", async () => {
    const { svc } = build();
    await expect(svc.getDay('g', '2026-10-04', teacherB, NOW)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.getDay('g', '2026-10-04', student, NOW)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.getDay('g', '2026-10-04', admin, NOW)).resolves.toBeDefined();
    await expect(svc.getDay('g', '2026-10-04', teacherA, NOW)).resolves.toBeDefined();
    const none = build({ group: { findUnique: jest.fn().mockResolvedValue(null) } });
    await expect(none.svc.getDay('g', undefined, admin, NOW)).rejects.toBeInstanceOf(NotFoundException);
    const del = build({ group: { findUnique: jest.fn().mockResolvedValue({ id: 'g', teacherId: 'tA', deletedAt: new Date() }) } });
    await expect(del.svc.getDay('g', undefined, admin, NOW)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('getDay', () => {
  it("a'zolarni holati bilan qaytaradi; belgilanmaganlar null", async () => {
    const { svc, prisma } = build();
    prisma.attendanceRecord.findMany.mockResolvedValue([{ studentId: 's1', status: 'ABSENT', note: 'kasal' }]);
    const r = await svc.getDay('g', undefined, teacherA, NOW);
    expect(r.date).toBe('2026-10-04');
    expect(r.students).toEqual([
      expect.objectContaining({ studentId: 's1', status: 'ABSENT', note: 'kasal' }),
      expect.objectContaining({ studentId: 's2', status: null, note: null }),
    ]);
    expect(r.markedCount).toBe(1);
  });
});

describe('markDay', () => {
  const dto = (records: any[], date = '2026-10-04') => ({ date, records }) as any;

  it("faqat guruh a'zolari uchun saqlaydi (upsert, markedById = token'dagi o'qituvchi)", async () => {
    const { svc, prisma } = build();
    prisma.groupMember.findMany.mockResolvedValue([{ studentId: 's1' }, { studentId: 's2' }]);
    const r = await svc.markDay('g', dto([{ studentId: 's1', status: 'PRESENT' }, { studentId: 's2', status: 'EXCUSED', note: ' sababli ' }]), teacherA, NOW);
    expect(r).toEqual({ ok: true, date: '2026-10-04', saved: 2 });
    const calls = prisma.attendanceRecord.upsert.mock.calls.map((c: any) => c[0]);
    expect(calls).toHaveLength(2);
    expect(calls[0].create).toMatchObject({ groupId: 'g', studentId: 's1', status: 'PRESENT', markedById: 'tA', note: null });
    expect(calls[1].create.note).toBe('sababli');
    expect(calls[0].where.groupId_studentId_date.date.toISOString()).toBe('2026-10-04T00:00:00.000Z');
  });
  it("guruhda bo'lmagan o'quvchi / takroriy o'quvchi / boshqa o'qituvchi rad etiladi, hech narsa yozilmaydi", async () => {
    const { svc, prisma } = build();
    prisma.groupMember.findMany.mockResolvedValue([{ studentId: 's1' }]); // s9 a'zo emas
    await expect(svc.markDay('g', dto([{ studentId: 's1', status: 'PRESENT' }, { studentId: 's9', status: 'PRESENT' }]), teacherA, NOW)).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.markDay('g', dto([{ studentId: 's1', status: 'PRESENT' }, { studentId: 's1', status: 'ABSENT' }]), teacherA, NOW)).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.markDay('g', dto([{ studentId: 's1', status: 'PRESENT' }]), teacherB, NOW)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.markDay('g', dto([{ studentId: 's1', status: 'PRESENT' }], '2026-10-05'), teacherA, NOW)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.attendanceRecord.upsert).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('summary / mySummary', () => {
  it("foizni to'g'ri hisoblaydi (kelgan / jami belgilangan); belgilanmagan — null", async () => {
    const { svc, prisma } = build();
    prisma.attendanceRecord.findMany.mockResolvedValue([
      { studentId: 's1', status: 'PRESENT' }, { studentId: 's1', status: 'PRESENT' }, { studentId: 's1', status: 'ABSENT' }, { studentId: 's1', status: 'EXCUSED' },
    ]);
    const r = await svc.summary('g', 30, teacherA, NOW);
    const s1 = r.students.find((s: any) => s.studentId === 's1')!;
    expect(s1).toMatchObject({ present: 2, absent: 1, excused: 1, percent: 50 });
    expect(r.students.find((s: any) => s.studentId === 's2')!.percent).toBeNull();
    expect(r.overallPercent).toBe(50);
    await expect(svc.summary('g', 30, teacherB, NOW)).rejects.toBeInstanceOf(ForbiddenException);
  });
  it("o'quvchi faqat O'Z davomatini (token id) ko'radi va a'zo bo'lmasa 403", async () => {
    const { svc, prisma } = build();
    prisma.attendanceRecord.findMany.mockResolvedValue([{ date: new Date('2026-10-03T00:00:00Z'), status: 'PRESENT' }]);
    const r = await svc.mySummary('g', student, NOW);
    expect(prisma.attendanceRecord.findMany.mock.calls[0][0].where).toMatchObject({ groupId: 'g', studentId: 's1' });
    expect(r).toMatchObject({ present: 1, percent: 100, recent: [{ date: '2026-10-03', status: 'PRESENT' }] });
    const nm = build({ groupMember: { findUnique: jest.fn().mockResolvedValue(null) } });
    await expect(nm.svc.mySummary('g', student, NOW)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
