import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { resolveOrgId } from '../../common/org-scope';
import { PrismaService } from '../../prisma/prisma.service';

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const nameOf = (u: { firstName: string; lastName: string | null }) => [u.firstName, u.lastName].filter(Boolean).join(' ');
const SLOT_INC = { assignment: { select: { id: true, groupId: true, teacherId: true, group: { select: { name: true } }, subject: { select: { name: true } }, teacher: { select: { firstName: true, lastName: true } } } } } as const;

@Injectable()
export class TeachingService {
  constructor(private readonly prisma: PrismaService) {}

  /* ───────── Fanlar ───────── */
  async listSubjects(actor: CurrentUserPayload, orgId?: string) {
    return this.prisma.schoolSubject.findMany({ where: { organizationId: resolveOrgId(actor, orgId) }, orderBy: { name: 'asc' }, select: { id: true, name: true } });
  }
  async createSubject(actor: CurrentUserPayload, name: string, orgId?: string) {
    const organizationId = resolveOrgId(actor, orgId);
    const n = name.trim();
    if (n.length < 2) throw new BadRequestException('Fan nomi juda qisqa');
    try {
      return await this.prisma.schoolSubject.create({ data: { organizationId, name: n }, select: { id: true, name: true } });
    } catch (e: any) {
      if (e?.code === 'P2002') throw new ConflictException('Bunday fan allaqachon bor');
      throw e;
    }
  }
  async removeSubject(actor: CurrentUserPayload, id: string) {
    const s = await this.prisma.schoolSubject.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('Fan topilmadi');
    resolveOrgId(actor, s.organizationId);
    await this.prisma.schoolSubject.delete({ where: { id } });
    return { ok: true };
  }

  /* ───────── Tayinlash (o'qituvchi + fan + sinf) ───────── */
  async assign(actor: CurrentUserPayload, dto: { teacherId: string; subjectId: string; groupId: string }, orgId?: string) {
    const organizationId = resolveOrgId(actor, orgId);
    const [teacher, subject, group] = await Promise.all([
      this.prisma.organizationMembership.findFirst({ where: { userId: dto.teacherId, role: 'TEACHER', organizationId, status: 'ACTIVE', user: { status: 'ACTIVE', deletedAt: null } }, select: { user: { select: { id: true } } } }),
      this.prisma.schoolSubject.findFirst({ where: { id: dto.subjectId, organizationId }, select: { id: true } }),
      this.prisma.group.findFirst({ where: { id: dto.groupId, organizationId, deletedAt: null }, select: { id: true } }),
    ]);
    if (!teacher?.user) throw new NotFoundException("O'qituvchi bu tashkilotda faol emas");
    if (!subject) throw new NotFoundException('Fan topilmadi');
    if (!group) throw new NotFoundException('Sinf (guruh) topilmadi');
    try {
      return await this.prisma.teachingAssignment.create({ data: { organizationId, teacherId: teacher.user.id, subjectId: subject.id, groupId: group.id }, select: { id: true } });
    } catch (e: any) {
      if (e?.code === 'P2002') throw new ConflictException("Bu sinfda bu fanga o'qituvchi allaqachon tayinlangan");
      throw e;
    }
  }
  async unassign(actor: CurrentUserPayload, id: string) {
    const a = await this.prisma.teachingAssignment.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('Tayinlash topilmadi');
    resolveOrgId(actor, a.organizationId);
    await this.prisma.teachingAssignment.delete({ where: { id } });
    return { ok: true };
  }
  async listAssignments(actor: CurrentUserPayload, q: { organizationId?: string; teacherId?: string; groupId?: string }) {
    const organizationId = resolveOrgId(actor, q.organizationId);
    const rows = await this.prisma.teachingAssignment.findMany({
      where: { organizationId, ...(q.teacherId ? { teacherId: q.teacherId } : {}), ...(q.groupId ? { groupId: q.groupId } : {}) },
      orderBy: { createdAt: 'desc' },
      select: { id: true, teacher: { select: { id: true, firstName: true, lastName: true } }, subject: { select: { id: true, name: true } }, group: { select: { id: true, name: true } }, _count: { select: { slots: true } } },
    });
    return rows.map((a) => ({ id: a.id, teacher: { id: a.teacher.id, name: nameOf(a.teacher) }, subject: a.subject, group: a.group, slots: a._count.slots }));
  }

