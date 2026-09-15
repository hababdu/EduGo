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
exports.GamificationModule = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const achievements_controller_1 = require("./achievements/achievements.controller");
const achievements_service_1 = require("./achievements/achievements.service");
const streak_service_1 = require("./streak/streak.service");
const challenges_controller_1 = require("./challenges/challenges.controller");
const challenges_service_1 = require("./challenges/challenges.service");
const prisma_service_1 = require("../../prisma/prisma.service");
const notifications_module_1 = require("../notifications/notifications.module");
const notifications_service_1 = require("../notifications/notifications.service");
let GamificationEventListener = class GamificationEventListener {
    constructor(prisma, achievementsService, streakService, notifications) {
        this.prisma = prisma;
        this.achievementsService = achievementsService;
        this.streakService = streakService;
        this.notifications = notifications;
    }
    async onScoreChanged(payload) {
        if (payload.source !== 'TEST_REWARD')
            return;
        await this.streakService.recordActivity(payload.studentId);
        const latestAttempt = await this.prisma.testAttempt.findFirst({
            where: { studentId: payload.studentId },
            orderBy: { completedAt: 'desc' },
        });
        if (latestAttempt) {
            await this.achievementsService.checkAndAwardAfterTest(payload.studentId, {
                percent: latestAttempt.percent,
            });
        }
    }
    async onAchievementEarned(payload) {
        await this.notifications.notify(payload.studentId, 'ANNOUNCEMENT', '🏅 Yangi yutuq!', `Tabriklaymiz! Siz "${payload.title}" yutug'ini qo'lga kiritdingiz.`);
    }
};
__decorate([
    (0, event_emitter_1.OnEvent)('score.changed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GamificationEventListener.prototype, "onScoreChanged", null);
__decorate([
    (0, event_emitter_1.OnEvent)('achievement.earned'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GamificationEventListener.prototype, "onAchievementEarned", null);
GamificationEventListener = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        achievements_service_1.AchievementsService,
        streak_service_1.StreakService,
        notifications_service_1.NotificationsService])
], GamificationEventListener);
let GamificationModule = class GamificationModule {
};
exports.GamificationModule = GamificationModule;
exports.GamificationModule = GamificationModule = __decorate([
    (0, common_1.Module)({
        imports: [notifications_module_1.NotificationsModule],
        controllers: [achievements_controller_1.AchievementsController, challenges_controller_1.ChallengesController],
        providers: [
            achievements_service_1.AchievementsService,
            streak_service_1.StreakService,
            challenges_service_1.ChallengesService,
            GamificationEventListener,
        ],
        exports: [streak_service_1.StreakService, challenges_service_1.ChallengesService],
    })
], GamificationModule);
//# sourceMappingURL=gamification.module.js.map