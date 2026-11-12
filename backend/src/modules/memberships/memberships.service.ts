import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException, OnModuleInit, Optional } from '@nestjs/common';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { isSuperAdmin } from '../../common/org-scope';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

type MRole = 'STUDENT' | 'TEACHER' | 'ADMIN';
const MAX_PENDING = 3;
const PAGE = 30;

const nameOf = (u: { firstName: string; lastName: string | null }) => [u.firstName, u.lastName].filter(Boolean).join(' ');
const USER_SEL = { select: { id: true, firstName: true, lastName: true, username: true, telegramId: true, role: true, status: true, organizationId: true } } as const;

@Injectable()
export class MembershipsService implements OnModuleInit {
  private readonly logger = new Logger(MembershipsService.name);
  constructor(private readonly prisma: PrismaService, @Optional() private readonly notifications?: NotificationsService) {}

  /** Bildirishnoma (ilova + Telegram). Asosiy amalni hech qachon to'xtatmaydi. */
  private tell(userId: string, title: string, body: string) {
    this.notifications?.notify(userId, 'SYSTEM', title, body).catch((e) => this.logger.warn(`Bildirishnoma xatosi: ${(e as Error).message}`));
  }

  /** Maktab adminlariga xabar (yangi so'rov kelganda) */
  private async tellAdmins(orgId: string, title: string, body: string) {
    if (!this.notifications) return;
    try {
      const admins = await this.prisma.organizationMembership.findMany({ where: { organizationId: orgId, role: 'ADMIN', status: 'ACTIVE' }, select: { userId: true } });
      for (const a of admins) this.tell(a.userId, title, body);
    } catch { /* xabar ixtiyoriy */ }
  }

  /** Eski foydalanuvchilar (User.organizationId) uchun a'zolik yozuvlarini bir marta yaratadi (idempotent). */
  async onModuleInit() {
    try {
      const users = await this.prisma.user.findMany({
        where: { organizationId: { not: null }, deletedAt: null, role: { in: ['STUDENT', 'TEACHER', 'ADMIN'] } },
        select: { id: true, organizationId: true, role: true },
      });
      if (!users.length) return;
      const r = await this.prisma.organizationMembership.createMany({
        data: users.map((u) => ({ userId: u.id, organizationId: u.organizationId!, role: u.role, status: 'ACTIVE' as const })),
        skipDuplicates: true,
      });
      if (r.count) this.logger.log(`A'zolik yozuvlari yaratildi: ${r.count}`);
    } catch (e) {
      this.logger.warn(`A'zolik backfill xatosi: ${(e as Error).message}`);
    }
  }

  /* ───────── Foydalanuvchi tomoni ───────── */

