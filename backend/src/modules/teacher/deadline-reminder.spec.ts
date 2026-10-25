import { DeadlineReminderService } from './deadline-reminder.service';

describe('DeadlineReminderService', () => {
  const now = new Date('2026-10-26T04:00:00.000Z');
  const mk = (hoursLeft: number, already: string[] = []) => {
    const stu = (id: string) => ({ student: { id, role: 'STUDENT', status: 'ACTIVE', deletedAt: null } });
    const prisma: any = {
      teacherAssignment: { findMany: jest.fn().mockResolvedValue([{
        id: 'a', title: 'HW', dueAt: new Date(now.getTime() + hoursLeft * 3_600_000),
        submissions: [{ studentId: 's1' }],
        group: { members: [stu('s1'), stu('s2'), stu('s3')] },
      }]) },
      notification: { findMany: jest.fn().mockResolvedValue(already.map((userId) => ({ userId }))) },
    };
    const notifications: any = { notify: jest.fn().mockResolvedValue({}) };
    return { notifications, svc: new DeadlineReminderService(prisma, notifications) };
  };

  it('topshirmaganlarga eslatadi, topshirganga yubormaydi', async () => {
    const { svc, notifications } = mk(20);
    expect(await svc.sweep(now)).toBe(2);
    const ids = notifications.notify.mock.calls.map((c: any[]) => c[0]);
    expect(ids).toEqual(['s2', 's3']);
    expect(notifications.notify.mock.calls[0][1]).toBe('DEADLINE_REMINDER');
  });
  it('2 soatdan kam qolsa shoshilinch matn', async () => {
    const { svc, notifications } = mk(1.5);
    await svc.sweep(now);
    expect(notifications.notify.mock.calls[0][2]).toContain('2 soatdan kam');
  });
  it('allaqachon yuborilganga takror yubormaydi', async () => {
    const { svc } = mk(20, ['s2', 's3']);
    expect(await svc.sweep(now)).toBe(0);
  });
});
