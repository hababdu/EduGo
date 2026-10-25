import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const HOUR = 3_600_000;

/** Vazifa muddatiga ~24 soat va ~2 soat qolganda topshirmagan o'quvchilarga eslatadi (har bosqich bir marta). */
@Injectable()
export class DeadlineReminderService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DeadlineReminderService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => void this.sweep().catch(() => undefined), 15 * 60 * 1000);
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  async sweep(now: Date = new Date()): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    let sent = 0;
    try {
      const items = await this.prisma.teacherAssignment.findMany({
        where: {
          deletedAt: null, status: 'PUBLISHED', category: 'HOMEWORK',
          dueAt: { gt: now, lte: new Date(now.getTime() + 24 * HOUR) },
        },
        select: {
          id: true, title: true, dueAt: true,
          submissions: { select: { studentId: true } },
          group: { select: { members: { select: { student: { select: { id: true, role: true, status: true, deletedAt: true } } } } } },
        },
        take: 200,
      });

      for (const a of items) {
        const left = a.dueAt!.getTime() - now.getTime();
        const stage = left <= 2 * HOUR ? 'urgent' : 'day';
        const title = stage === 'urgent' ? `⏳ Muddat tugayapti (2 soatdan kam): ${a.title}` : `⏳ Vazifa muddati 24 soat ichida: ${a.title}`;
        const submitted = new Set(a.submissions.map((s) => s.studentId));
        const ids = a.group.members
          .map((m) => m.student)
          .filter((s) => s.role === 'STUDENT' && s.status === 'ACTIVE' && !s.deletedAt && !submitted.has(s.id))
          .map((s) => s.id);
        if (ids.length === 0) continue;

        const already = await this.prisma.notification.findMany({
          where: { userId: { in: ids }, type: 'DEADLINE_REMINDER', title, createdAt: { gte: new Date(now.getTime() - 26 * HOUR) } },
          select: { userId: true },
        });
        const done = new Set(already.map((n) => n.userId));
        const hours = Math.max(1, Math.round(left / HOUR));
        const body = stage === 'urgent' ? 'Vazifani hoziroq topshiring!' : `Muddatga taxminan ${hours} soat qoldi. Topshirishni unutmang.`;
        for (const id of ids) {
          if (done.has(id)) continue;
          await this.notifications.notify(id, 'DEADLINE_REMINDER', title, body).then(() => sent++).catch((e) => this.logger.warn(`Eslatma xatosi: ${(e as Error).message}`));
        }
      }
    } finally { this.running = false; }
    return sent;
  }
}
