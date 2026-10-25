import { gunzipSync, gzipSync } from 'zlib';

import { SchoolBackupService } from './school-backup.service';

describe('SchoolBackupService', () => {
  const mk = () => {
    const prisma: any = {
      organization: {
        findUnique: jest.fn().mockResolvedValue({ id: 'o1', name: 'Maktab 1', storageChatId: '-1001', status: 'ACTIVE' }),
        update: jest.fn().mockResolvedValue({}),
      },
      user: { findMany: jest.fn().mockResolvedValue([{ id: 'u1' }]) },
      group: { findMany: jest.fn().mockResolvedValue([]) },
      groupMember: { findMany: jest.fn().mockResolvedValue([]) },
      payment: { findMany: jest.fn().mockResolvedValue([]) },
      attendanceRecord: { findMany: jest.fn().mockResolvedValue([]) },
      orgPayment: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const tg: any = { hasBot: true, store: jest.fn().mockResolvedValue({ messageId: 7 }) };
    return { prisma, tg, svc: new SchoolBackupService(prisma, tg) };
  };

  it("faqat o'z maktabi bo'yicha filtrlab, shu kanalga yuboradi", async () => {
    const { prisma, tg, svc } = mk();
    const r = await svc.backup('o1');
    expect(r.ok).toBe(true);
    expect(prisma.user.findMany.mock.calls[0][0].where).toEqual({ organizationId: 'o1' });
    expect(prisma.group.findMany.mock.calls[0][0].where).toEqual({ organizationId: 'o1' });
    const [buf, name, mime, chat] = tg.store.mock.calls[0];
    expect(chat).toBe('-1001');
    expect(mime).toBe('application/gzip');
    expect(name).toMatch(/\.json\.gz$/);
    expect(JSON.parse(gunzipSync(buf).toString()).users).toHaveLength(1);
    expect(prisma.organization.update.mock.calls[0][0].data.lastBackupStatus).toMatch(/^OK/);
  });

  it('kanal bo\'lmasa rad etadi', async () => {
    const { prisma, svc } = mk();
    prisma.organization.findUnique.mockResolvedValue({ id: 'o1', name: 'x', storageChatId: null });
    await expect(svc.backup('o1')).rejects.toThrow();
  });

  it('yuborish xatosini holatga yozadi', async () => {
    const { prisma, tg, svc } = mk();
    tg.store.mockRejectedValue(new Error('boom'));
    await expect(svc.backup('o1')).rejects.toThrow('boom');
    expect(prisma.organization.update.mock.calls[0][0].data.lastBackupStatus).toContain('boom');
  });
});

describe('SchoolBackupService.restore', () => {
  const pack = (o: any) => gzipSync(Buffer.from(JSON.stringify({ version: 1, createdAt: '2026-10-20T00:00:00Z', org: { id: 'o1' }, ...o })));
  const mk = () => {
    const created: Record<string, any[]> = {};
    const tx: any = new Proxy({}, { get: (_t, model: string) => ({ createMany: jest.fn(async ({ data }: any) => { created[model] = [...(created[model] ?? []), ...data]; }) }) });
    const prisma: any = {
      organization: { findUnique: jest.fn().mockResolvedValue({ id: 'o1' }) },
      user: { findMany: jest.fn().mockImplementation(({ where }: any) => Promise.resolve(where.organizationId ? [{ id: 's1' }, { id: 't1' }] : [{ id: 't1' }])) },
      group: { findMany: jest.fn().mockImplementation(({ where }: any) => Promise.resolve(where.organizationId ? [{ id: 'gOld' }] : [{ id: 'gOld' }])) },
      groupMember: { findMany: jest.fn().mockResolvedValue([]) },
      payment: { findMany: jest.fn().mockResolvedValue([{ id: 'pExists' }]) },
      attendanceRecord: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn().mockImplementation((fn: any) => fn(tx)),
    };
    return { prisma, created, svc: new SchoolBackupService(prisma, {} as any) };
  };
  const backup = {
    groups: [{ id: 'gOld', name: 'A' }, { id: 'gNew', name: 'B', teacherId: 't1', monthlyFee: 5 }],
    members: [{ id: 'm1', groupId: 'gNew', studentId: 's1' }, { id: 'm2', groupId: 'gNew', studentId: 'sOtherOrg' }],
    payments: [
      { id: 'pExists', groupId: 'gOld', studentId: 's1', month: '2026-10', status: 'PAID', markedById: 't1' },
      { id: 'pNew', groupId: 'gNew', studentId: 's1', month: '2026-09', status: 'PAID', amount: 5, markedById: 't1' },
      { id: 'pBadMarker', groupId: 'gNew', studentId: 's1', month: '2026-08', status: 'PAID', markedById: 'ghost' },
    ],
    attendance: [{ id: 'a1', groupId: 'gNew', studentId: 's1', date: '2026-10-01T00:00:00Z', status: 'PRESENT', markedById: 't1' }],
  };

  it('dry-run: faqat hisoblaydi, hech narsa yozmaydi', async () => {
    const { svc, prisma } = mk();
    const r = await svc.restore('o1', pack(backup), true);
    expect(r.toRestore).toEqual({ groups: 1, members: 1, payments: 1, attendance: 1 });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it("apply: yo'qolganlarni qaytaradi, guruhni shu maktabga bog'laydi", async () => {
    const { svc, created } = mk();
    await svc.restore('o1', pack(backup), false);
    expect(created.group).toHaveLength(1);
    expect(created.group[0]).toMatchObject({ id: 'gNew', organizationId: 'o1', teacherId: 't1' });
    expect(created.groupMember.map((m) => m.id)).toEqual(['m1']);
    expect(created.payment.map((p) => p.id)).toEqual(['pNew']);
    expect(created.attendanceRecord).toHaveLength(1);
  });
  it('boshqa maktab zaxirasini rad etadi', async () => {
    const { svc } = mk();
    await expect(svc.restore('o2', pack(backup), true)).rejects.toThrow(/boshqa maktab/);
  });
  it("noto'g'ri fayl rad etiladi", async () => {
    const { svc } = mk();
    await expect(svc.restore('o1', Buffer.from('xx'), true)).rejects.toThrow();
  });
});
