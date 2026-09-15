"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const common_1 = require("@nestjs/common");
const test_session_service_1 = require("./test-session.service");
const prisma_service_1 = require("../../../prisma/prisma.service");
const event_emitter_1 = require("@nestjs/event-emitter");
const challenges_service_1 = require("../../gamification/challenges/challenges.service");
const notifications_service_1 = require("../../notifications/notifications.service");
describe('TestSessionService — 25-band: testni bir marta ishlash qoidasi', () => {
    let service;
    let prisma;
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
        const moduleRef = await testing_1.Test.createTestingModule({
            providers: [
                test_session_service_1.TestSessionService,
                { provide: prisma_service_1.PrismaService, useValue: prisma },
                { provide: event_emitter_1.EventEmitter2, useValue: { emit: jest.fn() } },
                { provide: challenges_service_1.ChallengesService, useValue: {} },
                { provide: notifications_service_1.NotificationsService, useValue: { notify: jest.fn() } },
            ],
        }).compile();
        service = moduleRef.get(test_session_service_1.TestSessionService);
    });
    it('Attempt mavjud va isRetakeAllowed=false bo\'lsa, start() ForbiddenException tashlaydi', async () => {
        prisma.testAttempt.findUnique.mockResolvedValue({
            id: 'attempt-1',
            isRetakeAllowed: false,
        });
        await expect(service.start('test-1', 'student-1')).rejects.toThrow(common_1.ForbiddenException);
        await expect(service.start('test-1', 'student-1')).rejects.toThrow(/allaqachon tugatilgan/);
        expect(prisma.testSession.create).not.toHaveBeenCalled();
    });
    it('Attempt mavjud, lekin admin isRetakeAllowed=true qilgan bo\'lsa, start() davom etadi (26-band)', async () => {
        prisma.testAttempt.findUnique.mockResolvedValue({
            id: 'attempt-1',
            isRetakeAllowed: true,
        });
        prisma.testSession.findUnique.mockResolvedValue(null);
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
        await expect(service.start('test-1', 'student-1')).rejects.toThrow(common_1.NotFoundException);
    });
    it('Test muddati tugagan bo\'lsa (endDate o\'tmishda), start() ForbiddenException tashlaydi', async () => {
        prisma.test.findUnique.mockResolvedValue({
            ...PUBLISHED_TEST,
            endDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        });
        await expect(service.start('test-1', 'student-1')).rejects.toThrow(common_1.ForbiddenException);
    });
});
//# sourceMappingURL=test-session.service.spec.js.map