// src/modules/ai/ai-usage.service.ts
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { AiConfig } from './ai.config';
import { AiUsageTokens } from './ai.types';

@Injectable()
export class AiUsageService {
  private readonly logger = new Logger(AiUsageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cfg: AiConfig,
  ) {}

  /** Bugungi kunning boshlanishi (AI_TZ_OFFSET_HOURS zonasida), UTC sifatida. */
  startOfToday(now: number = Date.now()): Date {
    const offset = this.cfg.tzOffsetHours * 3_600_000;
    const local = now + offset;
    return new Date(local - (local % 86_400_000) - offset);
  }

  async usedToday(userId: string): Promise<number> {
    const agg = await this.prisma.aiUsage.aggregate({
      where: { userId, createdAt: { gte: this.startOfToday() } },
      _sum: { inputTokens: true, outputTokens: true },
    });
    return (agg._sum.inputTokens ?? 0) + (agg._sum.outputTokens ?? 0);
  }

  /** Kunlik chegara oshgan bo'lsa 429 tashlaydi. Chegara 0 bo'lsa — cheklanmagan. */
  async assertQuota(user: CurrentUserPayload): Promise<void> {
    const limit = this.cfg.dailyTokenLimit(user.role);
    if (limit <= 0) return;

    const used = await this.usedToday(user.id);
    if (used >= limit) {
      throw new HttpException(
        "Bugungi AI limitingiz tugadi. Ertaga qayta urinib ko'ring.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /** Xarajatni yozadi. Yozish xatosi foydalanuvchi javobini buzmasligi kerak. */
  async record(
    userId: string | null,
    feature: string,
    provider: string,
    model: string,
    usage: AiUsageTokens,
  ): Promise<void> {
    try {
      await this.prisma.aiUsage.create({
        data: {
          userId,
          feature,
          provider,
          model,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
        },
      });
    } catch (e) {
      this.logger.error(`AiUsage yozilmadi: ${(e as Error).message}`);
    }
  }
}
