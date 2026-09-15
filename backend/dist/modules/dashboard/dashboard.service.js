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
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let DashboardService = class DashboardService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getStudentDashboard(userId) {
        const [user, profile, streak, subjects, recentAttempts, achievements] = await Promise.all([
            this.prisma.user.findUnique({ where: { id: userId } }),
            this.prisma.studentProfile.findUnique({ where: { userId } }),
            this.prisma.streak.findUnique({ where: { studentId: userId } }),
            this.prisma.subject.findMany({
                where: { status: 'PUBLISHED', deletedAt: null },
                include: {
                    sections: { include: { topics: true } },
                    tests: true,
                },
            }),
            this.prisma.testAttempt.findMany({
                where: { studentId: userId },
                orderBy: { completedAt: 'desc' },
                take: 5,
                include: { test: { select: { title: true } } },
            }),
            this.prisma.studentAchievement.findMany({
                where: { studentId: userId },
                orderBy: { earnedAt: 'desc' },
                take: 6,
                include: { achievement: true },
            }),
        ]);
        const rankAbove = await this.prisma.studentProfile.count({
            where: { totalScore: { gt: profile?.totalScore ?? 0 } },
        });
        const passedTestIds = new Set((await this.prisma.testAttempt.findMany({
            where: { studentId: userId, passed: true },
            select: { testId: true },
        })).map((a) => a.testId));
        const subjectCards = subjects.map((subject) => {
            const totalTests = subject.tests.length;
            const passedTests = subject.tests.filter((t) => passedTestIds.has(t.id)).length;
            const progressPercent = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
            return {
                id: subject.id,
                title: subject.title,
                posterUrl: subject.posterUrl,
                progressPercent,
            };
        });
        const continueSubject = subjectCards
            .filter((s) => s.progressPercent > 0 && s.progressPercent < 100)
            .sort((a, b) => a.progressPercent - b.progressPercent)[0];
        const xp = profile?.totalXp ?? 0;
        const level = profile?.level ?? 1;
        const xpForNextLevel = level * 500;
        const xpIntoLevel = xp % 500;
        return {
            student: {
                firstName: user?.firstName ?? '',
                profilePhotoUrl: user?.profilePhotoUrl ?? null,
                streak: streak?.currentStreak ?? 0,
                rank: rankAbove + 1,
            },
            continueLesson: continueSubject
                ? {
                    subjectId: continueSubject.id,
                    subjectTitle: continueSubject.title,
                    progressPercent: continueSubject.progressPercent,
                }
                : null,
            subjects: subjectCards,
            stats: {
                totalScore: profile?.totalScore ?? 0,
                xp,
                level,
                xpIntoLevel,
                xpForNextLevel: 500,
            },
            recentResults: recentAttempts.map((a) => ({
                testTitle: a.test.title,
                percent: a.percent,
                passed: a.passed,
            })),
            achievements: achievements.map((a) => ({
                id: a.id,
                title: a.achievement.title,
                iconUrl: a.achievement.iconUrl,
            })),
        };
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map