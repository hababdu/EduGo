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
exports.OverviewService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
let OverviewService = class OverviewService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getOverview() {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const [totalStudents, activeStudents, totalTeachers, totalCourses, totalSubjects, totalTests, completedTestsCount, todayTestAttempts, scoreSumAgg, dailyActivity,] = await Promise.all([
            this.prisma.user.count({ where: { role: 'STUDENT', deletedAt: null } }),
            this.prisma.user.count({
                where: { role: 'STUDENT', deletedAt: null, lastActiveAt: { gte: sevenDaysAgo } },
            }),
            this.prisma.user.count({ where: { role: 'TEACHER', deletedAt: null } }),
            this.prisma.course.count({ where: { deletedAt: null } }),
            this.prisma.subject.count({ where: { deletedAt: null } }),
            this.prisma.test.count({ where: { deletedAt: null } }),
            this.prisma.testAttempt.count(),
            this.prisma.testAttempt.count({ where: { completedAt: { gte: todayStart } } }),
            this.prisma.scoreTransaction.aggregate({ _sum: { amount: true } }),
            this.getDailyActiveUsersLast7Days(),
        ]);
        return {
            totals: {
                students: totalStudents,
                activeStudents,
                teachers: totalTeachers,
                courses: totalCourses,
                subjects: totalSubjects,
                tests: totalTests,
                completedTests: completedTestsCount,
                totalScoreIssued: scoreSumAgg._sum.amount ?? 0,
            },
            today: {
                testAttempts: todayTestAttempts,
            },
            charts: {
                dailyActiveUsers: dailyActivity,
            },
        };
    }
    async getDailyActiveUsersLast7Days() {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const start = new Date();
            start.setDate(start.getDate() - i);
            start.setHours(0, 0, 0, 0);
            const end = new Date(start);
            end.setDate(end.getDate() + 1);
            const count = await this.prisma.activityLog.groupBy({
                by: ['userId'],
                where: { createdAt: { gte: start, lt: end } },
            });
            days.push({ date: start.toISOString().slice(0, 10), count: count.length });
        }
        return days;
    }
};
exports.OverviewService = OverviewService;
exports.OverviewService = OverviewService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OverviewService);
//# sourceMappingURL=overview.service.js.map