  /* ───────── Dars jadvali ───────── */
  async addSlot(actor: CurrentUserPayload, assignmentId: string, dto: { weekday: number; startTime: string; endTime: string; room?: string; startsOn?: string; endsOn?: string }) {
    const a = await this.prisma.teachingAssignment.findUnique({ where: { id: assignmentId }, select: { id: true, organizationId: true, groupId: true, teacherId: true } });
    if (!a) throw new NotFoundException('Tayinlash topilmadi');
    resolveOrgId(actor, a.organizationId);
    const start = toMin(dto.startTime), end = toMin(dto.endTime);
    if (end <= start) throw new BadRequestException("Tugash vaqti boshlanishidan keyin bo'lsin");
    const room = dto.room?.trim() || null;
    const startsOn = dto.startsOn ? new Date(dto.startsOn + 'T00:00:00.000Z') : null;
    const endsOn = dto.endsOn ? new Date(dto.endsOn + 'T00:00:00.000Z') : null;
    if ((dto.startsOn && (!startsOn || Number.isNaN(startsOn.getTime()) || startsOn.toISOString().slice(0,10) !== dto.startsOn)) || (dto.endsOn && (!endsOn || Number.isNaN(endsOn.getTime()) || endsOn.toISOString().slice(0,10) !== dto.endsOn)) || (startsOn && endsOn && endsOn < startsOn)) throw new BadRequestException('Jadval amal qilish sanalari noto‘g‘ri');
    const sameDay = await this.prisma.scheduleSlot.findMany({ where: { organizationId: a.organizationId, weekday: dto.weekday }, include: { assignment: { select: { groupId: true, teacherId: true } } } });
    for (const s of sameDay) {
      if (!(start < toMin(s.endTime) && toMin(s.startTime) < end)) continue;
      const newFrom = startsOn?.getTime() ?? Number.NEGATIVE_INFINITY;
      const newTo = endsOn?.getTime() ?? Number.POSITIVE_INFINITY;
      const oldFrom = s.startsOn?.getTime() ?? Number.NEGATIVE_INFINITY;
      const oldTo = s.endsOn?.getTime() ?? Number.POSITIVE_INFINITY;
      if (!(newFrom <= oldTo && oldFrom <= newTo)) continue;
      if (s.assignment.teacherId === a.teacherId) throw new ConflictException(`O'qituvchi shu vaqtda band (${s.startTime}–${s.endTime})`);
      if (s.assignment.groupId === a.groupId) throw new ConflictException(`Sinfda shu vaqtda boshqa dars bor (${s.startTime}–${s.endTime})`);
      if (room && s.room && s.room.toLowerCase() === room.toLowerCase()) throw new ConflictException(`Xona shu vaqtda band (${s.startTime}–${s.endTime})`);
    }
    return this.prisma.scheduleSlot.create({ data: { organizationId: a.organizationId, assignmentId, weekday: dto.weekday, startTime: dto.startTime, endTime: dto.endTime, room, startsOn, endsOn }, select: { id: true } });
  }
  async removeSlot(actor: CurrentUserPayload, id: string) {
    const s = await this.prisma.scheduleSlot.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('Dars topilmadi');
    resolveOrgId(actor, s.organizationId);
    await this.prisma.scheduleSlot.delete({ where: { id } });
    return { ok: true };
  }

