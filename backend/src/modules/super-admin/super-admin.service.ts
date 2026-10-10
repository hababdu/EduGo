import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { superAdminIds } from '../../common/super-admin.util';
import { PrismaService } from '../../prisma/prisma.service';
import { AiConfig } from '../ai/ai.config';
import { AiSettingsService, LIMIT_ROLES } from '../ai/ai-settings.service';
import { AiUsageService } from '../ai/ai-usage.service';
import { AssignAdminDto, CreateOrgDto, UpdateAiDto, UpdateOrgDto } from './dto/super-admin.dto';

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
  ) {}

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
      include: { _count: { select: { users: true, groups: true } } },
    });
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN', deletedAt: null, organizationId: { in: orgs.map((o) => o.id) } },
      select: { id: true, firstName: true, lastName: true, username: true, telegramId: true, organizationId: true },
    });
    return orgs.map((o) => ({
      id: o.id, name: o.name, status: o.status, note: o.note, createdAt: o.createdAt,
      users: o._count.users, groups: o._count.groups,
      admins: admins.filter((a) => a.organizationId === o.id).map((a) => ({ id: a.id, name: nameOf(a), username: a.username, telegramId: a.telegramId })),
    }));
  }

  async createOrg(actor: CurrentUserPayload, dto: CreateOrgDto) {
    const name = dto.name.trim();
    const exists = await this.prisma.organization.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
    if (exists) throw new ConflictException('Bunday nomli maktab allaqachon bor');
    const org = await this.prisma.organization.create({ data: { name, note: dto.note?.trim() || null } });
    await this.audit(actor, 'ORG_CREATE', 'Organization', org.id, null, { name });
    return org;
  }

  async updateOrg(actor: CurrentUserPayload, id: string, dto: UpdateOrgDto) {
    const old = await this.prisma.organization.findUnique({ where: { id } });
    if (!old) throw new NotFoundException('Maktab topilmadi');
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.note !== undefined) data.note = dto.note.trim() || null;
    if (dto.status !== undefined) data.status = dto.status;
    const org = await this.prisma.organization.update({ where: { id }, data });
    await this.audit(actor, dto.status && dto.status !== old.status ? `ORG_${dto.status}` : 'ORG_UPDATE', 'Organization', id,
      { name: old.name, status: old.status }, { name: org.name, status: org.status });
    return org;
  }

  async assignAdmin(actor: CurrentUserPayload, orgId: string, dto: AssignAdminDto) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Maktab topilmadi');
    const user = await this.prisma.user.findUnique({ where: { telegramId: dto.telegramId } });
    if (!user || user.deletedAt) throw new NotFoundException("Bunday Telegram ID li foydalanuvchi topilmadi. U avval ilovaga kirishi kerak.");
    if (user.role === 'SUPER_ADMIN') throw new BadRequestException("Super adminni maktabga biriktirib bo'lmaydi");
    if (user.organizationId && user.organizationId !== orgId && user.role !== 'STUDENT') {
      throw new ConflictException("Bu foydalanuvchi boshqa maktabga biriktirilgan");
    }
    const updated = await this.prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN', organizationId: orgId } });
    await this.audit(actor, 'ADMIN_ASSIGN', 'User', user.id, { role: user.role, organizationId: user.organizationId }, { role: 'ADMIN', organizationId: orgId });
    return { id: updated.id, name: nameOf(updated) };
  }

  async removeAdmin(actor: CurrentUserPayload, orgId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.organizationId !== orgId || user.role !== 'ADMIN') throw new NotFoundException('Admin topilmadi');
    await this.prisma.user.update({ where: { id: userId }, data: { role: 'TEACHER' } });
    await this.audit(actor, 'ADMIN_REMOVE', 'User', userId, { role: 'ADMIN' }, { role: 'TEACHER' });
    return { ok: true };
  }

  /* ───────── Adminlar ───────── */
  async listAdmins() {
    const list = await this.prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, deletedAt: null },
      orderBy: { registeredAt: 'asc' },
      select: { id: true, firstName: true, lastName: true, username: true, telegramId: true, role: true, status: true, lastActiveAt: true, organization: { select: { id: true, name: true } } },
    });
    return list.map((u) => ({ id: u.id, name: nameOf(u), username: u.username, telegramId: u.telegramId, role: u.role, status: u.status, lastActiveAt: u.lastActiveAt, organization: u.organization }));
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
      provider: { primary: this.aiCfg.primary, fallback: this.aiCfg.fallback },
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
    const next = await this.aiSettings.save({ enabled: dto.enabled, limits });
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
