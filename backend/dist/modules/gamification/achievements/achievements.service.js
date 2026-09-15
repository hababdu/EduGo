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
var AchievementsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AchievementsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
const event_emitter_1 = require("@nestjs/event-emitter");
const achievement_definitions_1 = require("./achievement-definitions");
let AchievementsService = AchievementsService_1 = class AchievementsService {
    constructor(prisma, eventEmitter) {
        this.prisma = prisma;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(AchievementsService_1.name);
    }
    async onModuleInit() {
        for (const def of achievement_definitions_1.ACHIEVEMENT_DEFINITIONS) {
            await this.prisma.achievement.upsert({
                where: { code: def.code },
                create: { code: def.code, title: def.title, description: def.description, iconUrl: def.icon },
                update: { title: def.title, description: def.description, iconUrl: def.icon },
            });
        }
        this.logger.log(`${achievement_definitions_1.ACHIEVEMENT_DEFINITIONS.length} ta achievement ta'rifi sinxronlandi`);
    }
    listAll() {
        return this.prisma.achievement.findMany({ orderBy: { createdAt: 'asc' } });
    }
    listForStudent(studentId) {
        return this.prisma.studentAchievement.findMany({
            where: { studentId },
            include: { achievement: true },
            orderBy: { earnedAt: 'desc' },
        });
    }
    async checkAndAwardAfterTest(studentId, latestAttempt) {
        const [attemptsCount, profile, streak] = await Promise.all([
            this.prisma.testAttempt.count({ where: { studentId } }),
            this.prisma.studentProfile.findUnique({ where: { userId: studentId } }),
            this.prisma.streak.findUnique({ where: { studentId } }),
        ]);
        const rankAbove = await this.prisma.studentProfile.count({
            where: { totalScore: { gt: profile?.totalScore ?? 0 } },
        });
        const toAward = [];
        if (attemptsCount === 1)
            toAward.push('FIRST_TEST');
        if (latestAttempt.percent === 100)
            toAward.push('PERFECT_SCORE');
        if (attemptsCount === 10)
            toAward.push('TESTS_10');
        if ((profile?.totalScore ?? 0) >= 1000)
            toAward.push('POINTS_1000');
        if ((streak?.currentStreak ?? 0) >= 7)
            toAward.push('STREAK_7');
        if (rankAbove === 0)
            toAward.push('TOP_STUDENT');
        for (const code of toAward) {
            await this.awardIfNotAlready(studentId, code);
        }
    }
    async awardIfNotAlready(studentId, code) {
        const achievement = await this.prisma.achievement.findUnique({ where: { code } });
        if (!achievement)
            return;
        const existing = await this.prisma.studentAchievement.findUnique({
            where: { studentId_achievementId: { studentId, achievementId: achievement.id } },
        });
        if (existing)
            return;
        await this.prisma.$transaction([
            this.prisma.studentAchievement.create({
                data: { studentId, achievementId: achievement.id },
            }),
            this.prisma.xpTransaction.create({
                data: { studentId, amount: 20, source: 'ACHIEVEMENT' },
            }),
            this.prisma.studentProfile.update({
                where: { userId: studentId },
                data: { totalXp: { increment: 20 } },
            }),
        ]);
        this.eventEmitter.emit('achievement.earned', {
            studentId,
            code,
            title: achievement.title,
        });
    }
};
exports.AchievementsService = AchievementsService;
exports.AchievementsService = AchievementsService = AchievementsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        event_emitter_1.EventEmitter2])
], AchievementsService);
//# sourceMappingURL=achievements.service.js.map