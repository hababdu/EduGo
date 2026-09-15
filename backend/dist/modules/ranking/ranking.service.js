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
exports.RankingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let RankingService = class RankingService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getGlobalRanking(limit = 20) {
        return this.rankProfiles({}, limit);
    }
    async getGroupRanking(groupId, limit = 50) {
        const memberIds = (await this.prisma.groupMember.findMany({
            where: { groupId },
            select: { studentId: true },
        })).map((m) => m.studentId);
        return this.rankProfiles({ userId: { in: memberIds } }, limit);
    }
    async getSubjectRanking(subjectId, limit = 50) {
        const grouped = await this.prisma.scoreTransaction.groupBy({
            by: ['studentId'],
            where: { subjectId },
            _sum: { amount: true },
        });
        const sorted = grouped
            .map((g) => ({ studentId: g.studentId, score: g._sum.amount ?? 0 }))
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
        const users = await this.prisma.user.findMany({
            where: { id: { in: sorted.map((s) => s.studentId) } },
            select: { id: true, firstName: true, username: true },
        });
        const userMap = new Map(users.map((u) => [u.id, u]));
        return sorted.map((s, i) => ({
            studentId: s.studentId,
            firstName: userMap.get(s.studentId)?.firstName ?? '',
            username: userMap.get(s.studentId)?.username ?? null,
            totalScore: s.score,
            rank: i + 1,
        }));
    }
    async getStudentRank(studentId) {
        const profile = await this.prisma.studentProfile.findUnique({ where: { userId: studentId } });
        if (!profile)
            return 0;
        const higherCount = await this.prisma.studentProfile.count({
            where: { totalScore: { gt: profile.totalScore } },
        });
        return higherCount + 1;
    }
    async rankProfiles(where, limit) {
        const candidates = await this.prisma.studentProfile.findMany({
            where,
            orderBy: { totalScore: 'desc' },
            take: limit * 3,
            include: { user: { select: { id: true, firstName: true, username: true } } },
        });
        const studentIds = candidates.map((c) => c.userId);
        const stats = await this.prisma.testAttempt.groupBy({
            by: ['studentId'],
            where: { studentId: { in: studentIds } },
            _avg: { percent: true, timeSpentSeconds: true },
        });
        const statsMap = new Map(stats.map((s) => [s.studentId, s]));
        const sorted = candidates
            .map((c) => ({
            studentId: c.userId,
            firstName: c.user.firstName,
            username: c.user.username,
            totalScore: c.totalScore,
            avgPercent: statsMap.get(c.userId)?._avg.percent ?? 0,
            avgTime: statsMap.get(c.userId)?._avg.timeSpentSeconds ?? Infinity,
        }))
            .sort((a, b) => {
            if (b.totalScore !== a.totalScore)
                return b.totalScore - a.totalScore;
            if (b.avgPercent !== a.avgPercent)
                return b.avgPercent - a.avgPercent;
            return a.avgTime - b.avgTime;
        })
            .slice(0, limit);
        return sorted.map((s, i) => ({
            studentId: s.studentId,
            firstName: s.firstName,
            username: s.username,
            totalScore: s.totalScore,
            rank: i + 1,
        }));
    }
};
exports.RankingService = RankingService;
exports.RankingService = RankingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RankingService);
//# sourceMappingURL=ranking.service.js.map