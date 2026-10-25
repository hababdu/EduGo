import { LessonLogService } from './lesson-log.service';

describe('LessonLogService', () => {
  const group = { id: 'g1', teacherId: 't1', organizationId: 'o1', deletedAt: null };
  const mk = (member = true) => {
    const prisma: any = {
      group: { findUnique: jest.fn().mockResolvedValue(group) },
      groupMember: { findFirst: jest.fn().mockResolvedValue(member ? { id: 'm' } : null) },
      lessonLog: {
        findMany: jest.fn().mockResolvedValue([{ id: 'l', date: new Date('2026-10-20T00:00:00Z'), topic: 'Present', homework: null }]),
        upsert: jest.fn().mockImplementation(({ create }: any) => Promise.resolve({ id: 'l', ...create })),
      },
    };
    return { prisma, svc: new LessonLogService(prisma) };
  };
  const now = new Date('2026-10-25T05:00:00Z');
  const teacher: any = { id: 't1', role: 'TEACHER' };

  it("o'z guruhi o'qituvchisi yozadi", async () => {
    const { svc, prisma } = mk();
    const r = await svc.upsert('g1', { date: '2026-10-24', topic: ' Present Simple ', homework: 'Ex 4' }, teacher, now);
    expect(r).toMatchObject({ date: '2026-10-24', topic: 'Present Simple', homework: 'Ex 4' });
    expect(prisma.lessonLog.upsert.mock.calls[0][0].where).toEqual({ groupId_date: { groupId: 'g1', date: new Date('2026-10-24T00:00:00Z') } });
  });
  it("boshqa o'qituvchi yoza olmaydi", async () => {
    const { svc } = mk();
    await expect(svc.upsert('g1', { date: '2026-10-24', topic: 'xx' }, { id: 't2', role: 'TEACHER' } as any, now)).rejects.toThrow();
  });
  it("o'quvchi yoza olmaydi, lekin a'zosi bo'lsa o'qiydi", async () => {
    const { svc } = mk();
    const st: any = { id: 's1', role: 'STUDENT' };
    await expect(svc.upsert('g1', { date: '2026-10-24', topic: 'xx' }, st, now)).rejects.toThrow();
    expect((await svc.list('g1', st))[0].date).toBe('2026-10-20');
  });
  it("a'zo bo'lmagan o'quvchi o'qiy olmaydi", async () => {
    const { svc } = mk(false);
    await expect(svc.list('g1', { id: 's9', role: 'STUDENT' } as any)).rejects.toThrow();
  });
  it('boshqa maktab admini rad etiladi', async () => {
    const { svc } = mk();
    await expect(svc.list('g1', { id: 'a', role: 'ADMIN', organizationId: 'o2' } as any)).rejects.toThrow();
  });
});
