// src/modules/ai/features/ai-access.service.ts
import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CurrentUserPayload } from '../../../common/decorators/current-user.decorator';

@Injectable()
export class AiAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /** Student hozir vaqti tugamagan (IN_PROGRESS) test topshiryaptimi? */
  async isInActiveTest(studentId: string, now: number = Date.now()): Promise<boolean> {
    const sessions = await this.prisma.testSession.findMany({
      where: { studentId, status: 'IN_PROGRESS' },
      select: { startedAt: true, durationSeconds: true },
    });
    return sessions.some((s) => s.startedAt.getTime() + s.durationSeconds * 1000 > now);
  }

  /**
   * Anti-cheat (README 62-band ruhi): student test topshirayotgan paytda AI ishlamaydi.
   * O'qituvchi/admin uchun cheklov yo'q. allowInTest=true faqat aniq istisno uchun.
   */
  async assertAllowed(user: CurrentUserPayload, opts: { allowInTest?: boolean } = {}): Promise<void> {
    if (user.role !== 'STUDENT' || opts.allowInTest) return;
    if (await this.isInActiveTest(user.id)) {
      throw new ForbiddenException("Test davomida AI yordamchisi o'chirilgan. Testni yakunlagach foydalanishingiz mumkin.");
    }
  }

  /** Ism serverda bazadan olinadi — mijoz yuborgan ismga ishonilmaydi. */
  async displayName(userId: string): Promise<string | undefined> {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { firstName: true } });
    return u?.firstName || undefined;
  }
}
