import { makeInviteCode, ParentsService } from './parents.service';

describe('ParentsService', () => {
  it('invite kodi 8 belgili va o\'xshash belgisiz', () => {
    for (let i = 0; i < 50; i++) expect(makeInviteCode()).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
  });

  const mk = (over: any = {}) => {
    const prisma: any = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 's1', role: 'STUDENT', organizationId: 'o1', deletedAt: null, firstName: 'Vali', lastName: null }),
        update: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({ id: 'p1', role: 'PARENT' }),
      },
      groupMember: { findFirst: jest.fn().mockResolvedValue({ id: 'm' }) },
      parentInvite: { create: jest.fn().mockResolvedValue({}), findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}) },
      parentLink: { upsert: jest.fn().mockResolvedValue({}), findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]), delete: jest.fn() },
      $transaction: jest.fn().mockResolvedValue([]),
      ...over,
    };
    const tg: any = { botUsername: jest.fn().mockResolvedValue('edugo_bot') };
    return { prisma, svc: new ParentsService(prisma, {} as any, tg) };
  };

  describe('createInvite', () => {
    it("o'quvchi o'zi uchun havola yaratadi", async () => {
      const { svc } = mk();
      const r = await svc.createInvite({ id: 's1', role: 'STUDENT' } as any);
      expect(r.link).toBe(`https://t.me/edugo_bot?start=parent_${r.code}`);
    });
    it("o'quvchi boshqasi uchun yarata olmaydi (studentId e'tiborga olinmaydi)", async () => {
      const { svc, prisma } = mk();
      await svc.createInvite({ id: 's1', role: 'STUDENT' } as any, 'sX');
      expect(prisma.parentInvite.create.mock.calls[0][0].data.studentId).toBe('s1');
    });
    it("boshqa maktab admini va begona o'qituvchi rad etiladi", async () => {
      const { svc, prisma } = mk();
      await expect(svc.createInvite({ id: 'a', role: 'ADMIN', organizationId: 'o2' } as any, 's1')).rejects.toThrow();
      prisma.groupMember.findFirst.mockResolvedValue(null);
      await expect(svc.createInvite({ id: 't', role: 'TEACHER' } as any, 's1')).rejects.toThrow();
    });
  });

  describe('linkByCode', () => {
    const tgUser = { id: 777, first_name: 'Ota' };
    const valid = { id: 'i1', studentId: 's1', usedAt: null, expiresAt: new Date(Date.now() + 1e6) };

    it('yangi ota-ona akkaunti yaratiladi va bog\'lanadi', async () => {
      const { svc, prisma } = mk();
      prisma.parentInvite.findUnique.mockResolvedValue(valid);
      prisma.user.findUnique.mockImplementation(({ where }: any) => Promise.resolve(where.id === 's1' ? { id: 's1', firstName: 'Vali', lastName: null, deletedAt: null } : null));
      const r = await svc.linkByCode('abcd2345', tgUser);
      expect(r).toEqual({ ok: true, childName: 'Vali' });
      expect(prisma.user.create.mock.calls[0][0].data.role).toBe('PARENT');
      expect(prisma.$transaction).toHaveBeenCalled();
    });
    it('eskirgan yoki ishlatilgan kod rad etiladi', async () => {
      const { svc, prisma } = mk();
      prisma.parentInvite.findUnique.mockResolvedValue({ ...valid, usedAt: new Date() });
      await expect(svc.linkByCode('ABCD2345', tgUser)).rejects.toThrow();
      prisma.parentInvite.findUnique.mockResolvedValue({ ...valid, expiresAt: new Date(Date.now() - 1) });
      await expect(svc.linkByCode('ABCD2345', tgUser)).rejects.toThrow();
    });
    it("o'qituvchi/admin akkaunti ota-onaga aylantirilmaydi", async () => {
      const { svc, prisma } = mk();
      prisma.parentInvite.findUnique.mockResolvedValue(valid);
      prisma.user.findUnique.mockImplementation(({ where }: any) =>
        Promise.resolve(where.id === 's1' ? { id: 's1', firstName: 'Vali', deletedAt: null } : { id: 'u9', role: 'TEACHER', status: 'ACTIVE', deletedAt: null, _count: { groupMemberships: 0, testAttempts: 0 } }));
      await expect(svc.linkByCode('ABCD2345', tgUser)).rejects.toThrow(/boshqa rolda/);
    });
    it("bo'sh (yangi) o'quvchi akkaunti ota-onaga aylantiriladi", async () => {
      const { svc, prisma } = mk();
      prisma.parentInvite.findUnique.mockResolvedValue(valid);
      prisma.user.findUnique.mockImplementation(({ where }: any) =>
        Promise.resolve(where.id === 's1' ? { id: 's1', firstName: 'Vali', deletedAt: null } : { id: 'u9', role: 'STUDENT', organizationId: null, status: 'ACTIVE', deletedAt: null, _count: { groupMemberships: 0, testAttempts: 0 } }));
      await svc.linkByCode('ABCD2345', tgUser);
      expect(prisma.user.update.mock.calls[0][0].data).toEqual({ role: 'PARENT' });
    });
    it("faol o'quvchi akkaunti ota-onaga aylantirilmaydi", async () => {
      const { svc, prisma } = mk();
      prisma.parentInvite.findUnique.mockResolvedValue(valid);
      prisma.user.findUnique.mockImplementation(({ where }: any) =>
        Promise.resolve(where.id === 's1' ? { id: 's1', firstName: 'Vali', deletedAt: null } : { id: 'u9', role: 'STUDENT', organizationId: 'o1', status: 'ACTIVE', deletedAt: null, _count: { groupMemberships: 1, testAttempts: 0 } }));
      await expect(svc.linkByCode('ABCD2345', tgUser)).rejects.toThrow();
    });
  });

  it('ota-ona faqat bog\'langan farzandini ko\'radi', async () => {
    const { svc, prisma } = mk();
    prisma.parentLink.findUnique.mockResolvedValue(null);
    await expect(svc.childDetail('p1', 's1')).rejects.toThrow();
    await expect(svc.unlink('p1', 's1')).rejects.toThrow();
  });
});

