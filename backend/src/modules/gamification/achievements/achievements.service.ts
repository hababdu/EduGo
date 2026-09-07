import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ACHIEVEMENT_DEFINITIONS } from './achievement-definitions';

@Injectable()
export class AchievementsService implements OnModuleInit {
  private readonly logger = new Logger(AchievementsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** Server ishga tushganda achievement ta'riflari bazada mavjudligini ta'minlaydi */
  async onModuleInit() {
    for (const def of ACHIEVEMENT_DEFINITIONS) {
      await this.prisma.achievement.upsert({
        where: { code: def.code },
        create: { code: def.code, title: def.title, description: def.description, iconUrl: def.icon },
        update: { title: def.title, description: def.description, iconUrl: def.icon },
      });
    }
    this.logger.log(`${ACHIEVEMENT_DEFINITIONS.length} ta achievement ta'rifi sinxronlandi`);
  }

  listAll() {
    return this.prisma.achievement.findMany({ orderBy: { createdAt: 'asc' } });
  }

  listForStudent(studentId: string) {
    return this.prisma.studentAchievement.findMany({
      where: { studentId },
      include: { achievement: true },
      orderBy: { earnedAt: 'desc' },
    });
  }

  /**
   * Test tugatilgandan keyin chaqiriladi (gamification.module.ts'dagi
   * 'score.changed' listener orqali). Har bir shartni tekshiradi va
   * hali berilmagan bo'lsa StudentAchievement yaratadi + XPTransaction qo'shadi.
   */
  async checkAndAwardAfterTest(studentId: string, latestAttempt: { percent: number }) {
    const [attemptsCount, profile, streak] = await Promise.all([
      this.prisma.testAttempt.count({ where: { studentId } }),
      this.prisma.studentProfile.findUnique({ where: { userId: studentId } }),
      this.prisma.streak.findUnique({ where: { studentId } }),
    ]);

    const rankAbove = await this.prisma.studentProfile.count({
      where: { totalScore: { gt: profile?.totalScore ?? 0 } },
    });

    const toAward: string[] = [];

    if (attemptsCount === 1) toAward.push('FIRST_TEST');
    if (latestAttempt.percent === 100) toAward.push('PERFECT_SCORE');
    if (attemptsCount === 10) toAward.push('TESTS_10');
    if ((profile?.totalScore ?? 0) >= 1000) toAward.push('POINTS_1000');
    if ((streak?.currentStreak ?? 0) >= 7) toAward.push('STREAK_7');
    if (rankAbove === 0) toAward.push('TOP_STUDENT'); // hech kim yuqorida yo'q = #1

    for (const code of toAward) {
      await this.awardIfNotAlready(studentId, code);
    }
  }

  private async awardIfNotAlready(studentId: string, code: string) {
    const achievement = await this.prisma.achievement.findUnique({ where: { code } });
    if (!achievement) return;

    const existing = await this.prisma.studentAchievement.findUnique({
      where: { studentId_achievementId: { studentId, achievementId: achievement.id } },
    });
    if (existing) return; // 38-band: har bir achievement FAQAT bir marta beriladi

    await this.prisma.$transaction([
      this.prisma.studentAchievement.create({
        data: { studentId, achievementId: achievement.id },
      }),
      this.prisma.xPTransaction.create({
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
}
