import { Injectable, Logger, NotFoundException, BadRequestException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { gzipSync } from 'zlib';
import { PrismaService } from '../../prisma/prisma.service';
import { TelegramStorageService } from '../materials/telegram-storage.service';

const MAX_BYTES = 48 * 1024 * 1024; // Telegram sendDocument ≈ 50 MB
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Har bir maktab ma'lumotlarining zaxirasi — faqat O'SHA maktabning yopiq kanaliga yuboriladi.
 * Faqat `organizationId` bo'yicha filtrlanadi; boshqa maktab ma'lumoti yoki sirlar (token, kalit) kirmaydi.
 */
@Injectable()
export class SchoolBackupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SchoolBackupService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(private readonly prisma: PrismaService, private readonly tg: TelegramStorageService) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => void this.sweep(), 60 * 60 * 1000);
    setTimeout(() => void this.sweep(), 5 * 60 * 1000).unref?.();
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }

  /** Kuniga bir marta: kanali bor, faol maktablar uchun. */
  async sweep() {
    if (this.running || !this.tg.hasBot) return;
    this.running = true;
    try {
      const orgs = await this.prisma.organization.findMany({
        where: { storageChatId: { not: null }, status: 'ACTIVE' },
        select: { id: true, lastBackupAt: true },
      });
      for (const o of orgs) {
        if (o.lastBackupAt && Date.now() - o.lastBackupAt.getTime() < DAY_MS - 30 * 60 * 1000) continue;
        await this.backup(o.id).catch(() => undefined);
      }
    } finally { this.running = false; }
  }

  /** Ma'lumotlarni yig'adi (faqat shu maktab). */
  async collect(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true, status: true, note: true, monthlyPlanFee: true, createdAt: true },
    });
    if (!org) throw new NotFoundException('Maktab topilmadi');
    const [users, groups, members, payments, attendance, orgPayments] = await Promise.all([
      this.prisma.user.findMany({
        where: { organizationId: orgId },
        select: { id: true, telegramId: true, phone: true, username: true, firstName: true, lastName: true, role: true, status: true, registeredAt: true, deletedAt: true },
      }),
      this.prisma.group.findMany({ where: { organizationId: orgId } }),
      this.prisma.groupMember.findMany({ where: { group: { organizationId: orgId } } }),
      this.prisma.payment.findMany({ where: { group: { organizationId: orgId } } }),
      this.prisma.attendanceRecord.findMany({ where: { group: { organizationId: orgId } } }),
      this.prisma.orgPayment.findMany({ where: { organizationId: orgId } }),
    ]);
    return { org, users, groups, members, payments, attendance, orgPayments };
  }

  async backup(orgId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId }, select: { id: true, name: true, storageChatId: true } });
    if (!org) throw new NotFoundException('Maktab topilmadi');
    if (!org.storageChatId) throw new BadRequestException("Maktabga yopiq kanal biriktirilmagan");
    try {
      const data = await this.collect(orgId);
      const json = JSON.stringify({ version: 1, createdAt: new Date().toISOString(), ...data });
      const gz = gzipSync(Buffer.from(json, 'utf8'));
      if (gz.length > MAX_BYTES) throw new Error('Zaxira hajmi 48 MB dan oshdi');
      const day = new Date().toISOString().slice(0, 10);
      const safe = org.name.replace(/[^\p{L}\p{N}]+/gu, '_').slice(0, 40) || 'maktab';
      const stored = await this.tg.store(gz, `zaxira_${safe}_${day}.json.gz`, 'application/gzip', org.storageChatId);
      const status = `OK ${Math.max(1, Math.round(gz.length / 1024))} KB`;
      await this.prisma.organization.update({ where: { id: orgId }, data: { lastBackupAt: new Date(), lastBackupStatus: status } });
      return { ok: true, status, messageId: stored.messageId, counts: { users: data.users.length, groups: data.groups.length, payments: data.payments.length } };
    } catch (e) {
      const msg = `Xato: ${(e as Error).message ?? 'noma\'lum'}`.slice(0, 200);
      this.logger.warn(`Zaxira xatosi (${orgId}): ${msg}`);
      await this.prisma.organization.update({ where: { id: orgId }, data: { lastBackupAt: new Date(), lastBackupStatus: msg } }).catch(() => undefined);
      throw e;
    }
  }
}
