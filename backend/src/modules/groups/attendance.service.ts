import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { AttendanceStatusValue, MarkAttendanceDto } from './dto/attendance.dto';
import { isoWeekday } from './schedule.util';

const TZ_OFFSET_MS = 5 * 3_600_000; // Toshkent, UTC+5
const DAY_MS = 86_400_000;
export const ATTENDANCE_MAX_BACKDAYS = 90;

/** Toshkent bo'yicha "bugun" (YYYY-MM-DD) */
export function tashkentToday(now: Date = new Date()): string {
  return new Date(now.getTime() + TZ_OFFSET_MS).toISOString().slice(0, 10);
}

/** 'YYYY-MM-DD' ni qat'iy tekshiradi: haqiqiy sana, kelajak emas, 90 kundan eski emas. */
export function parseAttendanceDate(input: unknown, now: Date = new Date()): { iso: string; date: Date } {
  if (typeof input !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    throw new BadRequestException("Sana YYYY-MM-DD ko'rinishida bo'lsin");
  }
  const date = new Date(`${input}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== input) {
    throw new BadRequestException("Sana noto'g'ri");
  }
  const today = tashkentToday(now);
  if (input > today) throw new BadRequestException("Kelajak sanasiga davomat belgilab bo'lmaydi");
  const oldest = new Date(`${today}T00:00:00.000Z`).getTime() - ATTENDANCE_MAX_BACKDAYS * DAY_MS;
  if (date.getTime() < oldest) {
    throw new BadRequestException(`Davomatni faqat oxirgi ${ATTENDANCE_MAX_BACKDAYS} kun uchun belgilash mumkin`);
  }
  return { iso: input, date };
}

function emptyCounts() {
  return { present: 0, absent: 0, excused: 0 };
}
function bump(c: ReturnType<typeof emptyCounts>, s: AttendanceStatusValue) {
  if (s === 'PRESENT') c.present++;
  else if (s === 'ABSENT') c.absent++;
  else c.excused++;
}
/** Qatnashish foizi: kelgan / (kelgan + kelmagan + sababli). Hech narsa belgilanmagan bo'lsa — null. */
function percentOf(c: ReturnType<typeof emptyCounts>): number | null {
  const total = c.present + c.absent + c.excused;
  return total === 0 ? null : Math.round((c.present * 100) / total);
}

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  /** Guruhni topadi; o'qituvchi faqat O'Z guruhini, admin — hammasini boshqaradi. */
  private async loadManageableGroup(groupId: string, user: CurrentUserPayload) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, teacherId: true, deletedAt: true, lessonDays: true },
    });
    if (!group || group.deletedAt) throw new NotFoundException('Guruh topilmadi');
    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
    if (!isAdmin) {
      if (user.role !== 'TEACHER' || group.teacherId !== user.id) {
        throw new ForbiddenException('Bu guruh sizga biriktirilmagan');
      }
    }
    return group;
  }

  /** Bir kunlik davomat ro'yxati: guruh a'zolari va ularning belgilangan holati (belgilanmagan — null). */
  async getDay(groupId: string, dateInput: string | undefined, user: CurrentUserPayload, now: Date = new Date()) {
    const group = await this.loadManageableGroup(groupId, user);
    const { iso, date } = parseAttendanceDate(dateInput ?? tashkentToday(now), now);

    const [members, records] = await Promise.all([
      this.prisma.groupMember.findMany({
        where: { groupId },
        orderBy: { createdAt: 'asc' },
        select: { student: { select: { id: true, firstName: true, lastName: true, username: true } } },
      }),
      this.prisma.attendanceRecord.findMany({
        where: { groupId, date },
        select: { studentId: true, status: true, note: true },
      }),
    ]);
    const byStudent = new Map(records.map((r: any) => [r.studentId, r]));
    const students = members.map((m: any) => {
      const rec: any = byStudent.get(m.student.id);
      return {
        studentId: m.student.id,
        firstName: m.student.firstName,
        lastName: m.student.lastName ?? null,
        username: m.student.username ?? null,
        status: (rec?.status ?? null) as AttendanceStatusValue | null,
        note: rec?.note ?? null,
      };
    });
    const lessonDays: number[] = (group as any).lessonDays ?? [];
    return {
      groupId,
      date: iso,
      students,
      markedCount: students.filter((s: any) => s.status).length,
      lessonDays,
      // Jadval belgilanmagan bo'lsa — true (cheklov yo'q); belgilangan bo'lsa shu kun darsmi
      isLessonDay: lessonDays.length === 0 ? true : lessonDays.includes(isoWeekday(iso)),
    };
  }

  /** Bir kunlik davomatni saqlaydi (qayta yuborilsa yangilaydi). Faqat guruh a'zolari uchun. */
  async markDay(groupId: string, dto: MarkAttendanceDto, user: CurrentUserPayload, now: Date = new Date()) {
    await this.loadManageableGroup(groupId, user);
    const { iso, date } = parseAttendanceDate(dto.date, now);

    const ids = dto.records.map((r) => r.studentId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException("Bitta o'quvchi ro'yxatda ikki marta uchrayapti");
    }
    const members = await this.prisma.groupMember.findMany({
      where: { groupId, studentId: { in: ids } },
      select: { studentId: true },
    });
    if (members.length !== ids.length) {
      throw new BadRequestException(`${ids.length - members.length} ta o'quvchi bu guruh a'zosi emas`);
    }

    await this.prisma.$transaction(
      dto.records.map((r) =>
        this.prisma.attendanceRecord.upsert({
          where: { groupId_studentId_date: { groupId, studentId: r.studentId, date } },
          create: { groupId, studentId: r.studentId, date, status: r.status, note: r.note?.trim() || null, markedById: user.id },
          update: { status: r.status, note: r.note?.trim() || null, markedById: user.id },
        }),
      ),
    );
    return { ok: true, date: iso, saved: dto.records.length };
  }

  /** O'qituvchi/admin uchun: oxirgi N kunda har bir o'quvchining davomati. */
  async summary(groupId: string, daysRaw: number | undefined, user: CurrentUserPayload, now: Date = new Date()) {
    await this.loadManageableGroup(groupId, user);
    const days = Math.min(ATTENDANCE_MAX_BACKDAYS, Math.max(1, Number.isFinite(daysRaw) ? Math.trunc(daysRaw as number) : 30));
    const from = new Date(new Date(`${tashkentToday(now)}T00:00:00.000Z`).getTime() - (days - 1) * DAY_MS);

    const [members, records] = await Promise.all([
      this.prisma.groupMember.findMany({
        where: { groupId },
        orderBy: { createdAt: 'asc' },
        select: { student: { select: { id: true, firstName: true, lastName: true } } },
      }),
      this.prisma.attendanceRecord.findMany({
        where: { groupId, date: { gte: from } },
        select: { studentId: true, status: true },
      }),
    ]);
    const per = new Map<string, ReturnType<typeof emptyCounts>>();
    const all = emptyCounts();
    for (const r of records as any[]) {
      const c = per.get(r.studentId) ?? emptyCounts();
      bump(c, r.status);
      bump(all, r.status);
      per.set(r.studentId, c);
    }
    return {
      groupId,
      days,
      overallPercent: percentOf(all),
      students: members.map((m: any) => {
        const c = per.get(m.student.id) ?? emptyCounts();
        return { studentId: m.student.id, firstName: m.student.firstName, lastName: m.student.lastName ?? null, ...c, percent: percentOf(c) };
      }),
    };
  }

  /** O'quvchi uchun: faqat O'Z davomati (token'dagi id), faqat a'zo bo'lgan guruhida. */
  async mySummary(groupId: string, user: CurrentUserPayload, now: Date = new Date()) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_studentId: { groupId, studentId: user.id } },
      select: { id: true },
    });
    if (!member) throw new ForbiddenException("Siz bu guruhga a'zo emassiz");

    const from = new Date(new Date(`${tashkentToday(now)}T00:00:00.000Z`).getTime() - 59 * DAY_MS);
    const records = await this.prisma.attendanceRecord.findMany({
      where: { groupId, studentId: user.id, date: { gte: from } },
      orderBy: { date: 'desc' },
      select: { date: true, status: true },
    });
    const c = emptyCounts();
    for (const r of records as any[]) bump(c, r.status);
    return {
      groupId,
      days: 60,
      ...c,
      percent: percentOf(c),
      recent: (records as any[]).slice(0, 14).map((r) => ({ date: new Date(r.date).toISOString().slice(0, 10), status: r.status })),
    };
  }
}