import { AttendanceService } from '../groups/attendance.service';

describe('Davomat → ota-onaga xabar', () => {
  const mk = (prev: any[]) => {
    const prisma: any = {
      group: { findUnique: jest.fn().mockResolvedValue({ id: 'g', teacherId: 't1', organizationId: 'o1', deletedAt: null, lessonDays: [], name: 'Ingliz' }) },
      groupMember: { findMany: jest.fn().mockImplementation(({ where }: any) => Promise.resolve(where.studentId.in.map((studentId: string) => ({ studentId })))) },
      attendanceRecord: { findMany: jest.fn().mockResolvedValue(prev), upsert: jest.fn().mockReturnValue({}) },
      parentLink: { findMany: jest.fn().mockResolvedValue([{ parentId: 'p1', student: { firstName: 'Vali', lastName: null } }]) },
      $transaction: jest.fn().mockResolvedValue([]),
    };
    const notifications: any = { notify: jest.fn().mockResolvedValue({}) };
    return { prisma, notifications, svc: new AttendanceService(prisma, notifications) };
  };
  const teacher: any = { id: 't1', role: 'TEACHER' };
  const flush = () => new Promise((r) => setImmediate(r));

  it('yangi "kelmadi" uchun ota-onaga xabar ketadi', async () => {
    const { svc, notifications } = mk([]);
    await svc.markDay('g', { date: '2026-10-24', records: [{ studentId: 's1', status: 'ABSENT' }, { studentId: 's2', status: 'PRESENT' }] } as any, teacher, new Date('2026-10-25T05:00:00Z'));
    await flush();
    expect(notifications.notify).toHaveBeenCalledTimes(1);
    expect(notifications.notify.mock.calls[0][0]).toBe('p1');
  });
  it('avval ham "kelmadi" bo\'lgan bo\'lsa takror xabar ketmaydi', async () => {
    const { svc, notifications } = mk([{ studentId: 's1', status: 'ABSENT' }]);
    await svc.markDay('g', { date: '2026-10-24', records: [{ studentId: 's1', status: 'ABSENT' }] } as any, teacher, new Date('2026-10-25T05:00:00Z'));
    await flush();
    expect(notifications.notify).not.toHaveBeenCalled();
  });
});
