import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateGroupDto, UpdateGroupDto } from './dto/groups.dto';
import { isoWeekday, normalizeSchedule, tashkentWeekday } from './schedule.util';
import { ScheduleService } from './schedule.service';
import { AttendanceService } from './attendance.service';

const errs = async (cls: any, body: object) => (await validate(plainToInstance(cls, body))).map((e) => e.property);

describe('schedule.util', () => {
  it('isoWeekday: Dushanba=1 … Yakshanba=7', () => {
    expect(isoWeekday('2026-10-05')).toBe(1); // dushanba
    expect(isoWeekday('2026-10-04')).toBe(7); // yakshanba
    expect(isoWeekday('2026-10-10')).toBe(6);
  });

  it("tashkentWeekday: UTC 20:00 shanba — Toshkentda allaqachon yakshanba", () => {
    expect(tashkentWeekday(new Date('2026-10-03T20:00:00Z'))).toBe(7);
    expect(tashkentWeekday(new Date('2026-10-03T18:59:00Z'))).toBe(6);
  });

  it('normalizeSchedule: kunlarni tartiblaydi va takrorlarni olib tashlaydi', () => {
    expect(normalizeSchedule({ lessonDays: [5, 1, 3, 1] }).lessonDays).toEqual([1, 3, 5]);
  });

  it('normalizeSchedule: tugash vaqti boshlanishdan keyin bo\'lishi shart', () => {
    expect(() => normalizeSchedule({ lessonStartTime: '10:00', lessonEndTime: '09:00' })).toThrow();
    expect(() => normalizeSchedule({ lessonStartTime: '10:00', lessonEndTime: '10:00' })).toThrow();
    expect(() => normalizeSchedule({ lessonEndTime: '11:00' })).toThrow(); // boshlanishsiz
    expect(normalizeSchedule({ lessonStartTime: '10:00', lessonEndTime: '11:30' })).toMatchObject({ lessonEndTime: '11:30' });
  });

  it("normalizeSchedule: mavjud boshlanish vaqti bilan taqqoslaydi (faqat tugash o'zgarsa ham)", () => {
    expect(() => normalizeSchedule({ lessonEndTime: '09:00' }, { lessonStartTime: '10:00' })).toThrow();
    expect(normalizeSchedule({ lessonEndTime: '12:00' }, { lessonStartTime: '10:00' })).toMatchObject({ lessonEndTime: '12:00' });
  });

  it("normalizeSchedule: bo'sh qiymat jadvalni tozalaydi", () => {
    expect(normalizeSchedule({ lessonDays: [], lessonStartTime: '', room: '  ' })).toEqual({ lessonDays: [], lessonStartTime: null, room: null });
  });
});

describe('Group DTO: jadval validatsiyasi', () => {
  const base = { name: 'G' };
  it('to\'g\'ri jadval o\'tadi', async () => {
    expect(await errs(CreateGroupDto, { ...base, lessonDays: [1, 3, 5], lessonStartTime: '09:30', lessonEndTime: '11:00', room: '3-xona' })).toEqual([]);
    expect(await errs(UpdateGroupDto, { lessonDays: [] })).toEqual([]);
  });
  it.each([
    [{ lessonDays: [0] }],
    [{ lessonDays: [8] }],
    [{ lessonDays: [1, 1] }],
    [{ lessonDays: [1.5] }],
    [{ lessonDays: 'dushanba' }],
    [{ lessonDays: [1, 2, 3, 4, 5, 6, 7, 1] }],
    [{ lessonStartTime: '9:30' }],
    [{ lessonStartTime: '24:00' }],
    [{ lessonStartTime: '09:60' }],
    [{ lessonEndTime: "o'n" }],
    [{ room: 'x'.repeat(61) }],
  ])('noto\'g\'ri jadval rad etiladi %j', async (bad) => {
    expect((await errs(UpdateGroupDto, bad)).length).toBeGreaterThan(0);
  });
});

describe('ScheduleService.today', () => {
  const NOW = new Date('2026-10-05T04:00:00Z'); // Toshkent: dushanba 09:00
  const groupRows = [
    { id: 'g2', name: 'Kechki', lessonStartTime: '18:00', lessonEndTime: null, room: null, teacher: null, _count: { members: 5 } },
    { id: 'g1', name: 'Ertalab', lessonStartTime: '09:00', lessonEndTime: '10:30', room: '2-xona', teacher: { id: 't', firstName: 'A', lastName: 'B' }, _count: { members: 12 } },
  ];
  const build = () => {
    const prisma: any = {
      group: { findMany: jest.fn().mockResolvedValue(groupRows) },
      attendanceRecord: { groupBy: jest.fn().mockResolvedValue([{ groupId: 'g1', _count: { _all: 12 } }]) },
    };
    return { svc: new ScheduleService(prisma), prisma };
  };

  it("o'qituvchi: faqat o'z guruhlari, bugungi hafta kuni bo'yicha, vaqt bo'yicha tartiblangan", async () => {
    const { svc, prisma } = build();
    const res = await svc.today({ id: 'teacher-1', role: 'TEACHER' } as any, NOW);
    const where = prisma.group.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ deletedAt: null, lessonDays: { has: 1 }, teacherId: 'teacher-1' });
    expect(res.map((g: any) => g.id)).toEqual(['g1', 'g2']);
    expect(res[0]).toMatchObject({ startTime: '09:00', endTime: '10:30', room: '2-xona', membersCount: 12, markedCount: 12 });
    expect(res[1].markedCount).toBe(0);
  });

  it("admin: hamma guruh (teacherId filtri yo'q)", async () => {
    const { svc, prisma } = build();
    await svc.today({ id: 'a', role: 'ADMIN' } as any, NOW);
    expect(prisma.group.findMany.mock.calls[0][0].where.teacherId).toBeUndefined();
    expect(prisma.group.findMany.mock.calls[0][0].where.members).toBeUndefined();
  });

  it("o'quvchi: faqat a'zo bo'lgan guruhlari va davomat ma'lumoti so'ralmaydi", async () => {
    const { svc, prisma } = build();
    await svc.today({ id: 's1', role: 'STUDENT' } as any, NOW);
    expect(prisma.group.findMany.mock.calls[0][0].where.members).toEqual({ some: { studentId: 's1' } });
    expect(prisma.attendanceRecord.groupBy).not.toHaveBeenCalled();
  });
});

describe('AttendanceService.getDay: isLessonDay', () => {
  const run = async (lessonDays: number[] | undefined, date: string) => {
    const prisma: any = {
      group: { findUnique: jest.fn().mockResolvedValue({ id: 'g', teacherId: 't', deletedAt: null, lessonDays }) },
      groupMember: { findMany: jest.fn().mockResolvedValue([]) },
      attendanceRecord: { findMany: jest.fn().mockResolvedValue([]) },
    };
    return new AttendanceService(prisma).getDay('g', date, { id: 't', role: 'TEACHER' } as any, new Date('2026-10-06T08:00:00Z'));
  };
  it('jadvalda bo\'lmagan kun — false; jadval bo\'sh bo\'lsa — true', async () => {
    expect((await run([1, 3], '2026-10-05')).isLessonDay).toBe(true); // dushanba
    expect((await run([1, 3], '2026-10-06')).isLessonDay).toBe(false); // seshanba
    expect((await run([], '2026-10-06')).isLessonDay).toBe(true);
    expect((await run(undefined, '2026-10-06')).isLessonDay).toBe(true);
  });
});
