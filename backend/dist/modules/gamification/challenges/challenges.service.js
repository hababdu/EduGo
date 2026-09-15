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
exports.ChallengesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}
let ChallengesService = class ChallengesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getToday(studentId) {
        const today = startOfDay(new Date());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const challenge = await this.prisma.challenge.findFirst({
            where: { date: { gte: today, lt: tomorrow } },
            include: { test: { select: { id: true, title: true, durationSeconds: true } } },
        });
        if (!challenge)
            return null;
        const alreadyDone = challenge.testId
            ? await this.prisma.testAttempt.findUnique({
                where: { testId_studentId: { testId: challenge.testId, studentId } },
            })
            : null;
        return {
            id: challenge.id,
            title: challenge.title,
            rewardScore: challenge.rewardScore,
            rewardXp: challenge.rewardXp,
            test: challenge.test,
            completed: !!alreadyDone,
        };
    }
    create(dto) {
        return this.prisma.challenge.create({
            data: {
                title: dto.title,
                testId: dto.testId,
                date: new Date(dto.date),
                rewardScore: dto.rewardScore,
                rewardXp: dto.rewardXp,
            },
        });
    }
    async findActiveChallengeForTest(testId) {
        const today = startOfDay(new Date());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return this.prisma.challenge.findFirst({
            where: { testId, date: { gte: today, lt: tomorrow } },
        });
    }
};
exports.ChallengesService = ChallengesService;
exports.ChallengesService = ChallengesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ChallengesService);
//# sourceMappingURL=challenges.service.js.map