  private overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
    return aStart < bEnd && bStart < aEnd;
  }

  private async assertSessionParticipants(organizationId: string, teacherId: string, studentId?: string, groupId?: string) {
    const teacher = await this.prisma.organizationMembership.findFirst({
      where: { organizationId, userId: teacherId, role: 'TEACHER', status: 'ACTIVE', user: { status: 'ACTIVE', deletedAt: null } },
      select: { id: true },
    });
    if (!teacher) throw new BadRequestException("O'qituvchi tashkilotga faol biriktirilmagan");
    if (studentId) {
      const student = await this.prisma.organizationMembership.findFirst({
        where: { organizationId, userId: studentId, role: 'STUDENT', status: 'ACTIVE', user: { status: 'ACTIVE', deletedAt: null } },
        select: { id: true },
      });
      if (!student) throw new BadRequestException("O'quvchi tashkilotga faol biriktirilmagan");
    }
    if (groupId) {
      const group = await this.prisma.group.findFirst({ where: { id: groupId, organizationId, deletedAt: null }, select: { id: true } });
      if (!group) throw new NotFoundException('Guruh ushbu tashkilotda topilmadi');
    }
  }

  /** Bir martalik yoki individual dars: vaqtlar UTC ISO formatida yuboriladi. */
  async createSession(actor: CurrentUserPayload, dto: { organizationId?: string; title: string; sessionType?: string; teacherId: string; studentId?: string; groupId?: string; startsAt: string; endsAt: string; room?: string; notes?: string }) {
    const organizationId = resolveOrgId(actor, dto.organizationId);
    const startsAt = new Date(dto.startsAt), endsAt = new Date(dto.endsAt);
    if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime()) || endsAt <= startsAt) {
      throw new BadRequestException("Mashg'ulot vaqti noto'g'ri: tugash vaqti boshlanishdan keyin bo'lishi kerak");
    }
    if (!dto.studentId && !dto.groupId) throw new BadRequestException("Individual dars uchun o'quvchi yoki guruh ko'rsatilishi kerak");
    await this.assertSessionParticipants(organizationId, dto.teacherId, dto.studentId, dto.groupId);
    const localStart = new Date(startsAt.getTime() + 5 * 60 * 60 * 1000);
    const localEnd = new Date(endsAt.getTime() + 5 * 60 * 60 * 1000);
    const localDate = new Date(Date.UTC(localStart.getUTCFullYear(), localStart.getUTCMonth(), localStart.getUTCDate()));
    const weekday = ((localStart.getUTCDay() + 6) % 7) + 1;
    const recurring = await this.prisma.scheduleSlot.findMany({
      where: { organizationId, weekday, OR: [{ startsOn: null }, { startsOn: { lte: localDate } }], AND: [{ OR: [{ endsOn: null }, { endsOn: { gte: localDate } }] }] },
      include: { assignment: { select: { teacherId: true, groupId: true } } },
    });
    const startMinute = localStart.getUTCHours() * 60 + localStart.getUTCMinutes();
    const endMinute = localEnd.getUTCHours() * 60 + localEnd.getUTCMinutes();
    if (recurring.some((slot: any) => startMinute < toMin(slot.endTime) && toMin(slot.startTime) < endMinute &&
      (slot.assignment.teacherId === dto.teacherId || (dto.groupId && slot.assignment.groupId === dto.groupId) || (!!dto.room && !!slot.room && slot.room.toLowerCase() === dto.room.toLowerCase())))) {
      throw new ConflictException('Tanlangan vaqtda haftalik jadval bo‘yicha o‘qituvchi, guruh yoki xona band');
    }
    const clash = await this.prisma.scheduleSession.findFirst({
      where: { organizationId, status: 'SCHEDULED', startsAt: { lt: endsAt }, endsAt: { gt: startsAt },
        OR: [{ teacherId: dto.teacherId }, ...(dto.studentId ? [{ studentId: dto.studentId }] : []), ...(dto.groupId ? [{ groupId: dto.groupId }] : []), ...(dto.room ? [{ room: dto.room }] : [])] },
      select: { id: true, title: true, startsAt: true, endsAt: true },
    });
    if (clash) throw new ConflictException("O'qituvchi, o'quvchi yoki guruh shu vaqtda band");
    return this.prisma.scheduleSession.create({
      data: { organizationId, title: dto.title.trim(), sessionType: dto.sessionType ?? 'INDIVIDUAL', teacherId: dto.teacherId, studentId: dto.studentId ?? null, groupId: dto.groupId ?? null, startsAt, endsAt, room: dto.room?.trim() || null, notes: dto.notes?.trim() || null, createdById: actor.id },
    });
  }

  async listSessions(actor: CurrentUserPayload, q: { organizationId?: string; from?: string; to?: string; teacherId?: string; groupId?: string }) {
    const organizationId = resolveOrgId(actor, q.organizationId);
    const from = q.from ? new Date(q.from) : new Date(Date.now() - 7 * 86400000);
    const to = q.to ? new Date(q.to) : new Date(Date.now() + 30 * 86400000);
    if (!Number.isFinite(from.getTime()) || !Number.isFinite(to.getTime()) || to <= from) throw new BadRequestException('Sana oralig‘i noto‘g‘ri');
    return this.prisma.scheduleSession.findMany({
      where: { organizationId, startsAt: { lt: to }, endsAt: { gt: from }, ...(q.teacherId ? { teacherId: q.teacherId } : {}), ...(q.groupId ? { groupId: q.groupId } : {}) },
      orderBy: { startsAt: 'asc' },
    });
  }

  async mineSessions(user: CurrentUserPayload) {
    const organizationId = user.activeOrganizationId ?? user.organizationId;
    if (!organizationId) return [];
    if (user.role === 'TEACHER') {
      return this.prisma.scheduleSession.findMany({ where: { organizationId, teacherId: user.id, status: 'SCHEDULED' }, orderBy: { startsAt: 'asc' } });
    }
    if (user.role === 'STUDENT') {
      return this.prisma.scheduleSession.findMany({
        where: { organizationId, status: 'SCHEDULED', OR: [{ studentId: user.id }, { group: { members: { some: { studentId: user.id } } } }] },
        orderBy: { startsAt: 'asc' },
      });
    }
    throw new ForbiddenException("Bu jadval faqat o'qituvchi va o'quvchilar uchun");
  }

  async cancelSession(actor: CurrentUserPayload, id: string) {
    const session = await this.prisma.scheduleSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException("Mashg'ulot topilmadi");
    resolveOrgId(actor, session.organizationId);
    return this.prisma.scheduleSession.update({ where: { id }, data: { status: 'CANCELLED' } });
  }

  private shape(rows: any[]) {
    return rows.map((s) => ({ id: s.id, weekday: s.weekday, startTime: s.startTime, endTime: s.endTime, room: s.room, subject: s.assignment.subject.name, group: { id: s.assignment.groupId, name: s.assignment.group.name }, teacher: { id: s.assignment.teacherId, name: nameOf(s.assignment.teacher) } }));
  }
  private order = [{ weekday: 'asc' as const }, { startTime: 'asc' as const }];

  private scheduleDate(value?: string) {
    const iso = value ?? new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
    if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(iso)) throw new BadRequestException('Jadval sanasi YYYY-MM-DD formatida bo‘lsin');
    const date = new Date(iso + 'T00:00:00.000Z');
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso) throw new BadRequestException('Jadval sanasi noto‘g‘ri');
    return date;
  }

  /** Admin: butun maktab yoki bitta sinf/o'qituvchi jadvali */
  async timetable(actor: CurrentUserPayload, q: { organizationId?: string; teacherId?: string; groupId?: string; date?: string }) {
    const organizationId = resolveOrgId(actor, q.organizationId);
    const date = this.scheduleDate(q.date);
    const rows = await this.prisma.scheduleSlot.findMany({
      where: { organizationId, AND: [{ OR: [{ startsOn: null }, { startsOn: { lte: date } }] }, { OR: [{ endsOn: null }, { endsOn: { gte: date } }] }], assignment: { ...(q.teacherId ? { teacherId: q.teacherId } : {}), ...(q.groupId ? { groupId: q.groupId } : {}) } },
      orderBy: this.order, include: SLOT_INC,
    });
    return this.shape(rows);
  }

  /** O'qituvchi — o'z darslari; o'quvchi — a'zo bo'lgan sinflari darslari */
  async mine(user: CurrentUserPayload) {
    const organizationId = user.activeOrganizationId ?? user.organizationId;
    if (!organizationId) return [];
    const date = this.scheduleDate();
    let where: any;
    if (user.role === 'TEACHER') where = { organizationId, AND: [{ OR: [{ startsOn: null }, { startsOn: { lte: date } }] }, { OR: [{ endsOn: null }, { endsOn: { gte: date } }] }], assignment: { teacherId: user.id } };
    else if (user.role === 'STUDENT') where = { organizationId, AND: [{ OR: [{ startsOn: null }, { startsOn: { lte: date } }] }, { OR: [{ endsOn: null }, { endsOn: { gte: date } }] }], assignment: { group: { members: { some: { studentId: user.id } } } } };
    else throw new ForbiddenException("Bu jadval o'qituvchi va o'quvchilar uchun");
    return this.shape(await this.prisma.scheduleSlot.findMany({ where, orderBy: this.order, include: SLOT_INC }));
  }
}
