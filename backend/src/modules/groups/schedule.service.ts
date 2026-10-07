import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { tashkentToday } from './attendance.service';
import { tashkentWeekday } from './schedule.util';

@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Bugun (Toshkent) darsi bor guruhlar. Admin — hammasi, o'qituvchi — faqat o'zinikilar,
   * o'quvchi — a'zo bo'lgan guruhlari. O'qituvchi/admin uchun davomat belgilanganmi ham qaytadi.
   */
  async today(user: CurrentUserPayload, now: Date = new Date()) {
    const weekday = tashkentWeekday(now);
    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
    const isTeacher = user.role === 'TEACHER';

    const groups = await this.prisma.group.findMany({
      where: {
        deletedAt: null,
        lessonDays: { has: weekday },
        ...(isAdmin ? {} : isTeacher ? { teacherId: user.id } : { members: { some: { studentId: user.id } } }),
      },
      select: {
        id: true,
        name: true,
        lessonStartTime: true,
        lessonEndTime: true,
        room: true,
        teacher: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { members: true } },
      },
    });

    let markedByGroup = new Map<string, number>();
    if ((isAdmin || isTeacher) && groups.length > 0) {
      const date = new Date(`${tashkentToday(now)}T00:00:00.000Z`);
      const rows = await this.prisma.attendanceRecord.groupBy({
        by: ['groupId'],
        where: { groupId: { in: groups.map((g: any) => g.id) }, date },
        _count: { _all: true },
      });
      markedByGroup = new Map(rows.map((r: any) => [r.groupId, r._count._all]));
    }

    return groups
      .map((g: any) => ({
        id: g.id,
        name: g.name,
        startTime: g.lessonStartTime ?? null,
        endTime: g.lessonEndTime ?? null,
        room: g.room ?? null,
        teacher: g.teacher ?? null,
        membersCount: g._count.members,
        markedCount: markedByGroup.get(g.id) ?? 0,
      }))
      .sort((a: any, b: any) => (a.startTime ?? '99:99').localeCompare(b.startTime ?? '99:99'));
  }
}
