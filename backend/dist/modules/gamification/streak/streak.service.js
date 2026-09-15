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
exports.StreakService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../../prisma/prisma.service");
function isSameDay(a, b) {
    return a.toDateString() === b.toDateString();
}
function isYesterday(date, today) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return isSameDay(date, yesterday);
}
let StreakService = class StreakService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async recordActivity(studentId) {
        const today = new Date();
        const streak = await this.prisma.streak.findUnique({ where: { studentId } });
        if (!streak) {
            return this.prisma.streak.create({
                data: { studentId, currentStreak: 1, longestStreak: 1, lastActiveDate: today },
            });
        }
        if (streak.lastActiveDate && isSameDay(streak.lastActiveDate, today)) {
            return streak;
        }
        const continuesStreak = streak.lastActiveDate && isYesterday(streak.lastActiveDate, today);
        const newCurrent = continuesStreak ? streak.currentStreak + 1 : 1;
        return this.prisma.streak.update({
            where: { studentId },
            data: {
                currentStreak: newCurrent,
                longestStreak: Math.max(newCurrent, streak.longestStreak),
                lastActiveDate: today,
            },
        });
    }
    getStreak(studentId) {
        return this.prisma.streak.findUnique({ where: { studentId } });
    }
};
exports.StreakService = StreakService;
exports.StreakService = StreakService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StreakService);
//# sourceMappingURL=streak.service.js.map