import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateChallengeDto } from './dto/challenge.dto';

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

@Injectable()
export class ChallengesService {
  constructor(private readonly prisma: PrismaService) {}

  /** 40-band — "Har kuni maxsus challenge." */
  async getToday(studentId: string) {
    const today = startOfDay(new Date());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
async getDailyChallenge(studentId: string) {
    const challenge = await (this.prisma.challenge as any).findFirst({
      where: { isActive: true },
      include: {
        test: {
          select: { id: true, title: true, durationSeconds: true },
        },
      },
    });

    if (!challenge) return null;

    let isCompleted = false;
    if (challenge.testId) {
      const existingSession = await this.prisma.testSession.findFirst({
        where: { testId: challenge.testId, studentId } as any,
      });
      if (existingSession && existingSession.status === ('COMPLETED' as any)) {
        isCompleted = true;
      }
    }

    return {
      id: challenge.id,
      title: challenge.title,
      rewardScore: challenge.rewardScore,
      rewardXp: challenge.rewardXp,
      test: challenge.test,
      isCompleted,
    };
  }

    if (!challenge) return null;

    // Challenge "bir marta ishlanadi" — TestAttempt orqali tekshiramiz
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

  create(dto: CreateChallengeDto) {
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

  /** Berilgan testId bugungi challenge bilan bog'liqmi — TestSessionService shuni tekshiradi */
  async findActiveChallengeForTest(testId: string) {
    const today = startOfDay(new Date());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.prisma.challenge.findFirst({
      where: { testId, date: { gte: today, lt: tomorrow } },
    });
  }
}
