import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { TelegramStorageService } from '../materials/telegram-storage.service';

const INVITE_TTL_MS = 7 * 24 * 3_600_000;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // o'xshash belgilarsiz (0/O, 1/I)

export function makeInviteCode(len = 8): string {
  const bytes = randomBytes(len);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

const nameOf = (u: { firstName: string; lastName?: string | null }) => `${u.firstName} ${u.lastName ?? ''}`.trim();

@Injectable()
export class ParentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dashboard: DashboardService,
    private readonly tg: TelegramStorageService,
  ) {}

  /* ───────────── TAKLIF ───────────── */

  /** Kim kimning ota-onasini taklif qila oladi: o'quvchi — o'zi; o'qituvchi — o'z guruhidagi; admin — o'z maktabidagi. */
  private async assertCanInvite(user: CurrentUserPayload, studentId: string) {
    const student = await this.prisma.user.findUnique({ where: { id: studentId }, select: { id: true, role: true, organizationId: true, deletedAt: true } });
    if (!student || student.deletedAt || student.role !== 'STUDENT') throw new NotFoundException("O'quvchi topilmadi");
    if (user.role === 'STUDENT') {
      if (user.id !== studentId) throw new ForbiddenException("Faqat o'zingiz uchun taklif yarata olasiz");
    } else if (user.role === 'TEACHER') {
      const m = await this.prisma.groupMember.findFirst({ where: { studentId, group: { teacherId: user.id, deletedAt: null } }, select: { id: true } });
      if (!m) throw new ForbiddenException("Bu o'quvchi sizning guruhingizda emas");
    } else if (user.role === 'ADMIN') {
      if (!user.organizationId || user.organizationId !== student.organizationId) throw new ForbiddenException("Bu o'quvchi sizning maktabingizniki emas");
    } else if (user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException("Ruxsat yo'q");
    }
  }

  async createInvite(user: CurrentUserPayload, studentIdInput?: string) {
    const studentId = user.role === 'STUDENT' ? user.id : studentIdInput;
    if (!studentId) throw new BadRequestException("O'quvchini tanlang");
    await this.assertCanInvite(user, studentId);

    const code = makeInviteCode();
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
    await this.prisma.parentInvite.create({ data: { code, studentId, createdById: user.id, expiresAt } });
    const bot = await this.tg.botUsername();
    return { code, expiresAt, link: bot ? `https://t.me/${bot}?start=parent_${code}` : null };
  }

  /** Bot: ota-ona taklif havolasini ochdi → bog'lash (kerak bo'lsa ota-ona akkauntini yaratadi). */
  async linkByCode(codeRaw: string, tg: { id: number | string; first_name: string; last_name?: string; username?: string }) {
    const code = String(codeRaw ?? '').trim().toUpperCase();
    if (!/^[A-Z0-9]{6,16}$/.test(code)) throw new BadRequestException("Kod noto'g'ri");
    const invite = await this.prisma.parentInvite.findUnique({ where: { code } });
    if (!invite || invite.usedAt || invite.expiresAt.getTime() < Date.now()) throw new BadRequestException('Taklif eskirgan yoki ishlatilgan');
    const student = await this.prisma.user.findUnique({ where: { id: invite.studentId }, select: { id: true, firstName: true, lastName: true, organizationId: true, deletedAt: true } });
    if (!student || student.deletedAt) throw new NotFoundException("O'quvchi topilmadi");

    const telegramId = String(tg.id);
    let parent = await this.prisma.user.findUnique({ where: { telegramId }, include: { _count: { select: { groupMemberships: true, testAttempts: true } } } });
    if (parent?.deletedAt) throw new ForbiddenException('Akkaunt topilmadi');
    if (parent?.status === 'BLOCKED') throw new ForbiddenException('Akkaunt bloklangan');
    if (parent && parent.id === student.id) throw new ConflictException("O'quvchi o'z kodidan foydalana olmaydi");
    if (parent && parent.role !== 'PARENT') {
      // Hali hech narsa qilmagan oddiy (default) o'quvchi akkaunti — ota-onaga aylantiriladi; boshqa rollar — yo'q
      const blank = parent.role === 'STUDENT' && !parent.organizationId && parent._count.groupMemberships === 0 && parent._count.testAttempts === 0;
      if (!blank) throw new ConflictException("Bu Telegram akkaunt boshqa rolda ishlatilgan. Ota-ona sifatida boshqa akkaunt kerak.");
      await this.prisma.user.update({ where: { id: parent.id }, data: { role: 'PARENT' } });
    }
    if (!parent) {
      parent = (await this.prisma.user.create({
        data: { telegramId, firstName: tg.first_name, lastName: tg.last_name, username: tg.username, role: 'PARENT' },
        include: { _count: { select: { groupMemberships: true, testAttempts: true } } },
      })) as any;
    }

    await this.prisma.$transaction([
      this.prisma.parentLink.upsert({
        where: { parentId_studentId: { parentId: parent!.id, studentId: student.id } },
        create: { parentId: parent!.id, studentId: student.id },
        update: {},
      }),
      this.prisma.parentInvite.update({ where: { id: invite.id }, data: { usedAt: new Date() } }),
    ]);
    return { ok: true, childName: nameOf(student) };
  }

  /* ───────────── OTA-ONA KO'RINISHI ───────────── */

  private async assertLinked(parentId: string, studentId: string) {
    const l = await this.prisma.parentLink.findUnique({ where: { parentId_studentId: { parentId, studentId } }, select: { id: true } });
    if (!l) throw new ForbiddenException('Bu farzand sizga bog\'lanmagan');
  }

  async children(parentId: string) {
    const links = await this.prisma.parentLink.findMany({
      where: { parentId, student: { deletedAt: null } },
      orderBy: { createdAt: 'asc' },
      select: { student: { select: { id: true, firstName: true, lastName: true, username: true } } },
    });
    return Promise.all(
      links.map(async ({ student }) => {
        const [standing, tasks] = await Promise.all([this.dashboard.myStanding(student.id), this.dashboard.myTasks(student.id)]);
        return {
          id: student.id,
          name: nameOf(student),
          standing,
          pendingTasks: tasks.filter((t) => t.state === 'PENDING' || t.state === 'RETURNED').length,
          overdueTasks: tasks.filter((t) => t.overdue).length,
        };
      }),
    );
  }

  async childDetail(parentId: string, studentId: string) {
    await this.assertLinked(parentId, studentId);
    const student = await this.prisma.user.findUnique({ where: { id: studentId }, select: { id: true, firstName: true, lastName: true, studentProfile: { select: { totalScore: true, level: true } } } });
    if (!student) throw new NotFoundException('Topilmadi');
    const since = new Date(Date.now() + 5 * 3_600_000 - 30 * 86_400_000);
    since.setUTCHours(0, 0, 0, 0);
    const [standing, tasks, absences, results, journal] = await Promise.all([
      this.dashboard.myStanding(studentId),
      this.dashboard.myTasks(studentId),
      this.prisma.attendanceRecord.findMany({
        where: { studentId, date: { gte: since }, status: { in: ['ABSENT', 'EXCUSED'] } },
        orderBy: { date: 'desc' }, take: 10,
        select: { date: true, status: true, group: { select: { name: true } } },
      }),
      this.prisma.testAttempt.findMany({
        where: { studentId }, orderBy: { completedAt: 'desc' }, take: 5,
        include: { test: { select: { title: true } } },
      }),
      this.prisma.lessonLog.findMany({
        where: { group: { members: { some: { studentId } } } }, orderBy: { date: 'desc' }, take: 5,
        select: { date: true, topic: true, homework: true, group: { select: { name: true } } },
      }),
    ]);
    return {
      id: student.id,
      name: nameOf(student),
      level: student.studentProfile?.level ?? null,
      totalScore: student.studentProfile?.totalScore ?? null,
      standing,
      tasks,
      absences: absences.map((a) => ({ date: a.date.toISOString().slice(0, 10), status: a.status, group: a.group.name })),
      results: results.map((r) => ({ title: r.test.title, score: r.score, passed: r.passed, at: r.completedAt })),
      journal: journal.map((j) => ({ date: j.date.toISOString().slice(0, 10), topic: j.topic, homework: j.homework, group: j.group.name })),
    };
  }

  async unlink(parentId: string, studentId: string) {
    await this.assertLinked(parentId, studentId);
    await this.prisma.parentLink.delete({ where: { parentId_studentId: { parentId, studentId } } });
    return { ok: true };
  }
}