  /** Qo'shilish uchun maktablar (faqat ochiq maydonlar). */
  async schools(search?: string) {
    const q = search?.trim();
    return this.prisma.organization.findMany({
      where: { status: 'ACTIVE', ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}) },
      orderBy: { name: 'asc' },
      take: 30,
      select: { id: true, name: true },
    });
  }

  async mine(user: CurrentUserPayload) {
    const rows = await this.prisma.organizationMembership.findMany({
      where: { userId: user.id },
      orderBy: { requestedAt: 'desc' },
      include: { organization: { select: { id: true, name: true } } },
    });
    return rows.map((m) => ({ id: m.id, role: m.role, status: m.status, requestedAt: m.requestedAt, decidedAt: m.decidedAt, organization: m.organization, isActive: m.status === 'ACTIVE' && m.organizationId === user.organizationId }));
  }

  async requestJoin(user: CurrentUserPayload, orgId: string, role: 'STUDENT' | 'TEACHER' = 'STUDENT', message?: string) {
    if (user.role === 'SUPER_ADMIN') throw new BadRequestException("Super admin maktabga qo'shilmaydi");
    if (user.status === 'BLOCKED') throw new ForbiddenException('Hisobingiz bloklangan');
    const org = await this.prisma.organization.findFirst({ where: { id: orgId, status: 'ACTIVE' }, select: { id: true } });
    if (!org) throw new NotFoundException('Maktab topilmadi yoki faol emas');
    // O'quvchi va o'qituvchi bir nechta tashkilotda alohida membership bilan ishlashi mumkin.
    // ADMIN membership faqat Super Admin tomonidan tayinlanadi.

    const existing = await this.prisma.organizationMembership.findUnique({ where: { userId_organizationId: { userId: user.id, organizationId: orgId } } });
    if (existing?.status === 'ACTIVE') throw new ConflictException("Siz allaqachon shu maktab a'zosisiz");
    if (existing?.status === 'PENDING') throw new ConflictException("So'rov allaqachon yuborilgan");

    const pending = await this.prisma.organizationMembership.count({ where: { userId: user.id, status: 'PENDING' } });
    if (pending >= MAX_PENDING) throw new BadRequestException(`Bir vaqtda ko'pi bilan ${MAX_PENDING} ta so'rov yuborish mumkin`);

    const data = { role, status: 'PENDING' as const, message: message?.trim() || null, requestedAt: new Date(), decidedAt: null, decidedById: null };
    const m = existing
      ? await this.prisma.organizationMembership.update({ where: { id: existing.id }, data })
      : await this.prisma.organizationMembership.create({ data: { userId: user.id, organizationId: orgId, ...data } });
    void this.tellAdmins(orgId, "📥 Yangi qo'shilish so'rovi", "«Maktab» bo'limida «A'zolar» tabini oching va so'rovni ko'rib chiqing.");
    return { id: m.id, status: m.status };
  }

  /** Faol tashkilot har qanday membership roli uchun alohida context jadvalida saqlanadi. */
  async activate(user: CurrentUserPayload, membershipId: string) {
    const m = await this.prisma.organizationMembership.findUnique({ where: { id: membershipId }, include: { organization: { select: { status: true } } } });
    if (!m || m.userId !== user.id || m.status !== 'ACTIVE') throw new NotFoundException("Faol a'zolik topilmadi");
    if (m.organization.status !== 'ACTIVE') throw new BadRequestException('Tashkilot faol emas');
    await this.prisma.$transaction(async (tx) => {
      await tx.userActiveOrganization.upsert({
        where: { userId: user.id }, create: { userId: user.id, organizationId: m.organizationId },
        update: { organizationId: m.organizationId },
      });
      // Legacy maydon faqat eski endpointlar bilan moslik uchun sinxronlanadi.
      await tx.user.update({ where: { id: user.id }, data: { organizationId: m.organizationId, role: m.role } });
    });
    return { ok: true, organizationId: m.organizationId, role: m.role };
  }

  async cancel(user: CurrentUserPayload, id: string) {
    const m = await this.prisma.organizationMembership.findUnique({ where: { id } });
    if (!m || m.userId !== user.id) throw new NotFoundException("So'rov topilmadi");
    if (m.status !== 'PENDING') throw new BadRequestException("Faqat kutilayotgan so'rovni bekor qilish mumkin");
    await this.prisma.organizationMembership.delete({ where: { id } });
    return { ok: true };
  }

  /* ───────── Admin tomoni ───────── */

  /** Maktab admini — faqat o'z maktabi; SUPER_ADMIN — so'ralgan maktab. */
  private scopeOrg(actor: CurrentUserPayload, requested?: string): string {
    if (isSuperAdmin(actor)) {
      if (!requested) throw new BadRequestException('Maktabni tanlang');
      return requested;
    }
    if (!actor.organizationId) throw new ForbiddenException('Siz hech qaysi maktab admini emassiz');
    if (requested && requested !== actor.organizationId) throw new ForbiddenException('Bu boshqa maktab');
    return actor.organizationId;
  }

  private async load(actor: CurrentUserPayload, id: string) {
    const m = await this.prisma.organizationMembership.findUnique({ where: { id }, include: { user: USER_SEL, organization: { select: { name: true } } } });
    if (!m) throw new NotFoundException("A'zolik topilmadi");
    if (!isSuperAdmin(actor) && m.organizationId !== actor.organizationId) throw new ForbiddenException('Bu boshqa maktab');
    return m;
  }

  async list(actor: CurrentUserPayload, q: { organizationId?: string; status?: string; role?: string; search?: string; page?: string }) {
    const orgId = this.scopeOrg(actor, q.organizationId);
    const s = q.search?.trim();
    const where: any = {
      organizationId: orgId,
      status: q.status ?? 'ACTIVE',
      ...(q.role ? { role: q.role } : {}),
      ...(s ? { user: { OR: [
        { firstName: { contains: s, mode: 'insensitive' } },
        { lastName: { contains: s, mode: 'insensitive' } },
        { username: { contains: s, mode: 'insensitive' } },
      ] } } : {}),
    };
    const page = Math.max(1, Number(q.page) || 1);
    const [total, rows] = await Promise.all([
      this.prisma.organizationMembership.count({ where }),
      this.prisma.organizationMembership.findMany({ where, orderBy: { requestedAt: 'desc' }, skip: (page - 1) * PAGE, take: PAGE, include: { user: USER_SEL } }),
    ]);
    return {
      total, page, pages: Math.max(1, Math.ceil(total / PAGE)),
      items: rows.map((m) => ({ id: m.id, role: m.role, status: m.status, message: m.message, requestedAt: m.requestedAt, decidedAt: m.decidedAt, user: { id: m.user.id, name: nameOf(m.user), username: m.user.username, telegramId: m.user.telegramId } })),
    };
  }

  /** Membership roli global User.role'dan mustaqil; legacy orgId faqat fallback sifatida yangilanadi. */
  private async applyActive(userId: string, orgId: string, role: MRole) {
    if (role === 'STUDENT') await this.prisma.studentProfile.upsert({ where: { userId }, create: { userId }, update: {} });
    if (role === 'TEACHER') await this.prisma.teacherProfile.upsert({ where: { userId }, create: { userId }, update: {} });
    if (role === 'ADMIN') await this.prisma.adminProfile.upsert({ where: { userId }, create: { userId }, update: {} });
    await this.prisma.$transaction(async (tx) => {
      await tx.userActiveOrganization.upsert({
        where: { userId }, create: { userId, organizationId: orgId }, update: { organizationId: orgId },
      });
      await tx.user.update({ where: { id: userId }, data: { organizationId: orgId, role } });
    });
  }

  private audit(actor: CurrentUserPayload, action: string, id: string, oldValue: unknown, newValue: unknown) {
    return this.prisma.adminActionLog.create({ data: { actorId: actor.id, action, targetType: 'OrganizationMembership', targetId: id, oldValue: oldValue as any, newValue: newValue as any } }).catch(() => undefined);
  }

  private guardTarget(actor: CurrentUserPayload, m: { userId: string; user: { role: string } }) {
    if (m.user.role === 'SUPER_ADMIN') throw new BadRequestException("Super adminga tegib bo'lmaydi");
    if (m.userId === actor.id) throw new BadRequestException("O'zingizning a'zoligingizni o'zgartira olmaysiz");
  }

  async decide(actor: CurrentUserPayload, id: string, approve: boolean, role?: MRole) {
    const m = await this.load(actor, id);
    if (m.status !== 'PENDING') throw new BadRequestException("So'rov allaqachon ko'rib chiqilgan");
    this.guardTarget(actor, m);
    const now = new Date();
    if (!approve) {
      await this.prisma.organizationMembership.update({ where: { id }, data: { status: 'REJECTED', decidedAt: now, decidedById: actor.id } });
      await this.audit(actor, 'MEMBERSHIP_REJECT', id, { status: 'PENDING' }, { status: 'REJECTED' });
      this.tell(m.userId, "So'rovingiz rad etildi", `«${(m.organization?.name ?? "maktab")}» maktabiga qo'shilish so'rovingiz rad etildi.`);
      return { ok: true, status: 'REJECTED' };
    }
    const finalRole = role ?? (m.role as MRole);
    await this.prisma.organizationMembership.update({ where: { id }, data: { status: 'ACTIVE', role: finalRole, decidedAt: now, decidedById: actor.id } });
    if (finalRole === 'STUDENT') {
      await this.prisma.studentProfile.upsert({ where: { userId: m.userId }, create: { userId: m.userId }, update: {} });
      if (!m.user.organizationId) await this.applyActive(m.userId, m.organizationId, 'STUDENT');
    } else if (!m.user.organizationId) {
      await this.applyActive(m.userId, m.organizationId, finalRole);
    } else if (m.user.organizationId === m.organizationId) {
      await this.prisma.user.update({ where: { id: m.userId }, data: { role: finalRole } });
    }
    await this.audit(actor, 'MEMBERSHIP_APPROVE', id, { status: 'PENDING', role: m.role }, { status: 'ACTIVE', role: finalRole });
    this.tell(m.userId, "✅ So'rovingiz qabul qilindi", `Siz «${(m.organization?.name ?? "maktab")}» maktabining ${finalRole === 'TEACHER' ? "o'qituvchisi" : finalRole === 'ADMIN' ? 'administratori' : "o'quvchisi"} bo'ldingiz.`);
    return { ok: true, status: 'ACTIVE' };
  }

  /** Foydalanuvchini maktabga to'g'ridan-to'g'ri biriktirish (so'rovsiz). */
  async attach(actor: CurrentUserPayload, userId: string, role: MRole, requestedOrg?: string) {
    const orgId = this.scopeOrg(actor, requestedOrg);
    if (role === 'ADMIN' && !isSuperAdmin(actor)) throw new ForbiddenException('Admin tayinlash faqat super adminga ruxsat');
    const [user, org] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, status: true, deletedAt: true, organizationId: true } }),
      this.prisma.organization.findFirst({ where: { id: orgId, status: 'ACTIVE' }, select: { id: true } }),
    ]);
    if (!user || user.deletedAt) throw new NotFoundException('Foydalanuvchi topilmadi');
    if (!org) throw new NotFoundException('Maktab topilmadi yoki faol emas');
    if (user.role === 'SUPER_ADMIN') throw new BadRequestException("Super adminni maktabga biriktirib bo'lmaydi");
    if (user.status === 'BLOCKED') throw new BadRequestException('Bloklangan foydalanuvchini biriktirib bo\'lmaydi');
    const m = await this.prisma.organizationMembership.upsert({
      where: { userId_organizationId: { userId, organizationId: orgId } },
      create: { userId, organizationId: orgId, role, status: 'ACTIVE', decidedAt: new Date(), decidedById: actor.id },
      update: { role, status: 'ACTIVE', decidedAt: new Date(), decidedById: actor.id },
    });
    if (role === 'STUDENT') {
      await this.prisma.studentProfile.upsert({ where: { userId }, create: { userId }, update: {} });
      if (!user.organizationId) await this.applyActive(userId, orgId, 'STUDENT');
    } else if (!user.organizationId) {
      await this.applyActive(userId, orgId, role);
    } else if (user.organizationId === orgId) {
      await this.prisma.user.update({ where: { id: userId }, data: { role } });
    }
    await this.audit(actor, 'MEMBERSHIP_ATTACH', m.id, null, { userId, organizationId: orgId, role });
    return { id: m.id };
  }

  async changeRole(actor: CurrentUserPayload, id: string, role: MRole) {
    const m = await this.load(actor, id);
    if (m.status !== 'ACTIVE') throw new BadRequestException("Faqat faol a'zoning rolini o'zgartirish mumkin");
    this.guardTarget(actor, m);
    // Admin darajasiga ko'tarish yoki admindan tushirish — faqat super admin
    if ((role === 'ADMIN' || m.role === 'ADMIN') && !isSuperAdmin(actor)) throw new ForbiddenException('Admin rolini faqat super admin o\'zgartiradi');
    if (m.role === role) return { ok: true };
    await this.prisma.organizationMembership.update({ where: { id }, data: { role } });
    if (m.user.organizationId === m.organizationId) {
      await this.prisma.user.update({ where: { id: m.userId }, data: { role } });
    }
    if (role === 'STUDENT') await this.prisma.studentProfile.upsert({ where: { userId: m.userId }, create: { userId: m.userId }, update: {} });
    if (role === 'TEACHER') await this.prisma.teacherProfile.upsert({ where: { userId: m.userId }, create: { userId: m.userId }, update: {} });
    if (role === 'ADMIN') await this.prisma.adminProfile.upsert({ where: { userId: m.userId }, create: { userId: m.userId }, update: {} });
    await this.audit(actor, 'MEMBERSHIP_ROLE', id, { role: m.role }, { role });
    this.tell(m.userId, 'Rolingiz o\'zgardi', `«${(m.organization?.name ?? "maktab")}» maktabida endi siz ${role === 'TEACHER' ? "o'qituvchi" : role === 'ADMIN' ? 'administrator' : "o'quvchi"}siz.`);
    return { ok: true };
  }

  async remove(actor: CurrentUserPayload, id: string) {
    const m = await this.load(actor, id);
    if (m.status !== 'ACTIVE') throw new BadRequestException("A'zo faol emas");
    this.guardTarget(actor, m);
    if (m.role === 'ADMIN' && !isSuperAdmin(actor)) throw new ForbiddenException("Adminni faqat super admin chiqara oladi");
    await this.prisma.organizationMembership.update({ where: { id }, data: { status: 'REMOVED', decidedAt: new Date(), decidedById: actor.id } });
    // Shu maktab guruhlaridagi a'zolik/biriktirish ham bekor qilinadi (eski guruhga kirib bo'lmasin)
    if (m.role === 'STUDENT') await this.prisma.groupMember.deleteMany({ where: { studentId: m.userId, group: { organizationId: m.organizationId } } });
    else if (m.role === 'TEACHER') await this.prisma.group.updateMany({ where: { teacherId: m.userId, organizationId: m.organizationId }, data: { teacherId: null } });
    // Joriy maktab chiqarilsa — eng oxirgi tasdiqlangan faol a'zolik tanlanadi (aniq tartib).
    // Faqat shu maktabdagi a'zolik bekor qilinadi. Boshqa maktablardagi faol a'zoliklar saqlanadi.
    const remaining = await this.prisma.organizationMembership.findFirst({ where: { userId: m.userId, status: 'ACTIVE', id: { not: m.id } }, orderBy: [{ decidedAt: 'desc' }, { requestedAt: 'desc' }], select: { organizationId: true, role: true } });
    if (m.user.organizationId === m.organizationId) {
      await this.prisma.$transaction(async (tx) => {
        if (remaining?.organizationId) {
          await tx.userActiveOrganization.upsert({
            where: { userId: m.userId },
            create: { userId: m.userId, organizationId: remaining.organizationId },
            update: { organizationId: remaining.organizationId },
          });
        } else {
          await tx.userActiveOrganization.deleteMany({ where: { userId: m.userId } });
        }
        // Global role o'zgarmaydi; faqat legacy organizationId mirror yangilanadi.
        await tx.user.updateMany({
          where: { id: m.userId, organizationId: m.organizationId },
          data: { organizationId: remaining?.organizationId ?? null, role: remaining?.role ?? 'STUDENT' },
        });
      });
    }
    await this.audit(actor, 'MEMBERSHIP_REMOVE', id, { status: 'ACTIVE', role: m.role }, { status: 'REMOVED' });
    this.tell(m.userId, 'Maktabdan chiqarildingiz', `Siz «${(m.organization?.name ?? "maktab")}» maktabi a'zoligidan chiqarildingiz.`);
    return { ok: true };
  }
}
