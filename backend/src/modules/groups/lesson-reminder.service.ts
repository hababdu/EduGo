import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { tashkentWeekday } from './schedule.util';

const TZ_OFFSET_MS = 5 * 3_600_000;
const LEAD_MIN = 30; // dars boshlanishiga shuncha daqiqa qolganda eslatadi

/** "HH:mm" → kun boshidan daqiqalar */
export function minutesOf(hhmm: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** Dars boshlanishidan ~30 daqiqa oldin o'quvchilarga Telegram + ilova ichida eslatma (kuniga bir marta). */
@Injectable()
export class LessonReminderService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LessonReminderService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => void this.sweep().catch(() => undefined), 5 * 60 * 1000);
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  async sweep(now: Date = new Date()): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    let sent = 0;
    try {
      const local = new Date(now.getTime() + TZ_OFFSET_MS);
      const nowMin = local.getUTCHours() * 60 + local.getUTCMinutes();
      const dayStart = new Date(`${local.toISOString().slice(0, 10)}T00:00:00.000Z`).getTime() - TZ_OFFSET_MS;

      const groups = await this.prisma.group.findMany({
        where: { deletedAt: null, lessonDays: { has: tashkentWeekday(now) }, lessonStartTime: { not: null } },
        select: {
          id: true, name: true, room: true, lessonStartTime: true,
          members: { select: { student: { select: { id: true, role: true, status: true, deletedAt: true } } } },
        },
      });

      for (const g of groups) {
        const start = minutesOf(g.lessonStartTime ?? '');
        if (start === null) continue;
        const diff = start - nowMin;
        if (diff <= 0 || diff > LEAD_MIN) continue;

        const title = `⏰ Dars ${g.lessonStartTime}: ${g.name}`;
        const ids = g.members
          .map((m) => m.student)
          .filter((s) => s.role === 'STUDENT' && s.status === 'ACTIVE' && !s.deletedAt)
          .map((s) => s.id);
        if (ids.length === 0) continue;

        const already = await this.prisma.notification.findMany({
          where: { userId: { in: ids }, type: 'NEW_LESSON', title, createdAt: { gte: new Date(dayStart) } },
          select: { userId: true },
        });
        const done = new Set(already.map((n) => n.userId));
        const body = `Dars ${diff} daqiqadan keyin boshlanadi${g.room ? ` · xona: ${g.room}` : ''}.`;
        for (const id of ids) {
          if (done.has(id)) continue;
          await this.notifications.notify(id, 'NEW_LESSON', title, body).then(() => sent++).catch((e) => this.logger.warn(`Eslatma xatosi: ${(e as Error).message}`));
        }
      }
    } finally { this.running = false; }
    return sent;
  }
}
