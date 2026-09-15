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
exports.InternalService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let InternalService = class InternalService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getStudentSummary(telegramId) {
        const user = await this.prisma.user.findUnique({
            where: { telegramId },
            include: { studentProfile: true, streak: true },
        });
        if (!user) {
            throw new common_1.NotFoundException('Foydalanuvchi topilmadi. Avval "Darsni boshlash" orqali platformaga kiring.');
        }
        const higherScoreCount = await this.prisma.studentProfile.count({
            where: { totalScore: { gt: user.studentProfile?.totalScore ?? 0 } },
        });
        return {
            firstName: user.firstName,
            totalScore: user.studentProfile?.totalScore ?? 0,
            totalXp: user.studentProfile?.totalXp ?? 0,
            level: user.studentProfile?.level ?? 1,
            rank: higherScoreCount + 1,
            streak: user.streak?.currentStreak ?? 0,
        };
    }
    async getRecentResults(telegramId, limit = 5) {
        const user = await this.prisma.user.findUnique({ where: { telegramId } });
        if (!user) {
            throw new common_1.NotFoundException('Foydalanuvchi topilmadi');
        }
        return this.prisma.testAttempt.findMany({
            where: { studentId: user.id },
            orderBy: { completedAt: 'desc' },
            take: limit,
            include: { test: { select: { title: true } } },
        });
    }
    async getAchievements(telegramId) {
        const user = await this.prisma.user.findUnique({ where: { telegramId } });
        if (!user) {
            throw new common_1.NotFoundException('Foydalanuvchi topilmadi');
        }
        return this.prisma.studentAchievement.findMany({
            where: { studentId: user.id },
            include: { achievement: true },
            orderBy: { earnedAt: 'desc' },
        });
    }
    async getTopRanking(limit = 10) {
        return this.prisma.studentProfile.findMany({
            orderBy: { totalScore: 'desc' },
            take: limit,
            include: { user: { select: { firstName: true, username: true } } },
        });
    }
    async getRecentAnnouncements(limit = 5) {
        return this.prisma.announcement.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }
};
exports.InternalService = InternalService;
exports.InternalService = InternalService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InternalService);
//# sourceMappingURL=internal.service.js.map