import { Injectable, Logger, NotFoundException, BadRequestException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { gunzipSync, gzipSync } from 'zlib';
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
  /**
   * Zaxiradan tiklash (xavfsiz "birlashtirish"): faqat bazada YO'Q yozuvlar qaytariladi
   * (guruh, a'zolik, o'quvchi to'lovi, davomat). Mavjudlari o'zgarmaydi, hech narsa o'chirilmaydi,
   * foydalanuvchilar tiklanmaydi. Zaxira aynan shu maktabniki bo'lishi shart. `dryRun` — faqat hisob-kitob.
   */
  async restore(orgId: string, file: Buffer, dryRun: boolean) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId }, select: { id: true } });
    if (!org) throw new NotFoundException('Maktab topilmadi');

    let data: any;
    try {
      data = JSON.parse(gunzipSync(file, { maxOutputLength: 256 * 1024 * 1024 }).toString('utf8'));
    } catch {
      throw new BadRequestException("Zaxira fayli o'qilmadi (.json.gz bo'lishi kerak)");
    }
    if (data?.version !== 1 || !data?.org?.id) throw new BadRequestException("Zaxira formati noto'g'ri");
    if (data.org.id !== orgId) throw new BadRequestException('Bu zaxira boshqa maktabniki — tiklash rad etildi');
    const arr = (k: string): any[] => (Array.isArray(data[k]) ? data[k] : []);

    const missing = async (rows: any[], find: (ids: string[]) => Promise<{ id: string }[]>) => {
      const ids = rows.map((r) => r?.id).filter((x) => typeof x === 'string');
      const have = new Set<string>();
      for (let i = 0; i < ids.length; i += 5000) for (const r of await find(ids.slice(i, i + 5000))) have.add(r.id);
      return rows.filter((r) => typeof r?.id === 'string' && !have.has(r.id));
    };

    const orgUsers = new Set((await this.prisma.user.findMany({ where: { organizationId: orgId }, select: { id: true } })).map((u) => u.id));
    const date = (v: any) => (v ? new Date(v) : null);

    const newGroups = await missing(arr('groups'), (ids) => this.prisma.group.findMany({ where: { id: { in: ids } }, select: { id: true } }));
    const groupRows = newGroups.map((g) => ({
      id: g.id, organizationId: orgId, name: String(g.name ?? 'Guruh'), description: g.description ?? null, posterUrl: g.posterUrl ?? null,
      teacherId: orgUsers.has(g.teacherId) ? g.teacherId : null, assistantId: orgUsers.has(g.assistantId) ? g.assistantId : null,
      createdAt: date(g.createdAt) ?? new Date(), deletedAt: date(g.deletedAt), maxCapacity: g.maxCapacity ?? null,
      telegramChatUrl: g.telegramChatUrl ?? null, lessonDays: Array.isArray(g.lessonDays) ? g.lessonDays : [],
      lessonStartTime: g.lessonStartTime ?? null, lessonEndTime: g.lessonEndTime ?? null, room: g.room ?? null, monthlyFee: g.monthlyFee ?? null,
    }));

    // Tiklashdan keyin mavjud bo'ladigan guruhlar: maktabdagilar + hozir tiklanayotganlar
    const orgGroupIds = new Set((await this.prisma.group.findMany({ where: { organizationId: orgId }, select: { id: true } })).map((g) => g.id));
    for (const g of groupRows) orgGroupIds.add(g.id);

    const okMember = (r: any) => orgGroupIds.has(r.groupId) && orgUsers.has(r.studentId);
    const newMembers = (await missing(arr('members'), (ids) => this.prisma.groupMember.findMany({ where: { id: { in: ids } }, select: { id: true } }))).filter(okMember);
    const memberRows = newMembers.map((m) => ({ id: m.id, groupId: m.groupId, studentId: m.studentId, description: m.description ?? null, joinedAt: date(m.joinedAt) ?? new Date(), createdAt: date(m.createdAt) ?? new Date() }));

    const markers = new Set<string>();
    const candPays = (await missing(arr('payments'), (ids) => this.prisma.payment.findMany({ where: { id: { in: ids } }, select: { id: true } }))).filter(okMember);
    const candAtt = (await missing(arr('attendance'), (ids) => this.prisma.attendanceRecord.findMany({ where: { id: { in: ids } }, select: { id: true } }))).filter(okMember);
    for (const r of [...candPays, ...candAtt]) if (typeof r.markedById === 'string') markers.add(r.markedById);
    const existingMarkers = new Set((await this.prisma.user.findMany({ where: { id: { in: [...markers] } }, select: { id: true } })).map((u) => u.id));
    const payRows = candPays.filter((p) => existingMarkers.has(p.markedById)).map((p) => ({
      id: p.id, groupId: p.groupId, studentId: p.studentId, month: p.month, status: p.status, amount: p.amount ?? 0, note: p.note ?? null,
      paidAt: date(p.paidAt) ?? new Date(), markedById: p.markedById, createdAt: date(p.createdAt) ?? new Date(),
    }));
    const attRows = candAtt.filter((a) => existingMarkers.has(a.markedById)).map((a) => ({
      id: a.id, groupId: a.groupId, studentId: a.studentId, date: new Date(a.date), status: a.status, note: a.note ?? null,
      markedById: a.markedById, createdAt: date(a.createdAt) ?? new Date(),
    }));

    const summary = {
      dryRun,
      backupCreatedAt: data.createdAt ?? null,
      toRestore: { groups: groupRows.length, members: memberRows.length, payments: payRows.length, attendance: attRows.length },
    };
    if (dryRun) return summary;

    const chunks = <T,>(a: T[], n = 1000) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
    await this.prisma.$transaction(async (tx) => {
      for (const c of chunks(groupRows)) await tx.group.createMany({ data: c, skipDuplicates: true });
      for (const c of chunks(memberRows)) await tx.groupMember.createMany({ data: c, skipDuplicates: true });
      for (const c of chunks(payRows)) await tx.payment.createMany({ data: c as any, skipDuplicates: true });
      for (const c of chunks(attRows)) await tx.attendanceRecord.createMany({ data: c as any, skipDuplicates: true });
    }, { timeout: 120_000 });
    return summary;
  }
}
