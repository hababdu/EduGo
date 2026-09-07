import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TestSessionService } from './test-session.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ChallengesService } from '../../gamification/challenges/challenges.service';
import { NotificationsService } from '../../notifications/notifications.service';

/**
 * 88-band: "Ayniqsa testning 'bir marta ishlash' qoidasi alohida test qilinsin."
 * Bu fayl aynan shu talabni bajaradi.
 */
describe('TestSessionService — 25-band: testni bir marta ishlash qoidasi', () => {
  let service: TestSessionService;
  let prisma: {
    test: { findUnique: jest.Mock };
    testAttempt: { findUnique: jest.Mock };
    testSession: { findUnique: jest.Mock; create: jest.Mock };
    testQuestion: { findMany: jest.Mock };
    question: { findMany: jest.Mock };
  };

  const PUBLISHED_TEST = {
    id: 'test-1',
    status: 'PUBLISHED',
    deletedAt: null,
    startDate: null,
    endDate: null,
    durationSeconds: 600,
    randomQuestions: false,
    questionCount: null,
  };

  beforeEach(async () => {
    prisma = {
      test: { findUnique: jest.fn().mockResolvedValue(PUBLISHED_TEST) },
      testAttempt: { findUnique: jest.fn() },
      testSession: { findUnique: jest.fn(), create: jest.fn() },
      testQuestion: { findMany: jest.fn().mockResolvedValue([]) },
      question: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TestSessionService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        { provide: ChallengesService, useValue: {} },
        { provide: NotificationsService, useValue: { notify: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(TestSessionService);
  });

  it('Attempt mavjud va isRetakeAllowed=false bo\'lsa, start() ForbiddenException tashlaydi', async () => {
    prisma.testAttempt.findUnique.mockResolvedValue({
      id: 'attempt-1',
      isRetakeAllowed: false,
    });

    await expect(service.start('test-1', 'student-1')).rejects.toThrow(ForbiddenException);
    await expect(service.start('test-1', 'student-1')).rejects.toThrow(/allaqachon tugatilgan/);

    // MUHIM: bu holatda yangi TestSession HECH QACHON yaratilmasligi kerak
    expect(prisma.testSession.create).not.toHaveBeenCalled();
  });

  it('Attempt mavjud, lekin admin isRetakeAllowed=true qilgan bo\'lsa, start() davom etadi (26-band)', async () => {
    prisma.testAttempt.findUnique.mockResolvedValue({
      id: 'attempt-1',
      isRetakeAllowed: true,
    });
    prisma.testSession.findUnique.mockResolvedValue(null); // eski sessiya reopen'da o'chirilgan
    prisma.testSession.create.mockResolvedValue({
      id: 'session-2',
      testId: 'test-1',
      studentId: 'student-1',
      startedAt: new Date(),
      durationSeconds: 600,
      selectedQuestionIds: [],
      answerOrderSeed: 1,
    });

    await expect(service.start('test-1', 'student-1')).resolves.toBeDefined();
    expect(prisma.testSession.create).toHaveBeenCalledTimes(1);
  });

  it('Attempt umuman yo\'q (birinchi marta) bo\'lsa, start() erkin ishlaydi', async () => {
    prisma.testAttempt.findUnique.mockResolvedValue(null);
    prisma.testSession.findUnique.mockResolvedValue(null);
    prisma.testSession.create.mockResolvedValue({
      id: 'session-1',
      testId: 'test-1',
      studentId: 'student-1',
      startedAt: new Date(),
      durationSeconds: 600,
      selectedQuestionIds: [],
      answerOrderSeed: 1,
    });

    const result = await service.start('test-1', 'student-1');
    expect(result.sessionId).toBe('session-1');
  });

  it('Test PUBLISHED bo\'lmasa (masalan DRAFT), start() NotFoundException tashlaydi', async () => {
    prisma.test.findUnique.mockResolvedValue({ ...PUBLISHED_TEST, status: 'DRAFT' });

    await expect(service.start('test-1', 'student-1')).rejects.toThrow(NotFoundException);
  });

  it('Test muddati tugagan bo\'lsa (endDate o\'tmishda), start() ForbiddenException tashlaydi', async () => {
    prisma.test.findUnique.mockResolvedValue({
      ...PUBLISHED_TEST,
      endDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // kecha tugagan
    });

    await expect(service.start('test-1', 'student-1')).rejects.toThrow(ForbiddenException);
  });
});
