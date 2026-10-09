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
    groupMember: { findMany: jest.Mock };
    testAssignment: { findFirst: jest.Mock };
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
      groupMember: { findMany: jest.fn().mockResolvedValue([]) },
      testAssignment: { findFirst: jest.fn().mockResolvedValue({ id: 'asg-1' }) },
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

describe('TestSessionService — xavfsizlik', () => {
  const T = { id: 't1', status: 'PUBLISHED', deletedAt: null, startDate: null, endDate: null, durationSeconds: 600, passingScore: 50 };
  const mk = (extra: any = {}) => {
    const prisma: any = {
      test: { findUnique: jest.fn().mockResolvedValue(T) },
      testAttempt: { findUnique: jest.fn().mockResolvedValue(null) },
      testSession: { findUnique: jest.fn(), create: jest.fn(), updateMany: jest.fn() },
      testQuestion: { findMany: jest.fn().mockResolvedValue([]) },
      question: { findMany: jest.fn().mockResolvedValue([]) },
      groupMember: { findMany: jest.fn().mockResolvedValue([]) },
      testAssignment: { findFirst: jest.fn().mockResolvedValue(null) },
      answerOption: { findMany: jest.fn().mockResolvedValue([]) },
      testAnswer: { findMany: jest.fn().mockResolvedValue([]), upsert: jest.fn() },
      ...extra,
    };
    const svc = new TestSessionService(prisma, { emit: jest.fn() } as any, {} as any, { notify: jest.fn() } as any);
    return { svc, prisma };
  };

  it('biriktirilmagan testni boshlab bo\'lmaydi', async () => {
    const { svc, prisma } = mk();
    await expect(svc.start('t1', 's1')).rejects.toThrow(/biriktirilmagan/);
    expect(prisma.testSession.create).not.toHaveBeenCalled();
  });

  it('vaqti tugagach javob saqlanmaydi', async () => {
    const { svc, prisma } = mk();
    prisma.testSession.findUnique.mockResolvedValue({
      id: 'x', status: 'IN_PROGRESS', startedAt: new Date(Date.now() - 700_000), durationSeconds: 600, selectedQuestionIds: ['q1'],
    });
    await expect(svc.saveAnswer('t1', 's1', { questionId: 'q1', selectedOptionIds: ['o1'] })).rejects.toThrow(/vaqti tugagan/);
    expect(prisma.testAnswer.upsert).not.toHaveBeenCalled();
  });

  it("boshqa savolning variantini yuborib bo'lmaydi", async () => {
    const { svc, prisma } = mk();
    prisma.testSession.findUnique.mockResolvedValue({
      id: 'x', status: 'IN_PROGRESS', startedAt: new Date(), durationSeconds: 600, selectedQuestionIds: ['q1'],
    });
    prisma.answerOption.findMany.mockResolvedValue([]);
    await expect(svc.saveAnswer('t1', 's1', { questionId: 'q1', selectedOptionIds: ['alien'] })).rejects.toThrow(/tegishli emas/);
  });

  it("parallel ikkinchi submit — 409, ball ikki marta berilmaydi", async () => {
    const { svc, prisma } = mk();
    prisma.testSession.findUnique.mockResolvedValue({
      id: 'x', status: 'IN_PROGRESS', startedAt: new Date(), durationSeconds: 600, selectedQuestionIds: [], studentId: 's1',
    });
    prisma.testSession.updateMany.mockResolvedValue({ count: 0 });
    await expect(svc.submit('t1', 's1')).rejects.toThrow(/allaqachon yakunlangan/);
  });
});
