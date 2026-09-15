"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestSessionService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const prisma_service_1 = require("../../../prisma/prisma.service");
const seeded_shuffle_util_1 = require("./seeded-shuffle.util");
const challenges_service_1 = require("../../gamification/challenges/challenges.service");
const notifications_service_1 = require("../../notifications/notifications.service");
let TestSessionService = class TestSessionService {
    constructor(prisma, eventEmitter, challengesService, notifications) {
        this.prisma = prisma;
        this.eventEmitter = eventEmitter;
        this.challengesService = challengesService;
        this.notifications = notifications;
    }
    async start(testId, studentId) {
        const test = await this.getPublishedTestOrThrow(testId);
        this.assertWithinSchedule(test);
        const existingAttempt = await this.prisma.testAttempt.findUnique({
            where: { testId_studentId: { testId, studentId } },
        });
        if (existingAttempt && !existingAttempt.isRetakeAllowed) {
            throw new common_1.ForbiddenException('🔒 Bu test allaqachon tugatilgan. Qayta ishlash uchun administratorga murojaat qiling.');
        }
        const existingSession = await this.prisma.testSession.findUnique({
            where: { testId_studentId: { testId, studentId } },
        });
        if (existingSession && existingSession.status === 'IN_PROGRESS') {
            const remaining = this.computeRemainingSeconds(existingSession);
            if (remaining > 0) {
                return this.buildSessionResponse(existingSession, test);
            }
            await this.autoSubmitExpired(existingSession, test);
            throw new common_1.ForbiddenException('⏰ Test vaqti tugagan edi, avtomatik yakunlandi.');
        }
        const allTestQuestions = await this.prisma.testQuestion.findMany({
            where: { testId },
            orderBy: { order: 'asc' },
            select: { questionId: true },
        });
        let selectedIds = allTestQuestions.map((q) => q.questionId);
        if (test.randomQuestions && test.questionCount && test.questionCount < selectedIds.length) {
            selectedIds = this.pickRandom(selectedIds, test.questionCount);
        }
        const session = await this.prisma.testSession.create({
            data: {
                testId,
                studentId,
                durationSeconds: test.durationSeconds,
                selectedQuestionIds: selectedIds,
                answerOrderSeed: Math.floor(Math.random() * 1_000_000),
            },
        });
        return this.buildSessionResponse(session, test);
    }
    async saveAnswer(testId, studentId, dto) {
        const session = await this.getActiveSessionOrThrow(testId, studentId);
        if (!session.selectedQuestionIds.includes(dto.questionId)) {
            throw new common_1.BadRequestException('Bu savol ushbu sessiyaga tegishli emas');
        }
        return this.prisma.testAnswer.upsert({
            where: { sessionId_questionId: { sessionId: session.id, questionId: dto.questionId } },
            create: {
                sessionId: session.id,
                questionId: dto.questionId,
                selectedOptionIds: dto.selectedOptionIds ?? [],
                textAnswer: dto.textAnswer,
            },
            update: {
                selectedOptionIds: dto.selectedOptionIds ?? [],
                textAnswer: dto.textAnswer,
            },
        });
    }
    async getSession(testId, studentId) {
        const session = await this.getActiveSessionOrThrow(testId, studentId);
        const test = await this.getPublishedTestOrThrow(testId);
        const remaining = this.computeRemainingSeconds(session);
        if (remaining <= 0) {
            await this.autoSubmitExpired(session, test);
            throw new common_1.ForbiddenException('⏰ Test vaqti tugagan edi, avtomatik yakunlandi.');
        }
        const savedAnswers = await this.prisma.testAnswer.findMany({
            where: { sessionId: session.id },
        });
        const response = await this.buildSessionResponse(session, test);
        return {
            ...response,
            savedAnswers: savedAnswers.map((a) => ({
                questionId: a.questionId,
                selectedOptionIds: a.selectedOptionIds,
                textAnswer: a.textAnswer,
            })),
        };
    }
    async submit(testId, studentId) {
        const session = await this.getActiveSessionOrThrow(testId, studentId);
        const test = await this.getPublishedTestOrThrow(testId);
        return this.gradeAndFinish(session, test, false);
    }
    async gradeAndFinish(session, test, isAutoSubmit) {
        const [answers, questions] = await Promise.all([
            this.prisma.testAnswer.findMany({ where: { sessionId: session.id } }),
            this.prisma.question.findMany({
                where: { id: { in: session.selectedQuestionIds } },
                include: { options: true },
            }),
        ]);
        const questionMap = new Map(questions.map((q) => [q.id, q]));
        let score = 0;
        let maxScore = 0;
        const gradedAnswers = [];
        for (const questionId of session.selectedQuestionIds) {
            const question = questionMap.get(questionId);
            if (!question)
                continue;
            maxScore += question.points;
            const answer = answers.find((a) => a.questionId === questionId);
            if (!answer)
                continue;
            let isCorrect = null;
            if (question.type === 'TEXT_ANSWER') {
                isCorrect = null;
            }
            else {
                const correctIds = question.options.filter((o) => o.isCorrect).map((o) => o.id).sort();
                const selectedIds = [...answer.selectedOptionIds].sort();
                isCorrect =
                    correctIds.length === selectedIds.length &&
                        correctIds.every((id, i) => id === selectedIds[i]);
            }
            if (isCorrect)
                score += question.points;
            gradedAnswers.push({ id: answer.id, isCorrect });
        }
        const percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
        const passed = percent >= test.passingScore;
        const timeSpentSeconds = Math.round((Date.now() - new Date(session.startedAt).getTime()) / 1000);
        const challenge = await this.challengesService.findActiveChallengeForTest(test.id);
        await this.prisma.$transaction([
            ...gradedAnswers.map((a) => this.prisma.testAnswer.update({ where: { id: a.id }, data: { isCorrect: a.isCorrect } })),
            this.prisma.testSession.update({
                where: { id: session.id },
                data: { status: isAutoSubmit ? 'EXPIRED' : 'SUBMITTED' },
            }),
            this.prisma.testAttempt.upsert({
                where: { testId_studentId: { testId: test.id, studentId: session.studentId } },
                create: {
                    testId: test.id,
                    studentId: session.studentId,
                    sessionId: session.id,
                    score,
                    maxScore,
                    percent,
                    passed,
                    timeSpentSeconds,
                },
                update: {
                    sessionId: session.id,
                    score,
                    maxScore,
                    percent,
                    passed,
                    timeSpentSeconds,
                    isRetakeAllowed: false,
                    completedAt: new Date(),
                },
            }),
            this.prisma.scoreTransaction.create({
                data: {
                    studentId: session.studentId,
                    amount: score,
                    type: 'TEST_REWARD',
                    subjectId: test.subjectId,
                    testId: test.id,
                    description: `Test: ${test.title}`,
                },
            }),
            this.prisma.studentProfile.update({
                where: { userId: session.studentId },
                data: {
                    totalScore: { increment: score },
                    totalXp: { increment: Math.round(score / 2) },
                },
            }),
            ...(challenge
                ? [
                    this.prisma.scoreTransaction.create({
                        data: {
                            studentId: session.studentId,
                            amount: challenge.rewardScore,
                            type: 'CHALLENGE',
                            testId: test.id,
                            description: `Kunlik challenge: ${challenge.title}`,
                        },
                    }),
                    this.prisma.xpTransaction.create({
                        data: { studentId: session.studentId, amount: challenge.rewardXp, source: 'CHALLENGE' },
                    }),
                    this.prisma.studentProfile.update({
                        where: { userId: session.studentId },
                        data: {
                            totalScore: { increment: challenge.rewardScore },
                            totalXp: { increment: challenge.rewardXp },
                        },
                    }),
                ]
                : []),
        ]);
        await this.emitScoreChanged(session.studentId, score + (challenge?.rewardScore ?? 0), test.subjectId);
        await this.notifications.notify(session.studentId, 'TEST_RESULT', passed ? '🎉 Test tugatildi' : '📚 Test tugatildi', `"${test.title}" natijangiz: ${score}/${maxScore} (${percent}%) — ${passed ? 'o\'tdingiz ✅' : 'o\'ta olmadingiz'}`);
        return { score, maxScore, percent, passed, timeSpentSeconds, autoSubmitted: isAutoSubmit };
    }
    async emitScoreChanged(studentId, score, subjectId) {
        const groupIds = (await this.prisma.groupMember.findMany({
            where: { studentId },
            select: { groupId: true },
        })).map((g) => g.groupId);
        this.eventEmitter.emit('score.changed', {
            studentId,
            delta: score,
            source: 'TEST_REWARD',
            subjectId,
            groupIds,
        });
    }
    async autoSubmitExpired(session, test) {
        await this.gradeAndFinish(session, test, true);
    }
    computeRemainingSeconds(session) {
        const elapsed = (Date.now() - new Date(session.startedAt).getTime()) / 1000;
        return Math.max(0, Math.round(session.durationSeconds - elapsed));
    }
    pickRandom(arr, count) {
        const copy = [...arr];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy.slice(0, count);
    }
    async buildSessionResponse(session, test) {
        const questions = await this.prisma.question.findMany({
            where: { id: { in: session.selectedQuestionIds } },
            include: {
                options: { select: { id: true, text: true, order: true } },
            },
        });
        const orderedQuestions = session.selectedQuestionIds
            .map((id) => questions.find((q) => q.id === id))
            .filter(Boolean);
        const questionsForClient = orderedQuestions.map((q) => ({
            id: q.id,
            type: q.type,
            text: q.text,
            points: q.points,
            options: test.randomAnswerOrder
                ? (0, seeded_shuffle_util_1.seededShuffle)(q.options, session.answerOrderSeed ?? 0, q.id)
                : q.options,
        }));
        return {
            sessionId: session.id,
            testTitle: test.title,
            remainingSeconds: this.computeRemainingSeconds(session),
            questions: questionsForClient,
        };
    }
    async getPublishedTestOrThrow(testId) {
        const test = await this.prisma.test.findUnique({ where: { id: testId } });
        if (!test || test.deletedAt || test.status !== 'PUBLISHED') {
            throw new common_1.NotFoundException('Test topilmadi yoki hali e\'lon qilinmagan');
        }
        return test;
    }
    assertWithinSchedule(test) {
        const now = new Date();
        if (test.startDate && now < test.startDate) {
            throw new common_1.ForbiddenException('Bu test hali boshlanmagan');
        }
        if (test.endDate && now > test.endDate) {
            throw new common_1.ForbiddenException('Bu testni topshirish muddati tugagan');
        }
    }
    async getActiveSessionOrThrow(testId, studentId) {
        const session = await this.prisma.testSession.findUnique({
            where: { testId_studentId: { testId, studentId } },
        });
        if (!session || session.status !== 'IN_PROGRESS') {
            throw new common_1.NotFoundException('Faol test sessiyasi topilmadi. Avval testni "Boshlash" orqali boshlang.');
        }
        return session;
    }
};
exports.TestSessionService = TestSessionService;
exports.TestSessionService = TestSessionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        event_emitter_1.EventEmitter2,
        challenges_service_1.ChallengesService,
        notifications_service_1.NotificationsService])
], TestSessionService);
//# sourceMappingURL=test-session.service.js.map