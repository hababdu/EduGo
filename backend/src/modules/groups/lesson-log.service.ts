import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { assertSameOrg } from '../../common/org-scope';
import { PrismaService } from '../../prisma/prisma.service';
import { parseAttendanceDate } from './attendance.service';
import { UpsertLessonLogDto } from './dto/lesson-log.dto';

/** Dars jurnali: o'qituvchi (o'z guruhi) / admin (o'z maktabi) yozadi; guruh a'zolari o'qiydi. */
@Injectable()
export class LessonLogService {
  constructor(private readonly prisma: PrismaService) {}

  private async load(groupId: string, user: CurrentUserPayload, write: boolean) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, teacherId: true, organizationId: true, deletedAt: true },
    });
    if (!group || group.deletedAt) throw new NotFoundException('Guruh topilmadi');
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      assertSameOrg(user, group.organizationId);
    } else if (user.role === 'TEACHER') {
      if (group.teacherId !== user.id) throw new ForbiddenException('Bu guruh sizga biriktirilmagan');
    } else {
      if (write) throw new ForbiddenException("Faqat o'qituvchi yoza oladi");
      const m = await this.prisma.groupMember.findFirst({ where: { groupId, studentId: user.id }, select: { id: true } });
      if (!m) throw new ForbiddenException("Siz bu guruh a'zosi emassiz");
    }
    return group;
  }

  async list(groupId: string, user: CurrentUserPayload, limit = 30) {
    await this.load(groupId, user, false);
    const rows = await this.prisma.lessonLog.findMany({
      where: { groupId },
      orderBy: { date: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
      select: { id: true, date: true, topic: true, homework: true },
    });
    return rows.map((r) => ({ ...r, date: r.date.toISOString().slice(0, 10) }));
  }

  async upsert(groupId: string, dto: UpsertLessonLogDto, user: CurrentUserPayload, now: Date = new Date()) {
    await this.load(groupId, user, true);
    const { iso, date } = parseAttendanceDate(dto.date, now);
    const data = { topic: dto.topic.trim(), homework: dto.homework?.trim() || null };
    const row = await this.prisma.lessonLog.upsert({
      where: { groupId_date: { groupId, date } },
      create: { groupId, date, createdById: user.id, ...data },
      update: data,
    });
    return { id: row.id, date: iso, topic: row.topic, homework: row.homework };
  }
}
