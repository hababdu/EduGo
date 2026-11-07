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
      this.prisma.user.findFirst({ where: { id: dto.teacherId, role: 'TEACHER', organizationId, status: 'ACTIVE', deletedAt: null }, select: { id: true } }),
      this.prisma.schoolSubject.findFirst({ where: { id: dto.subjectId, organizationId }, select: { id: true } }),
      this.prisma.group.findFirst({ where: { id: dto.groupId, organizationId, deletedAt: null }, select: { id: true } }),
    ]);
    if (!teacher) throw new NotFoundException("O'qituvchi bu maktabda topilmadi");
    if (!subject) throw new NotFoundException('Fan topilmadi');
    if (!group) throw new NotFoundException('Sinf (guruh) topilmadi');
    try {
      return await this.prisma.teachingAssignment.create({ data: { organizationId, teacherId: teacher.id, subjectId: subject.id, groupId: group.id }, select: { id: true } });
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
  async addSlot(actor: CurrentUserPayload, assignmentId: string, dto: { weekday: number; startTime: string; endTime: string; room?: string }) {
    const a = await this.prisma.teachingAssignment.findUnique({ where: { id: assignmentId }, select: { id: true, organizationId: true, groupId: true, teacherId: true } });
    if (!a) throw new NotFoundException('Tayinlash topilmadi');
    resolveOrgId(actor, a.organizationId);
    const start = toMin(dto.startTime), end = toMin(dto.endTime);
    if (end <= start) throw new BadRequestException("Tugash vaqti boshlanishidan keyin bo'lsin");
    const room = dto.room?.trim() || null;
    const sameDay = await this.prisma.scheduleSlot.findMany({ where: { organizationId: a.organizationId, weekday: dto.weekday }, include: { assignment: { select: { groupId: true, teacherId: true } } } });
    for (const s of sameDay) {
      if (!(start < toMin(s.endTime) && toMin(s.startTime) < end)) continue;
      if (s.assignment.teacherId === a.teacherId) throw new ConflictException(`O'qituvchi shu vaqtda band (${s.startTime}–${s.endTime})`);
      if (s.assignment.groupId === a.groupId) throw new ConflictException(`Sinfda shu vaqtda boshqa dars bor (${s.startTime}–${s.endTime})`);
      if (room && s.room && s.room.toLowerCase() === room.toLowerCase()) throw new ConflictException(`Xona shu vaqtda band (${s.startTime}–${s.endTime})`);
    }
    return this.prisma.scheduleSlot.create({ data: { organizationId: a.organizationId, assignmentId, weekday: dto.weekday, startTime: dto.startTime, endTime: dto.endTime, room }, select: { id: true } });
  }
  async removeSlot(actor: CurrentUserPayload, id: string) {
    const s = await this.prisma.scheduleSlot.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('Dars topilmadi');
    resolveOrgId(actor, s.organizationId);
    await this.prisma.scheduleSlot.delete({ where: { id } });
    return { ok: true };
  }

  private shape(rows: any[]) {
    return rows.map((s) => ({ id: s.id, weekday: s.weekday, startTime: s.startTime, endTime: s.endTime, room: s.room, subject: s.assignment.subject.name, group: { id: s.assignment.groupId, name: s.assignment.group.name }, teacher: { id: s.assignment.teacherId, name: nameOf(s.assignment.teacher) } }));
  }
  private order = [{ weekday: 'asc' as const }, { startTime: 'asc' as const }];

  /** Admin: butun maktab yoki bitta sinf/o'qituvchi jadvali */
  async timetable(actor: CurrentUserPayload, q: { organizationId?: string; teacherId?: string; groupId?: string }) {
    const organizationId = resolveOrgId(actor, q.organizationId);
    const rows = await this.prisma.scheduleSlot.findMany({
      where: { organizationId, assignment: { ...(q.teacherId ? { teacherId: q.teacherId } : {}), ...(q.groupId ? { groupId: q.groupId } : {}) } },
      orderBy: this.order, include: SLOT_INC,
    });
    return this.shape(rows);
  }

  /** O'qituvchi — o'z darslari; o'quvchi — a'zo bo'lgan sinflari darslari */
  async mine(user: CurrentUserPayload) {
    if (!user.organizationId) return [];
    let where: any;
    if (user.role === 'TEACHER') where = { organizationId: user.organizationId, assignment: { teacherId: user.id } };
    else if (user.role === 'STUDENT') where = { organizationId: user.organizationId, assignment: { group: { members: { some: { studentId: user.id } } } } };
    else throw new ForbiddenException("Bu jadval o'qituvchi va o'quvchilar uchun");
    return this.shape(await this.prisma.scheduleSlot.findMany({ where, orderBy: this.order, include: SLOT_INC }));
  }
}
