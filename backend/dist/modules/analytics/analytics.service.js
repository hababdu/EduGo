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
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let AnalyticsService = class AnalyticsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getTestAnalytics(testId) {
        const test = await this.prisma.test.findUnique({ where: { id: testId } });
        if (!test)
            throw new common_1.NotFoundException('Test topilmadi');
        const attempts = await this.prisma.testAttempt.findMany({ where: { testId } });
        if (attempts.length === 0) {
            return {
                testTitle: test.title,
                participants: 0,
                averageScore: 0,
                highestScore: 0,
                lowestScore: 0,
                averageTimeSeconds: 0,
                passRate: 0,
                failRate: 0,
            };
        }
        const scores = attempts.map((a) => a.score);
        const passedCount = attempts.filter((a) => a.passed).length;
        return {
            testTitle: test.title,
            participants: attempts.length,
            averageScore: Math.round(scores.reduce((s, v) => s + v, 0) / attempts.length),
            highestScore: Math.max(...scores),
            lowestScore: Math.min(...scores),
            averageTimeSeconds: Math.round(attempts.reduce((s, a) => s + a.timeSpentSeconds, 0) / attempts.length),
            passRate: Math.round((passedCount / attempts.length) * 100),
            failRate: Math.round(((attempts.length - passedCount) / attempts.length) * 100),
        };
    }
    async getQuestionAnalyticsForTest(testId) {
        const testQuestions = await this.prisma.testQuestion.findMany({
            where: { testId },
            include: { question: { select: { id: true, text: true } } },
            orderBy: { order: 'asc' },
        });
        const results = await Promise.all(testQuestions.map(async (tq) => {
            const answers = await this.prisma.testAnswer.findMany({
                where: {
                    questionId: tq.questionId,
                    session: { testId },
                    isCorrect: { not: null },
                },
            });
            const total = answers.length;
            const correct = answers.filter((a) => a.isCorrect).length;
            return {
                questionId: tq.questionId,
                questionText: tq.question.text,
                totalAnswered: total,
                correctCount: correct,
                wrongCount: total - correct,
                accuracyPercent: total > 0 ? Math.round((correct / total) * 100) : null,
            };
        }));
        return results.sort((a, b) => (a.accuracyPercent ?? 100) - (b.accuracyPercent ?? 100));
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map