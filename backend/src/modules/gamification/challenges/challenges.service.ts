import { Injectable } from '@nestjs/common';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { assertSameOrg } from '../../../common/org-scope';
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
  /** orgId: o'quvchining maktabi — boshqa maktab testiga bog'langan challenge ko'rinmaydi. */
  async getToday(studentId: string, orgId?: string | null) {
    const today = startOfDay(new Date());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const challenge = await this.prisma.challenge.findFirst({
      where: {
        date: { gte: today, lt: tomorrow },
        ...(orgId === undefined
          ? {}
          : { OR: [{ testId: null }, { test: { createdBy: { OR: [{ organizationId: orgId }, { organizationId: null }] } } }] }),
      },
      include: { test: { select: { id: true, title: true, durationSeconds: true } } },
    });

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

  async create(dto: CreateChallengeDto, user: CurrentUserPayload) {
    if (dto.testId) {
      const test = await this.prisma.test.findUnique({
        where: { id: dto.testId },
        include: { createdBy: { select: { organizationId: true } } },
      });
      if (!test) throw new NotFoundException('Test topilmadi');
      assertSameOrg(user, test.createdBy?.organizationId, "Bu test sizning maktabingizga tegishli emas");
    }
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
