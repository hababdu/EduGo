import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

const teacherA = { id: 'teacherA', telegramId: '1', role: 'TEACHER', status: 'ACTIVE' };
const teacherB = { id: 'teacherB', telegramId: '2', role: 'TEACHER', status: 'ACTIVE' };
const admin = { id: 'adm1', telegramId: '3', role: 'ADMIN', status: 'ACTIVE' };

function build() {
  const prisma: any = {
    test: { findUnique: jest.fn().mockImplementation(async ({ where }) => (where.id === 'test1' ? { id: 'test1', title: 'Algebra', createdById: 'teacherA' } : null)) },
    testAttempt: { findMany: jest.fn().mockResolvedValue([{ score: 8, passed: true, timeSpentSeconds: 600 }, { score: 4, passed: false, timeSpentSeconds: 300 }]) },
    testQuestion: { findMany: jest.fn().mockResolvedValue([]) },
    testAnswer: { findMany: jest.fn().mockResolvedValue([]) },
  };
  return { svc: new AnalyticsService(prisma), prisma };
}

describe('AnalyticsService — ownership', () => {
  it("o'qituvchi O'Z testining statistikasini ko'radi", async () => {
    const { svc } = build();
    expect((await svc.getTestAnalytics('test1', teacherA)).participants).toBe(2);
  });

  it("o'qituvchi BOSHQA o'qituvchining testi statistikasini ko'ra olmaydi (test ham, savol tahlili ham)", async () => {
    const { svc, prisma } = build();
    await expect(svc.getTestAnalytics('test1', teacherB)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.getQuestionAnalyticsForTest('test1', teacherB)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.testAttempt.findMany).not.toHaveBeenCalled(); // ma'lumot o'qilmadi ham
  });

  it('admin hamma testni ko\'radi', async () => {
    const { svc } = build();
    expect((await svc.getTestAnalytics('test1', admin)).testTitle).toBe('Algebra');
    await expect(svc.getQuestionAnalyticsForTest('test1', admin)).resolves.toEqual([]);
  });

  it('mavjud bo\'lmagan test — 404 (savol tahlilida ham)', async () => {
    const { svc } = build();
    await expect(svc.getTestAnalytics('yoq', admin)).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.getQuestionAnalyticsForTest('yoq', admin)).rejects.toBeInstanceOf(NotFoundException);
  });
});
