import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { currentMonth, monthEndsAfter } from './payments.service';

const TZ_OFFSET_MS = 5 * 3_600_000;
const DAY_MS = 86_400_000;
/** Oyning shu kunlarida (Toshkent, soat 10:00 dan keyin) eslatadi */
export const REMINDER_DAYS = [5, 15];

/** To'lamagan o'quvchilarga ("to'lov belgisi yo'q") va maktab adminiga qarzdorlar soni haqida eslatma. */
@Injectable()
export class PaymentReminderService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PaymentReminderService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => void this.sweep().catch(() => undefined), 60 * 60 * 1000);
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  async sweep(now: Date = new Date()): Promise<{ students: number; admins: number }> {
    const out = { students: 0, admins: 0 };
    const local = new Date(now.getTime() + TZ_OFFSET_MS);
    if (!REMINDER_DAYS.includes(local.getUTCDate()) || local.getUTCHours() < 10) return out;
    if (this.running) return out;
    this.running = true;
    try {
      const month = currentMonth(now);
      const groups = await this.prisma.group.findMany({
        where: { deletedAt: null, monthlyFee: { not: null }, organization: { is: { status: 'ACTIVE' } } },
        select: {
          id: true, name: true, organizationId: true,
          members: { select: { joinedAt: true, student: { select: { id: true, role: true, status: true, deletedAt: true } } } },
          payments: { where: { month }, select: { studentId: true } },
        },
      });

      const since = new Date(now.getTime() - 5 * DAY_MS);
      const perOrg = new Map<string, number>();
      const allDebtors = new Map<string, string>(); // studentId → guruh nomi

      for (const g of groups) {
        const paid = new Set(g.payments.map((p) => p.studentId));
        const debtors = g.members
          .filter((m) => m.student.role === 'STUDENT' && m.student.status === 'ACTIVE' && !m.student.deletedAt)
          .filter((m) => !paid.has(m.student.id) && monthEndsAfter(month, new Date(m.joinedAt)))
          .map((m) => m.student.id);
        if (debtors.length === 0) continue;
        for (const id of debtors) allDebtors.set(id, g.name);
        if (g.organizationId) perOrg.set(g.organizationId, (perOrg.get(g.organizationId) ?? 0) + debtors.length);

        const title = `💳 ${month} oyi to'lovi: ${g.name}`;
        const done = new Set(
          (await this.prisma.notification.findMany({ where: { userId: { in: debtors }, type: 'SYSTEM', title, createdAt: { gte: since } }, select: { userId: true } })).map((n) => n.userId),
        );
        for (const id of debtors) {
          if (done.has(id)) continue;
          await this.notifications
            .notify(id, 'SYSTEM', title, "Bu oy uchun to'lov belgilanmagan. Iltimos, to'lovni amalga oshiring yoki o'qituvchi/admin bilan bog'laning.")
            .then(() => out.students++)
            .catch((e) => this.logger.warn(`Eslatma xatosi: ${(e as Error).message}`));
        }
      }

      // Ota-onalarga ham (farzandning to'lovi belgilanmagan)
      const pl = (this.prisma as any).parentLink;
      if (pl && allDebtors.size) {
        const links = await pl.findMany({
          where: { studentId: { in: [...allDebtors.keys()] }, parent: { status: 'ACTIVE', deletedAt: null } },
          select: { parentId: true, studentId: true, student: { select: { firstName: true, lastName: true } } },
        });
        for (const l of links) {
          const child = `${l.student.firstName} ${l.student.lastName ?? ''}`.trim();
          const title = `💳 ${child}: ${month} oyi to'lovi (${allDebtors.get(l.studentId)})`;
          const exists = await this.prisma.notification.findFirst({ where: { userId: l.parentId, type: 'SYSTEM', title, createdAt: { gte: since } }, select: { id: true } });
          if (exists) continue;
          await this.notifications.notify(l.parentId, 'SYSTEM', title, "Bu oy uchun to'lov belgilanmagan. Iltimos, to'lovni amalga oshiring.").catch(() => undefined);
        }
      }

      for (const [orgId, count] of perOrg) {
        const admins = await this.prisma.user.findMany({ where: { organizationId: orgId, role: 'ADMIN', status: 'ACTIVE', deletedAt: null }, select: { id: true } });
        const title = `💳 ${month} oyi: qarzdorlar`;
        const done = new Set(
          (await this.prisma.notification.findMany({ where: { userId: { in: admins.map((a) => a.id) }, type: 'SYSTEM', title, createdAt: { gte: since } }, select: { userId: true } })).map((n) => n.userId),
        );
        for (const a of admins) {
          if (done.has(a.id)) continue;
          await this.notifications.notify(a.id, 'SYSTEM', title, `${count} ta o'quvchi hali to'lamagan. To'lovlar bo'limida ro'yxatni ko'ring.`).then(() => out.admins++).catch(() => undefined);
        }
      }
    } finally { this.running = false; }
    return out;
  }
}
