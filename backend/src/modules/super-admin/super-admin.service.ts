import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { superAdminIds } from '../../common/super-admin.util';
import { PrismaService } from '../../prisma/prisma.service';
import { TelegramStorageService } from '../materials/telegram-storage.service';
import { AiConfig } from '../ai/ai.config';
import { AiService } from '../ai/ai.service';
import { AiSettingsService, LIMIT_ROLES } from '../ai/ai-settings.service';
import { AiUsageService } from '../ai/ai-usage.service';
import { currentMonth } from '../groups/payments.service';
import { AllUsersQueryDto, ChangeRoleDto, AssignAdminDto, CreateOrgDto, UpdateAiDto, UpdateOrgDto } from './dto/super-admin.dto';

const PAGE = 30;
const nameOf = (u: { firstName: string; lastName: string | null; username: string | null }) =>
  `${u.firstName} ${u.lastName ?? ''}`.trim() || u.username || 'Nomsiz';

@Injectable()
export class SuperAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cfg: ConfigService,
    private readonly aiCfg: AiConfig,
    private readonly aiSettings: AiSettingsService,
    private readonly aiUsage: AiUsageService,
    private readonly aiService: AiService,
    private readonly storage: TelegramStorageService,
  ) {}

  auditAction(actor: CurrentUserPayload, action: string, targetType: string, targetId: string, oldValue?: unknown, newValue?: unknown) {
    return this.audit(actor, action, targetType, targetId, oldValue, newValue);
  }

  private audit(actor: CurrentUserPayload, action: string, targetType: string, targetId: string, oldValue?: unknown, newValue?: unknown) {
    return this.prisma.adminActionLog
      .create({ data: { actorId: actor.id, action, targetType, targetId, oldValue: oldValue as any, newValue: newValue as any } })
      .catch(() => undefined);
  }

  /* ───────── Umumiy ───────── */
  async overview() {
    const since = new Date(Date.now() - 7 * 86_400_000);
    const [orgs, byRole, groups, tests, files, aiToday, active7] = await Promise.all([
      this.prisma.organization.groupBy({ by: ['status'], _count: true }),
      this.prisma.user.groupBy({ by: ['role'], where: { deletedAt: null }, _count: true }),
      this.prisma.group.count({ where: { deletedAt: null } }),
      this.prisma.test.count(),
      this.prisma.materialFile.aggregate({ _count: true, _sum: { sizeBytes: true } }),
      this.prisma.aiUsage.aggregate({ where: { createdAt: { gte: this.aiUsage.startOfToday() } }, _sum: { inputTokens: true, outputTokens: true }, _count: true }),
      this.prisma.user.count({ where: { deletedAt: null, lastActiveAt: { gte: since } } }),
    ]);
    const roles = Object.fromEntries(byRole.map((r) => [r.role, r._count]));
    return {
      organizations: { active: orgs.find((o) => o.status === 'ACTIVE')?._count ?? 0, suspended: orgs.find((o) => o.status === 'SUSPENDED')?._count ?? 0 },
      users: { total: byRole.reduce((n, r) => n + r._count, 0), roles, active7d: active7 },
      groups, tests,
      files: { count: files._count, bytes: files._sum.sizeBytes ?? 0 },
      aiToday: { requests: aiToday._count, tokens: (aiToday._sum.inputTokens ?? 0) + (aiToday._sum.outputTokens ?? 0) },
    };
  }

  /* ───────── Maktablar ───────── */
  async listOrgs() {
    const orgs = await this.prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { groups: true } } },
    });
    const memberships = await this.prisma.organizationMembership.findMany({
      where: { organizationId: { in: orgs.map((o) => o.id) }, status: 'ACTIVE', user: { deletedAt: null } },
      select: {
        organizationId: true, role: true,
        user: { select: { id: true, firstName: true, lastName: true, username: true, telegramId: true } },
      },
    });
    return orgs.map((o) => {
      const members = memberships.filter((m) => m.organizationId === o.id);
      return {
        id: o.id, name: o.name, status: o.status, note: o.note, createdAt: o.createdAt,
        monthlyPlanFee: o.monthlyPlanFee, storageChatId: o.storageChatId, lastBackupAt: o.lastBackupAt, lastBackupStatus: o.lastBackupStatus,
        users: members.length, groups: o._count.groups,
        admins: members.filter((m) => m.role === 'ADMIN').map((m) => ({
          id: m.user.id, name: nameOf(m.user), username: m.user.username, telegramId: m.user.telegramId,
        })),
      };
    });
  }

  /** Bitta kanal faqat bitta maktabga biriktiriladi (aks holda maktablar ma'lumoti aralashib ketadi). */
  private async assertChannelFree(chatId: string, exceptOrgId?: string) {
    const used = await this.prisma.organization.findFirst({ where: { storageChatId: chatId, ...(exceptOrgId ? { id: { not: exceptOrgId } } : {}) }, select: { name: true } });
    if (used) throw new ConflictException(`Bu kanal allaqachon «${used.name}» maktabiga biriktirilgan. Har maktabga alohida kanal kerak`);
  }

  async createOrg(actor: CurrentUserPayload, dto: CreateOrgDto) {
    const name = dto.name.trim();
    const exists = await this.prisma.organization.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
    if (exists) throw new ConflictException('Bunday nomli maktab allaqachon bor');
    await this.assertChannelFree(dto.storageChatId);
    const ch = await this.storage.verifyChannel(dto.storageChatId);
    const org = await this.prisma.organization.create({ data: { name, note: dto.note?.trim() || null, storageChatId: dto.storageChatId } });
    await this.audit(actor, 'ORG_CREATE', 'Organization', org.id, null, { name, storageChatId: dto.storageChatId, channel: ch.title });
    return org;
  }

  async updateOrg(actor: CurrentUserPayload, id: string, dto: UpdateOrgDto) {
    const old = await this.prisma.organization.findUnique({ where: { id } });
    if (!old) throw new NotFoundException('Maktab topilmadi');
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.note !== undefined) data.note = dto.note.trim() || null;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.monthlyPlanFee !== undefined) data.monthlyPlanFee = dto.monthlyPlanFee;
    if (dto.storageChatId !== undefined && dto.storageChatId !== old.storageChatId) {
      await this.assertChannelFree(dto.storageChatId, id);
      await this.storage.verifyChannel(dto.storageChatId);
      data.storageChatId = dto.storageChatId;
    }
    const org = await this.prisma.organization.update({ where: { id }, data });
    await this.audit(actor, dto.status && dto.status !== old.status ? `ORG_${dto.status}` : 'ORG_UPDATE', 'Organization', id,
      { name: old.name, status: old.status, monthlyPlanFee: old.monthlyPlanFee, storageChatId: old.storageChatId }, { name: org.name, status: org.status, monthlyPlanFee: org.monthlyPlanFee, storageChatId: org.storageChatId });
    return org;
  }

  /** Maktab ichi: super admin FAQAT ko'radi (guruhlar, xodimlar, o'quvchilar to'lovi jamlamasi, obuna). */
  async orgDetail(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: { type: true, directions: { include: { direction: true } } },
    });
    if (!org) throw new NotFoundException('Maktab topilmadi');
    const month = currentMonth();
    const [groups, staffMemberships, studentCount, pays, sub] = await Promise.all([
      this.prisma.group.findMany({
        where: { organizationId: id, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, monthlyFee: true, teacher: { select: { firstName: true, lastName: true, username: true } }, _count: { select: { members: true } } },
      }),
      this.prisma.organizationMembership.findMany({
        where: { organizationId: id, status: 'ACTIVE', role: { in: ['ADMIN', 'TEACHER'] }, user: { deletedAt: null } },
        orderBy: [{ role: 'asc' }, { requestedAt: 'asc' }],
        select: { role: true, user: { select: { id: true, firstName: true, lastName: true, username: true, telegramId: true, status: true, lastActiveAt: true } } },
      }),
      this.prisma.organizationMembership.count({ where: { organizationId: id, status: 'ACTIVE', role: 'STUDENT', user: { deletedAt: null } } }),
      this.prisma.payment.groupBy({ by: ['status'], where: { month, group: { organizationId: id, deletedAt: null } }, _count: true, _sum: { amount: true } }),
      this.prisma.orgPayment.findMany({ where: { organizationId: id }, orderBy: { month: 'desc' }, take: 12 }),
    ]);
    const staff = staffMemberships.map((membership) => ({ ...membership.user, role: membership.role }));
    const expected = groups.reduce((a, g) => a + (g.monthlyFee ?? 0) * g._count.members, 0);
    const paid = pays.find((p) => p.status === 'PAID');
    return {
      org: {
        id: org.id, name: org.name, status: org.status, note: org.note, monthlyPlanFee: org.monthlyPlanFee,
        storageChatId: org.storageChatId, lastBackupAt: org.lastBackupAt, lastBackupStatus: org.lastBackupStatus,
        createdAt: org.createdAt, typeId: org.typeId, type: org.type,
        directions: org.directions.map((row) => row.direction),
      },
      counts: { students: studentCount, teachers: staff.filter((u) => u.role === 'TEACHER').length, admins: staff.filter((u) => u.role === 'ADMIN').length, groups: groups.length },
      admins: staff.filter((u) => u.role === 'ADMIN').map((u) => ({ id: u.id, name: nameOf(u), username: u.username, telegramId: u.telegramId, status: u.status, lastActiveAt: u.lastActiveAt })),
      teachers: staff.filter((u) => u.role === 'TEACHER').map((u) => ({ id: u.id, name: nameOf(u), username: u.username, status: u.status })),
      groups: groups.map((g) => ({ id: g.id, name: g.name, fee: g.monthlyFee, members: g._count.members, teacher: g.teacher ? nameOf(g.teacher) : null })),
      studentPayments: { month, collected: paid?._sum.amount ?? 0, paidCount: paid?._count ?? 0, expected },
      subscription: {
        currentMonth: month,
        state: sub.find((p) => p.month === month)?.status ?? 'UNPAID',
        history: sub.map((p) => ({ month: p.month, state: p.status, amount: p.amount, paidAt: p.paidAt })),
      },
    };
  }

  /** Admin bir vaqtning o'zida faqat bitta tashkilotga biriktiriladi; boshqa membership rollari saqlanadi. */
  async moveAdmin(actor: CurrentUserPayload, userId: string, orgId: string) {
    const [user, org, current] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.organization.findUnique({ where: { id: orgId } }),
      this.prisma.organizationMembership.findFirst({ where: { userId, role: 'ADMIN', status: 'ACTIVE' } }),
    ]);
    if (!user || user.deletedAt || !current) throw new NotFoundException('Faol admin a’zoligi topilmadi');
    if (!org) throw new NotFoundException('Tashkilot topilmadi');
    if (current.organizationId === orgId) return { ok: true };
    await this.prisma.$transaction(async (tx) => {
      await tx.organizationMembership.update({ where: { id: current.id }, data: { role: 'TEACHER' } });
      await tx.organizationMembership.upsert({
        where: { userId_organizationId: { userId, organizationId: orgId } },
        create: { userId, organizationId: orgId, role: 'ADMIN', status: 'ACTIVE', decidedAt: new Date() },
        update: { role: 'ADMIN', status: 'ACTIVE', decidedAt: new Date() },
      });
      await tx.userActiveOrganization.upsert({ where: { userId }, create: { userId, organizationId: orgId }, update: { organizationId: orgId } });
      await tx.user.update({ where: { id: userId }, data: { organizationId: orgId, role: 'ADMIN' } });
    });
    await this.audit(actor, 'ADMIN_MOVE', 'User', userId, { organizationId: current.organizationId }, { organizationId: orgId });
    return { ok: true };
  }

  async assignAdmin(actor: CurrentUserPayload, orgId: string, dto: AssignAdminDto) {
    const [org, user, otherAdmin] = await Promise.all([
      this.prisma.organization.findUnique({ where: { id: orgId } }),
      this.prisma.user.findUnique({ where: { id: dto.userId } }),
      this.prisma.organizationMembership.findFirst({ where: { userId: dto.userId, role: 'ADMIN', status: 'ACTIVE', organizationId: { not: orgId } }, select: { organizationId: true } }),
    ]);
    if (!org) throw new NotFoundException('Tashkilot topilmadi');
    if (!user || user.deletedAt) throw new NotFoundException('Foydalanuvchi topilmadi');
    if (user.status === 'BLOCKED') throw new BadRequestException('Bloklangan foydalanuvchini admin qilib bo‘lmaydi');
    if (user.role === 'SUPER_ADMIN') throw new BadRequestException("Super adminni tashkilotga biriktirib bo'lmaydi");
    if (otherAdmin) throw new ConflictException("Administrator faqat bitta tashkilotga biriktirilishi mumkin");
    const membership = await this.prisma.organizationMembership.upsert({
      where: { userId_organizationId: { userId: user.id, organizationId: orgId } },
      create: { userId: user.id, organizationId: orgId, role: 'ADMIN', status: 'ACTIVE', decidedAt: new Date() },
      update: { role: 'ADMIN', status: 'ACTIVE', decidedAt: new Date() },
    });
    await this.prisma.adminProfile.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} });
    if (!user.organizationId) {
      await this.prisma.userActiveOrganization.upsert({ where: { userId: user.id }, create: { userId: user.id, organizationId: orgId }, update: { organizationId: orgId } });
      await this.prisma.user.update({ where: { id: user.id }, data: { organizationId: orgId, role: 'ADMIN' } });
    }
    await this.audit(actor, 'ADMIN_ASSIGN', 'OrganizationMembership', membership.id, null, { role: 'ADMIN', organizationId: orgId });
    return { id: user.id, name: nameOf(user) };
  }

  async removeAdmin(actor: CurrentUserPayload, orgId: string, userId: string) {
    const membership = await this.prisma.organizationMembership.findFirst({ where: { userId, organizationId: orgId, role: 'ADMIN', status: 'ACTIVE' } });
    if (!membership) throw new NotFoundException('Ushbu tashkilot admini topilmadi');
    await this.prisma.organizationMembership.update({ where: { id: membership.id }, data: { role: 'TEACHER' } });
    await this.prisma.user.updateMany({ where: { id: userId, organizationId: orgId }, data: { role: 'TEACHER' } });
    await this.audit(actor, 'ADMIN_REMOVE', 'OrganizationMembership', membership.id, { role: 'ADMIN' }, { role: 'TEACHER' });
    return { ok: true };
  }

  /** Admin qilish uchun nomzodlar: super admin va boshqa maktabga biriktirilgan xodimlar chiqmaydi */
  /** Admin nomzodlari: o'qituvchi boshqa tashkilotlarda ishlashi mumkin, ammo admin faqat bittasida bo'ladi. */
  async candidates(search?: string) {
    const q = search?.trim();
    const users = await this.prisma.user.findMany({
      where: {
        deletedAt: null, status: 'ACTIVE', role: { in: ['STUDENT', 'TEACHER', 'ADMIN'] },
        ...(q ? { OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { username: { contains: q, mode: 'insensitive' } },
        ] } : {}),
      },
      orderBy: [{ firstName: 'asc' }], take: 20,
      select: {
        id: true, firstName: true, lastName: true, username: true, role: true,
        organization: { select: { id: true, name: true } },
        memberships: {
          where: { status: 'ACTIVE' },
          select: { role: true, organization: { select: { id: true, name: true } } },
        },
      },
    });
    return users.map((u) => ({
      id: u.id, name: nameOf(u), username: u.username, role: u.role,
      organization: u.organization,
      memberships: u.memberships,
    }));
  }

  /* ───────── Barcha foydalanuvchilar ───────── */
  async allUsers(q: AllUsersQueryDto) {
    const take = 30;
    const page = Math.max(1, Number(q.page) || 1);
    const s = q.search?.trim();
    const where: any = {
      deletedAt: null,
      ...(q.role ? { role: q.role } : {}),
      ...(s ? { OR: [
        { firstName: { contains: s, mode: 'insensitive' } },
        { lastName: { contains: s, mode: 'insensitive' } },
        { username: { contains: s, mode: 'insensitive' } },
        ...(/^\d{5,}$/.test(s) ? [{ telegramId: s }] : []),
      ] } : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where, orderBy: [{ registeredAt: 'desc' }], skip: (page - 1) * take, take,
        select: { id: true, firstName: true, lastName: true, username: true, telegramId: true, role: true, status: true, lastActiveAt: true, organization: { select: { id: true, name: true } } },
      }),
    ]);
    return {
      total, page, pages: Math.max(1, Math.ceil(total / take)),
      items: rows.map((u) => ({ id: u.id, name: nameOf(u), username: u.username, telegramId: u.telegramId, role: u.role, status: u.status, lastActiveAt: u.lastActiveAt, organization: u.organization })),
    };
  }

  /** Foydalanuvchi rolini o'zgartirish (STUDENT / TEACHER / ADMIN). Super adminlar tegilmaydi. */
  async changeRole(actor: CurrentUserPayload, userId: string, dto: ChangeRoleDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw new NotFoundException('Foydalanuvchi topilmadi');
    if (user.role === 'SUPER_ADMIN' || user.id === actor.id || superAdminIds(this.cfg.get<string>('SUPER_ADMIN_TELEGRAM_IDS')).includes(user.telegramId)) {
      throw new BadRequestException("Super adminning rolini o'zgartirib bo'lmaydi");
    }
    const orgId = dto.organizationId ?? user.organizationId;
    if (!orgId) throw new BadRequestException('Tashkilotni tanlang');
    const org = await this.prisma.organization.findFirst({ where: { id: orgId, status: 'ACTIVE' }, select: { id: true } });
    if (!org) throw new NotFoundException('Tashkilot topilmadi yoki faol emas');
    if (dto.role === 'ADMIN') {
      const other = await this.prisma.organizationMembership.findFirst({
        where: { userId, status: 'ACTIVE', role: 'ADMIN', organizationId: { not: orgId } },
      });
      if (other) throw new ConflictException("Administrator faqat bitta tashkilotga biriktirilishi mumkin");
    }
    if (dto.role === 'STUDENT') await this.prisma.studentProfile.upsert({ where: { userId }, create: { userId }, update: {} });
    if (dto.role === 'TEACHER') await this.prisma.teacherProfile.upsert({ where: { userId }, create: { userId }, update: {} });
    if (dto.role === 'ADMIN') await this.prisma.adminProfile.upsert({ where: { userId }, create: { userId }, update: {} });
    const membership = await this.prisma.organizationMembership.upsert({
      where: { userId_organizationId: { userId, organizationId: orgId } },
      create: { userId, organizationId: orgId, role: dto.role, status: 'ACTIVE', decidedAt: new Date(), decidedById: actor.id },
      update: { role: dto.role, status: 'ACTIVE', decidedAt: new Date(), decidedById: actor.id },
    });
    if (!user.organizationId) {
      await this.prisma.userActiveOrganization.upsert({ where: { userId }, create: { userId, organizationId: orgId }, update: { organizationId: orgId } });
      await this.prisma.user.update({ where: { id: userId }, data: { organizationId: orgId, role: dto.role } });
    } else if (user.organizationId === orgId) {
      await this.prisma.user.update({ where: { id: userId }, data: { role: dto.role } });
    }
    await this.audit(actor, 'USER_ROLE_CHANGE', 'OrganizationMembership', membership.id, null, { role: dto.role, organizationId: orgId });
    return { ok: true };
  }

  /* ───────── Adminlar ───────── */
  async listAdmins() {
    const [superAdmins, adminMemberships] = await Promise.all([
      this.prisma.user.findMany({
        where: { role: 'SUPER_ADMIN', deletedAt: null }, orderBy: { registeredAt: 'asc' },
        select: { id: true, firstName: true, lastName: true, username: true, telegramId: true, role: true, status: true, lastActiveAt: true },
      }),
      this.prisma.organizationMembership.findMany({
        where: { role: 'ADMIN', status: 'ACTIVE', user: { deletedAt: null } },
        orderBy: { requestedAt: 'asc' },
        select: { organization: { select: { id: true, name: true } }, user: { select: { id: true, firstName: true, lastName: true, username: true, telegramId: true, status: true, lastActiveAt: true } } },
      }),
    ]);
    return [
      ...superAdmins.map((u) => ({ id: u.id, name: nameOf(u), username: u.username, telegramId: u.telegramId, role: 'SUPER_ADMIN', status: u.status, lastActiveAt: u.lastActiveAt, organization: null })),
      ...adminMemberships.map((m) => ({ id: m.user.id, name: nameOf(m.user), username: m.user.username, telegramId: m.user.telegramId, role: 'ADMIN', status: m.user.status, lastActiveAt: m.user.lastActiveAt, organization: m.organization })),
    ];
  }

  async setBlocked(actor: CurrentUserPayload, userId: string, blocked: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw new NotFoundException('Foydalanuvchi topilmadi');
    if (user.role === 'SUPER_ADMIN' || user.id === actor.id) throw new BadRequestException("Bu foydalanuvchini bloklab bo'lmaydi");
    await this.prisma.user.update({ where: { id: userId }, data: { status: blocked ? 'BLOCKED' : 'ACTIVE' } });
    await this.audit(actor, blocked ? 'USER_BLOCK' : 'USER_UNBLOCK', 'User', userId, { status: user.status }, { status: blocked ? 'BLOCKED' : 'ACTIVE' });
    return { ok: true };
  }

  /* ───────── AI nazorati ───────── */
  async ai() {
    const start = this.aiUsage.startOfToday();
    const week = new Date(start.getTime() - 6 * 86_400_000);
    const [perUser, perFeature, daily] = await Promise.all([
      this.prisma.aiUsage.groupBy({ by: ['userId'], where: { createdAt: { gte: start } }, _sum: { inputTokens: true, outputTokens: true }, _count: true }),
      this.prisma.aiUsage.groupBy({ by: ['feature'], where: { createdAt: { gte: week } }, _sum: { inputTokens: true, outputTokens: true }, _count: true }),
      this.prisma.aiUsage.findMany({ where: { createdAt: { gte: week } }, select: { createdAt: true, inputTokens: true, outputTokens: true } }),
    ]);
    const top = perUser
      .map((r) => ({ userId: r.userId, requests: r._count, tokens: (r._sum.inputTokens ?? 0) + (r._sum.outputTokens ?? 0) }))
      .sort((a, b) => b.tokens - a.tokens).slice(0, 15);
    const users = await this.prisma.user.findMany({ where: { id: { in: top.map((t) => t.userId).filter(Boolean) as string[] } }, select: { id: true, firstName: true, lastName: true, username: true, role: true } });
    const byDay = new Map<string, number>();
    const off = this.aiCfg.tzOffsetHours * 3_600_000;
    for (const r of daily) {
      const k = new Date(r.createdAt.getTime() + off).toISOString().slice(0, 10);
      byDay.set(k, (byDay.get(k) ?? 0) + r.inputTokens + r.outputTokens);
    }
    const days = Array.from({ length: 7 }, (_, i) => {
      const k = new Date(start.getTime() + off - (6 - i) * 86_400_000).toISOString().slice(0, 10);
      return { date: k, tokens: byDay.get(k) ?? 0 };
    });
    return {
      settings: this.aiSettings.current(),
      provider: {
        primary: this.aiCfg.primary,
        fallback: this.aiCfg.fallback,
        configured: this.aiService.status().configured,
        active: this.aiService.status().active,
        defaults: {
          anthropic: { fast: this.aiCfg.defaultModel('anthropic', 'fast'), smart: this.aiCfg.defaultModel('anthropic', 'smart') },
          groq: { fast: this.aiCfg.defaultModel('groq', 'fast'), smart: this.aiCfg.defaultModel('groq', 'smart') },
          gemini: { fast: this.aiCfg.defaultModel('gemini', 'fast'), smart: this.aiCfg.defaultModel('gemini', 'smart') },
        },
      },
      topToday: top.map((t) => {
        const u = users.find((x) => x.id === t.userId);
        return { ...t, name: u ? nameOf(u) : 'Tizim', role: u?.role ?? null };
      }),
      features: perFeature.map((f) => ({ feature: f.feature, requests: f._count, tokens: (f._sum.inputTokens ?? 0) + (f._sum.outputTokens ?? 0) })).sort((a, b) => b.tokens - a.tokens),
      days,
    };
  }

  async updateAi(actor: CurrentUserPayload, dto: UpdateAiDto) {
    const old = this.aiSettings.current();
    const limits: Record<string, number> = {};
    for (const r of LIMIT_ROLES) if (dto.limits?.[r] !== undefined) limits[r] = dto.limits[r]!;
    const next = await this.aiSettings.save({
      enabled: dto.enabled,
      limits,
      primary: dto.primary,
      fallback: dto.fallback,
      models: dto.models as any,
    });
    await this.audit(actor, 'AI_SETTINGS', 'AppSetting', 'ai', old, next);
    return next;
  }

  /* ───────── Audit ───────── */
  async auditLog(page = 1, action?: string) {
    const where = action ? { action } : {};
    const [total, rows, actions] = await Promise.all([
      this.prisma.adminActionLog.count({ where }),
      this.prisma.adminActionLog.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: (Math.max(1, page) - 1) * PAGE, take: PAGE,
        include: { actor: { select: { firstName: true, lastName: true, username: true, role: true } } },
      }),
      this.prisma.adminActionLog.groupBy({ by: ['action'], _count: true }),
    ]);
    return {
      total, page, pageSize: PAGE, pages: Math.max(1, Math.ceil(total / PAGE)),
      actions: actions.map((a) => a.action).sort(),
      items: rows.map((r) => ({
        id: r.id, action: r.action, targetType: r.targetType, targetId: r.targetId,
        oldValue: r.oldValue, newValue: r.newValue, createdAt: r.createdAt,
        actor: { name: nameOf(r.actor), role: r.actor.role },
      })),
    };
  }

  /* ───────── Tizim holati ───────── */
  async system() {
    const t0 = Date.now();
    let dbOk = true, dbBytes: number | null = null;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const r: any[] = await this.prisma.$queryRaw`SELECT pg_database_size(current_database())::bigint AS size`;
      dbBytes = r?.[0]?.size !== undefined ? Number(r[0].size) : null;
    } catch { dbOk = false; }
    const dbMs = Date.now() - t0;

    const [gradingRunning, gradingOverdue, failedSubs, reviewSubs, orphanFiles] = await Promise.all([
      this.prisma.teacherAssignment.count({ where: { gradingStatus: 'RUNNING' } }),
      this.prisma.teacherAssignment.count({ where: { category: 'HOMEWORK', status: 'PUBLISHED', deletedAt: null, gradingStatus: 'PENDING', dueAt: { lte: new Date() } } }),
      this.prisma.assignmentSubmission.count({ where: { status: 'FAILED' } }),
      this.prisma.assignmentSubmission.count({ where: { status: 'NEEDS_REVIEW' } }),
      this.prisma.materialFile.count({ where: { assignmentId: null, submissionId: null } }),
    ]).catch(() => [0, 0, 0, 0, 0]);

    const has = (k: string) => !!this.cfg.get<string>(k);
    const mem = process.memoryUsage();
    return {
      server: { uptimeSec: Math.round(process.uptime()), node: process.version, rssMb: Math.round(mem.rss / 1048576), heapMb: Math.round(mem.heapUsed / 1048576), env: process.env.NODE_ENV ?? 'development' },
      db: { ok: dbOk, latencyMs: dbMs, sizeBytes: dbBytes },
      config: {
        botToken: has('BOT_TOKEN'), jwtSecret: has('JWT_SECRET'), webappUrl: has('WEBAPP_URL'),
        telegramStorage: has('TELEGRAM_STORAGE_CHAT_ID'),
        groqKey: has('GROQ_API_KEY'), anthropicKey: has('ANTHROPIC_API_KEY'), geminiKey: has('GEMINI_API_KEY'),
        superAdminIds: superAdminIds(this.cfg.get<string>('SUPER_ADMIN_TELEGRAM_IDS')).length,
      },
      queue: { gradingRunning, gradingOverdue, failedSubmissions: failedSubs, needsReview: reviewSubs, orphanFiles },
    };
  }
}
