import { PaymentReminderService } from './payment-reminder.service';

describe('PaymentReminderService', () => {
  // 2026-10-05 11:00 Toshkent = 06:00 UTC
  const day5 = new Date('2026-10-05T06:00:00.000Z');
  const stu = (id: string, over: any = {}) => ({ joinedAt: new Date('2026-09-01T00:00:00Z'), student: { id, role: 'STUDENT', status: 'ACTIVE', deletedAt: null, ...over } });
  const mk = () => {
    const prisma: any = {
      group: { findMany: jest.fn().mockResolvedValue([{
        id: 'g1', name: 'Ingliz', organizationId: 'o1',
        members: [stu('s1'), stu('s2'), stu('s3', { status: 'BLOCKED' }), { joinedAt: new Date('2026-11-20T00:00:00Z'), student: { id: 's4', role: 'STUDENT', status: 'ACTIVE', deletedAt: null } }],
        payments: [{ studentId: 's1' }],
      }]) },
      notification: { findMany: jest.fn().mockResolvedValue([]) },
      user: { findMany: jest.fn().mockResolvedValue([{ id: 'adm1' }]) },
    };
    const notifications: any = { notify: jest.fn().mockResolvedValue({}) };
    return { prisma, notifications, svc: new PaymentReminderService(prisma, notifications) };
  };

  it("faqat to'lamagan faol o'quvchiga va adminga yuboradi", async () => {
    const { svc, notifications } = mk();
    const r = await svc.sweep(day5);
    expect(r).toEqual({ students: 1, admins: 1 });
    const to = notifications.notify.mock.calls.map((c: any[]) => c[0]);
    expect(to).toEqual(['s2', 'adm1']);
  });
  it('eslatma kuni bo\'lmasa yoki 10:00 dan oldin bo\'lsa hech narsa yubormaydi', async () => {
    const { svc, notifications } = mk();
    expect(await svc.sweep(new Date('2026-10-06T06:00:00.000Z'))).toEqual({ students: 0, admins: 0 });
    expect(await svc.sweep(new Date('2026-10-05T03:00:00.000Z'))).toEqual({ students: 0, admins: 0 });
    expect(notifications.notify).not.toHaveBeenCalled();
  });
  it('allaqachon yuborilgan bo\'lsa takrorlamaydi', async () => {
    const { svc, prisma } = mk();
    prisma.notification.findMany.mockResolvedValue([{ userId: 's2' }, { userId: 'adm1' }]);
    expect(await svc.sweep(day5)).toEqual({ students: 0, admins: 0 });
  });
});
