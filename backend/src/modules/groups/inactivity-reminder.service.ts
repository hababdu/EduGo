import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const DAY_MS = 86_400_000;
const TZ_OFFSET_MS = 5 * 3_600_000;
export const INACTIVE_AFTER_DAYS = 3;
export const GIVE_UP_AFTER_DAYS = 30; // bundan uzoq yo'qolganlarga xabar yubormaymiz (bezovta qilmaslik uchun)
export const REPEAT_EVERY_DAYS = 7;

/** 3+ kun kirmagan faol o'quvchilarga mehribon eslatma (haftada ko'pi bilan bitta). Kuniga bir marta, 17:00 dan keyin. */
@Injectable()
export class InactivityReminderService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InactivityReminderService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => void this.sweep().catch(() => undefined), 60 * 60 * 1000);
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  async sweep(now: Date = new Date()): Promise<number> {
    const hour = new Date(now.getTime() + TZ_OFFSET_MS).getUTCHours();
    if (hour < 17 || hour > 20 || this.running) return 0;
    this.running = true;
    let sent = 0;
    try {
      const students = await this.prisma.user.findMany({
        where: {
          role: 'STUDENT', status: 'ACTIVE', deletedAt: null,
          lastActiveAt: { lt: new Date(now.getTime() - INACTIVE_AFTER_DAYS * DAY_MS), gt: new Date(now.getTime() - GIVE_UP_AFTER_DAYS * DAY_MS) },
          groupMemberships: { some: { group: { deletedAt: null } } },
        },
        select: { id: true, firstName: true },
        take: 500,
      });
      if (students.length === 0) return 0;

      const title = '👋 Sizni sog\'indik!';
      const recent = new Set(
        (await this.prisma.notification.findMany({
          where: { userId: { in: students.map((s) => s.id) }, title, createdAt: { gte: new Date(now.getTime() - REPEAT_EVERY_DAYS * DAY_MS) } },
          select: { userId: true },
        })).map((n) => n.userId),
      );
      for (const s of students) {
        if (recent.has(s.id)) continue;
        await this.notifications
          .notify(s.id, 'SYSTEM', title, `${s.firstName}, bir necha kundan beri ilovaga kirmadingiz. Bugun qisqa mashq qilib, ketma-ketligingizni davom ettiring!`)
          .then(() => sent++)
          .catch((e) => this.logger.warn(`Eslatma xatosi: ${(e as Error).message}`));
      }
    } finally { this.running = false; }
    return sent;
  }
}
