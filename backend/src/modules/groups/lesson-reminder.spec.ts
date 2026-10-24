import { LessonReminderService, minutesOf } from './lesson-reminder.service';

describe('LessonReminderService', () => {
  it('minutesOf', () => {
    expect(minutesOf('09:30')).toBe(570);
    expect(minutesOf('9:30')).toBeNull();
  });

  // 2026-10-26 (Dushanba) 09:10 Toshkent = 04:10 UTC
  const now = new Date('2026-10-26T04:10:00.000Z');
  const mk = (start: string, already: string[] = []) => {
    const prisma: any = {
      group: { findMany: jest.fn().mockResolvedValue([{ id: 'g', name: 'Ingliz', room: '2', lessonStartTime: start, members: [
        { student: { id: 's1', role: 'STUDENT', status: 'ACTIVE', deletedAt: null } },
        { student: { id: 's2', role: 'STUDENT', status: 'ACTIVE', deletedAt: null } },
      ] }]) },
      notification: { findMany: jest.fn().mockResolvedValue(already.map((userId) => ({ userId }))) },
    };
    const notifications: any = { notify: jest.fn().mockResolvedValue({}) };
    return { prisma, notifications, svc: new LessonReminderService(prisma, notifications) };
  };

  it('30 daqiqa ichida boshlanadigan darsga eslatadi', async () => {
    const { svc, notifications } = mk('09:30');
    expect(await svc.sweep(now)).toBe(2);
    expect(notifications.notify.mock.calls[0][3]).toContain('20 daqiqadan');
  });
  it('allaqachon yuborilganga qayta yubormaydi', async () => {
    const { svc, notifications } = mk('09:30', ['s1']);
    expect(await svc.sweep(now)).toBe(1);
    expect(notifications.notify).toHaveBeenCalledTimes(1);
  });
  it('uzoq yoki o\'tib ketgan darsga yubormaydi', async () => {
    expect(await mk('11:00').svc.sweep(now)).toBe(0);
    expect(await mk('09:00').svc.sweep(now)).toBe(0);
  });
});
