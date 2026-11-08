import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { isSuperAdmin, resolveOrgId } from '../../common/org-scope';
import { PrismaService } from '../../prisma/prisma.service';
import { MembershipsService } from '../memberships/memberships.service';

const OPEN = ['REQUESTED', 'APPROVED'] as const;
const MAX_OPEN = 3;
const PAGE = 30;
const nameOf = (u: { firstName: string; lastName: string | null }) => [u.firstName, u.lastName].filter(Boolean).join(' ');

@Injectable()
export class TrialsService {
  constructor(private readonly prisma: PrismaService, private readonly memberships: MembershipsService) {}

  /** O'quvchi o'zi uchun, ota-ona esa bog'langan farzandi uchun yozadi. */
  async request(user: CurrentUserPayload, dto: { organizationId: string; groupId?: string; studentId?: string; preferredAt?: Date; note?: string }) {
    if (user.status === 'BLOCKED') throw new ForbiddenException('Hisobingiz bloklangan');
    let studentId = user.id;
    if (user.role === 'PARENT') {
      if (!dto.studentId) throw new BadRequestException('Farzandni tanlang');
      const link = await this.prisma.parentLink.findUnique({ where: { parentId_studentId: { parentId: user.id, studentId: dto.studentId } }, select: { id: true } });
      if (!link) throw new ForbiddenException("Bu farzand sizga bog'lanmagan");
      studentId = dto.studentId;
    } else if (user.role !== 'STUDENT') {
      throw new ForbiddenException("Sinov darsiga faqat o'quvchi yoki ota-ona yozila oladi");
    }
    if (dto.preferredAt && dto.preferredAt.getTime() < Date.now() - 60_000) throw new BadRequestException("Sana o'tmishda bo'lmasin");

    const student = await this.prisma.user.findFirst({ where: { id: studentId, deletedAt: null }, select: { id: true, organizationId: true } });
    if (!student) throw new NotFoundException("O'quvchi topilmadi");
    const activeMembership = await this.prisma.organizationMembership.findFirst({
      where: { userId: studentId, organizationId: dto.organizationId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (student.organizationId === dto.organizationId || activeMembership) {
      throw new ConflictException("O'quvchi allaqachon shu maktab a'zosi");
    }
    const org = await this.prisma.organization.findFirst({ where: { id: dto.organizationId, status: 'ACTIVE' }, select: { id: true } });
    if (!org) throw new NotFoundException('Maktab topilmadi yoki faol emas');
    if (dto.groupId) {
      const g = await this.prisma.group.findFirst({ where: { id: dto.groupId, organizationId: org.id, deletedAt: null }, select: { id: true } });
      if (!g) throw new NotFoundException('Guruh topilmadi');
    }
    const open = await this.prisma.trialLesson.findMany({ where: { studentId, status: { in: [...OPEN] } }, select: { organizationId: true } });
    if (open.some((t) => t.organizationId === org.id)) throw new ConflictException("Bu maktabga faol so'rovingiz bor");
    if (open.length >= MAX_OPEN) throw new BadRequestException(`Bir vaqtda ko'pi bilan ${MAX_OPEN} ta sinov darsiga yozilish mumkin`);

    const t = await this.prisma.trialLesson.create({
      data: { organizationId: org.id, groupId: dto.groupId ?? null, studentId, requestedById: user.id, preferredAt: dto.preferredAt ?? null, note: dto.note?.trim() || null },
      select: { id: true, status: true },
    });
    return t;
  }

  async mine(user: CurrentUserPayload) {
    const ids = user.role === 'PARENT'
      ? (await this.prisma.parentLink.findMany({ where: { parentId: user.id }, select: { studentId: true } })).map((l) => l.studentId)
      : [user.id];
    const rows = await this.prisma.trialLesson.findMany({
      where: { studentId: { in: ids } }, orderBy: { createdAt: 'desc' }, take: 50,
      select: { id: true, status: true, preferredAt: true, scheduledAt: true, decisionNote: true, createdAt: true, organization: { select: { id: true, name: true } }, group: { select: { name: true } }, student: { select: { id: true, firstName: true, lastName: true } } },
    });
    return rows.map((r) => ({ ...r, student: { id: r.student.id, name: nameOf(r.student) } }));
  }

  async cancel(user: CurrentUserPayload, id: string) {
    const t = await this.prisma.trialLesson.findUnique({ where: { id } });
    if (!t || t.requestedById !== user.id) throw new NotFoundException("So'rov topilmadi");
    if (!(OPEN as readonly string[]).includes(t.status)) throw new BadRequestException("Bu so'rovni bekor qilib bo'lmaydi");
    await this.prisma.trialLesson.update({ where: { id }, data: { status: 'CANCELLED' } });
    return { ok: true };
  }

  /* ───────── Admin ───────── */
  async list(actor: CurrentUserPayload, q: { organizationId?: string; status?: string; page?: string }) {
    const organizationId = resolveOrgId(actor, q.organizationId);
    const where: any = { organizationId, ...(q.status ? { status: q.status } : {}) };
    const page = Math.max(1, Number(q.page) || 1);
    const [total, rows] = await Promise.all([
      this.prisma.trialLesson.count({ where }),
      this.prisma.trialLesson.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * PAGE, take: PAGE,
        select: { id: true, status: true, preferredAt: true, scheduledAt: true, note: true, decisionNote: true, createdAt: true, group: { select: { id: true, name: true } }, student: { select: { id: true, firstName: true, lastName: true, username: true } }, requestedBy: { select: { role: true } } },
      }),
    ]);
    return { total, page, pages: Math.max(1, Math.ceil(total / PAGE)), items: rows.map((r) => ({ ...r, student: { id: r.student.id, name: nameOf(r.student), username: r.student.username }, requestedByParent: r.requestedBy.role === 'PARENT', requestedBy: undefined })) };
  }

  private async load(actor: CurrentUserPayload, id: string) {
    const t = await this.prisma.trialLesson.findUnique({ where: { id } });
    if (!t) throw new NotFoundException("So'rov topilmadi");
    if (!isSuperAdmin(actor) && t.organizationId !== actor.organizationId) throw new ForbiddenException('Bu boshqa maktab');
    return t;
  }

  private async move(actor: CurrentUserPayload, id: string, from: string[], data: Record<string, unknown>) {
    const t = await this.load(actor, id);
    if (!from.includes(t.status)) throw new BadRequestException(`Bu holatdan o'tib bo'lmaydi (${t.status})`);
    await this.prisma.trialLesson.update({ where: { id }, data: { ...data, decidedById: actor.id, decidedAt: new Date() } });
    return { ok: true };
  }

  async approve(actor: CurrentUserPayload, id: string, scheduledAt: Date, note?: string) {
    if (scheduledAt.getTime() < Date.now() - 60_000) throw new BadRequestException("Sana o'tmishda bo'lmasin");
    return this.move(actor, id, ['REQUESTED'], { status: 'APPROVED', scheduledAt, decisionNote: note?.trim() || null });
  }
  decline(actor: CurrentUserPayload, id: string, note?: string) { return this.move(actor, id, ['REQUESTED', 'APPROVED'], { status: 'DECLINED', decisionNote: note?.trim() || null }); }
  attended(actor: CurrentUserPayload, id: string) { return this.move(actor, id, ['APPROVED'], { status: 'ATTENDED' }); }
  noShow(actor: CurrentUserPayload, id: string) { return this.move(actor, id, ['APPROVED'], { status: 'NO_SHOW' }); }

  /** Qabul: o'quvchi maktab a'zosi bo'ladi (STUDENT) va ixtiyoriy guruhga qo'shiladi (sig'im tekshiriladi). */
  async admit(actor: CurrentUserPayload, id: string, groupId?: string) {
    const t = await this.load(actor, id);
    if (t.status !== 'ATTENDED') throw new BadRequestException("Qabul faqat sinov darsida qatnashgan o'quvchiga");
    const gid = groupId ?? t.groupId ?? undefined;
    if (gid) {
      const g = await this.prisma.group.findFirst({ where: { id: gid, organizationId: t.organizationId, deletedAt: null }, select: { id: true, maxCapacity: true } });
      if (!g) throw new NotFoundException('Guruh topilmadi');
      if (g.maxCapacity != null) {
        const count = await this.prisma.groupMember.count({ where: { groupId: g.id } });
        if (count >= g.maxCapacity) throw new ConflictException("Guruh to'lgan");
      }
    }
    await this.memberships.attach(actor, t.studentId, 'STUDENT', t.organizationId);
    if (gid) await this.prisma.groupMember.upsert({ where: { groupId_studentId: { groupId: gid, studentId: t.studentId } }, create: { groupId: gid, studentId: t.studentId }, update: {} });
    await this.prisma.trialLesson.update({ where: { id }, data: { status: 'ADMITTED', groupId: gid ?? null, decidedById: actor.id, decidedAt: new Date() } });
    return { ok: true };
  }
}
