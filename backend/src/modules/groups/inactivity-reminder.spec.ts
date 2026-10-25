import { InactivityReminderService } from './inactivity-reminder.service';

describe('InactivityReminderService', () => {
  const evening = new Date('2026-10-26T13:00:00Z'); // 18:00 Toshkent
  const mk = (recent: string[] = []) => {
    const prisma: any = {
      user: { findMany: jest.fn().mockResolvedValue([{ id: 's1', firstName: 'Vali' }, { id: 's2', firstName: 'Sami' }]) },
      notification: { findMany: jest.fn().mockResolvedValue(recent.map((userId) => ({ userId }))) },
    };
    const notifications: any = { notify: jest.fn().mockResolvedValue({}) };
    return { prisma, notifications, svc: new InactivityReminderService(prisma, notifications) };
  };

  it('uzoq kirmaganlarga eslatadi, so\'rov 3-30 kun oralig\'ini filtrlaydi', async () => {
    const { svc, prisma, notifications } = mk();
    expect(await svc.sweep(evening)).toBe(2);
    const where = prisma.user.findMany.mock.calls[0][0].where;
    expect(where.role).toBe('STUDENT');
    expect(where.lastActiveAt.lt.getTime()).toBe(evening.getTime() - 3 * 86_400_000);
    expect(where.lastActiveAt.gt.getTime()).toBe(evening.getTime() - 30 * 86_400_000);
    expect(notifications.notify.mock.calls[0][3]).toContain('Vali');
  });
  it('bu hafta eslatilganga qayta yubormaydi', async () => {
    const { svc } = mk(['s1']);
    expect(await svc.sweep(evening)).toBe(1);
  });
  it('kechqurundan boshqa vaqtda yubormaydi', async () => {
    const { svc, prisma } = mk();
    expect(await svc.sweep(new Date('2026-10-26T04:00:00Z'))).toBe(0);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });
});
