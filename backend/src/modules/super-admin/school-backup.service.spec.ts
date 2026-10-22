import { gunzipSync } from 'zlib';
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
