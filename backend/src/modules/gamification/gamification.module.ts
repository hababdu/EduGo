import { Injectable, Module } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AchievementsController } from './achievements/achievements.controller';
import { AchievementsService } from './achievements/achievements.service';
import { StreakService } from './streak/streak.service';
import { ChallengesController } from './challenges/challenges.controller';
import { ChallengesService } from './challenges/challenges.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { NotificationsService } from '../notifications/notifications.service';

interface ScoreChangedPayload {
  studentId: string;
  source: string;
}

/**
 * TestSessionService/AdminStudentsService'dan kelgan 'score.changed'
 * eventini tinglab, streak va achievement mantiqini ishga tushiradi.
 * Bu servis RankingGateway bilan bir xil naqshni ishlatadi — to'g'ridan-to'g'ri
 * bog'lanish emas, EventEmitter orqali (Phase 11-12'dagi arxitekturaga mos).
 */
@Injectable()
class GamificationEventListener {
  constructor(
    private readonly prisma: PrismaService,
    private readonly achievementsService: AchievementsService,
    private readonly streakService: StreakService,
    private readonly notifications: NotificationsService,
  ) {}

  @OnEvent('score.changed')
  async onScoreChanged(payload: ScoreChangedPayload) {
    if (payload.source !== 'TEST_REWARD') return;

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

  /** 50-band — achievement qo'lga kiritilganda alohida bildirishnoma */
  @OnEvent('achievement.earned')
  async onAchievementEarned(payload: { studentId: string; title: string }) {
    await this.notifications.notify(
      payload.studentId,
      'ANNOUNCEMENT',
      '🏅 Yangi yutuq!',
      `Tabriklaymiz! Siz "${payload.title}" yutug'ini qo'lga kiritdingiz.`,
    );
  }
}

@Module({
  imports: [NotificationsModule],
  controllers: [AchievementsController, ChallengesController],
  providers: [
    AchievementsService,
    StreakService,
    ChallengesService,
    GamificationEventListener,
  ],
  exports: [StreakService, ChallengesService],
})
export class GamificationModule {}
