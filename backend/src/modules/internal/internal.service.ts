// src/modules/internal/internal.service.ts
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { effectiveRole, superAdminIds, SWITCHABLE_ROLES } from '../../common/super-admin.util';
import { PrismaService } from '../../prisma/prisma.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { MaterialsService } from '../materials/materials.service';
import { SubmissionsService } from '../submissions/submissions.service';

export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN' | 'SUPER_ADMIN' | 'PARENT';

@Injectable()
export class InternalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly dashboard: DashboardService,
    private readonly submissions: SubmissionsService,
    private readonly materials: MaterialsService,
  ) {}

  /* ============================================================
     BOT: O'QUVCHI VAZIFALARI (Mini App ochmasdan topshirish)
     ============================================================ */
  /** Telegram ID bo'yicha faol o'quvchi → CurrentUserPayload (amaldagi rol bilan). */
  private async actorByTelegram(telegramId: string): Promise<CurrentUserPayload> {
    const u = await this.prisma.user.findFirst({ where: { telegramId, deletedAt: null } });
    if (!u) throw new NotFoundException('Foydalanuvchi topilmadi');
    if (u.status === 'BLOCKED') throw new ForbiddenException('Akkaunt bloklangan');
    return {
      id: u.id,
      telegramId: u.telegramId,
      role: effectiveRole(u.role as string, u.activeRole as string | null),
      status: u.status,
      organizationId: u.organizationId,
    };
  }

  private async studentActor(telegramId: string): Promise<CurrentUserPayload> {
    const a = await this.actorByTelegram(telegramId);
    if (a.role !== 'STUDENT') throw new ForbiddenException("Vazifa topshirish faqat o'quvchi rolida mumkin");
    return a;
  }

  async listHomework(telegramId: string) {
    const a = await this.studentActor(telegramId);
    const tasks = await this.dashboard.myTasks(a.id);
    // Faqat topshirish mumkin bo'lganlar: topshirilmagan yoki tuzatishga qaytarilgan
    return (tasks as any[]).filter((t) => t.state === 'PENDING' || t.state === 'RETURNED');
  }

  async homeworkDetail(telegramId: string, assignmentId: string) {
    return this.submissions.getMine(await this.studentActor(telegramId), assignmentId);
  }

  async uploadHomeworkFile(telegramId: string, file: { originalname: string; mimetype: string; buffer: Buffer }) {
    return this.materials.upload(await this.studentActor(telegramId), file);
  }

  /** Bekor qilingan topshirishdagi biriktirilmagan faylni o'chirish (yuklash limiti to'lib qolmasin). */
  async removeHomeworkFile(telegramId: string, fileId: string) {
    await this.materials.remove(await this.studentActor(telegramId), fileId);
    return { ok: true };
  }

  async submitHomework(telegramId: string, assignmentId: string, body: { textAnswer?: string; fileIds?: string[] }) {
    return this.submissions.submit(await this.studentActor(telegramId), assignmentId, {
      textAnswer: typeof body?.textAnswer === 'string' ? body.textAnswer : undefined,
      fileIds: Array.isArray(body?.fileIds) ? body.fileIds.filter((x) => typeof x === 'string') : [],
    });
  }

  /* ============================================================
     BOT: SUPER ADMIN — ROL ALMASHTIRISH ("ko'rish" rejimi)
     ============================================================ */
  private async realSuperAdmin(telegramId: string) {
    const u = await this.prisma.user.findFirst({ where: { telegramId, deletedAt: null } });
    if (!u) throw new NotFoundException('Foydalanuvchi topilmadi');
    const ids = superAdminIds(this.config.get<string>('SUPER_ADMIN_TELEGRAM_IDS'));
    const isSuper = ids.length ? ids.includes(u.telegramId) : u.role === 'SUPER_ADMIN';
    if (!isSuper) throw new ForbiddenException('Bu amal faqat super admin uchun');
    return u;
  }

  async switchOptions(telegramId: string) {
    const u = await this.realSuperAdmin(telegramId);
    const orgs = await this.prisma.organization.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
      take: 40,
    });
    return {
      activeRole: effectiveRole('SUPER_ADMIN', u.activeRole as string | null),
      organizationId: u.organizationId,
      organizationName: orgs.find((o) => o.id === u.organizationId)?.name ?? null,
      orgs,
    };
  }

  /**
   * Super admin boshqa rolni "kiyib" ko'radi. Haqiqiy rol (`role`) o'zgarmaydi — faqat `activeRole`.
   * STUDENT/TEACHER/ADMIN uchun tashkilot tanlanadi (ma'lumot shu maktab doirasida ko'rinadi).
   * SUPER_ADMIN ga qaytganda tashkilot va faol rol tozalanadi.
   */
  async switchRole(telegramId: string, body: { role: string; organizationId?: string }) {
    const u = await this.realSuperAdmin(telegramId);
    const role = body?.role;
    if (!(SWITCHABLE_ROLES as readonly string[]).includes(role)) throw new BadRequestException("Noto'g'ri rol");

    if (role === 'SUPER_ADMIN') {
      await this.prisma.user.update({ where: { id: u.id }, data: { activeRole: null, organizationId: null } });
    } else {
      const orgId = body.organizationId;
      if (!orgId) throw new BadRequestException('Tashkilotni tanlang');
      const org = await this.prisma.organization.findFirst({ where: { id: orgId, status: 'ACTIVE' }, select: { id: true } });
      if (!org) throw new NotFoundException('Tashkilot topilmadi yoki faol emas');
      // Sahifalar profil yozuvlarini kutadi — yo'q bo'lsa bo'sh profil yaratamiz
      if (role === 'STUDENT') await this.prisma.studentProfile.upsert({ where: { userId: u.id }, create: { userId: u.id }, update: {} });
      if (role === 'TEACHER') await this.prisma.teacherProfile.upsert({ where: { userId: u.id }, create: { userId: u.id }, update: {} });
      if (role === 'ADMIN') await this.prisma.adminProfile.upsert({ where: { userId: u.id }, create: { userId: u.id }, update: {} });
      await this.prisma.user.update({ where: { id: u.id }, data: { activeRole: role as any, organizationId: orgId } });
    }

    await this.prisma.adminActionLog.create({
      data: {
        actorId: u.id,
        action: 'ROLE_VIEW_SWITCH',
        targetType: 'User',
        targetId: u.id,
        oldValue: { activeRole: u.activeRole } as any,
        newValue: { activeRole: role === 'SUPER_ADMIN' ? null : role, organizationId: body.organizationId ?? null } as any,
      },
    });
    return this.getUserRole(telegramId);
  }

  /* ============================================================
     GET USER ROLE — bot menyu uchun
     ============================================================ */
  async getUserRole(telegramId: string) {
    const user = await this.prisma.user.findFirst({
      where: { telegramId, deletedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        role: true,
        activeRole: true,
        status: true,
      },
    });

    if (!user) {
      throw new NotFoundException(
        'Foydalanuvchi topilmadi. Avval "Darsni boshlash" orqali platformaga kiring.',
      );
    }

    return {
      id: user.id,
      role: effectiveRole(user.role as string, user.activeRole as string | null) as UserRole,
      /** Haqiqiy rol (super admin boshqa rolni kiyib ko'rayotgan bo'lsa ham SUPER_ADMIN) */
      realRole: user.role as UserRole,
      status: user.status,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
    };
  }

  /* ============================================================
     STUDENT FUNKSIYALARI
     ============================================================ */
  async getStudentSummary(telegramId: string) {
    const user = await this.prisma.user.findUnique({
      where: { telegramId },
      include: { studentProfile: true, streak: true },
    });

    if (!user) {
      throw new NotFoundException(
        'Foydalanuvchi topilmadi. Avval "Darsni boshlash" orqali platformaga kiring.',
      );
    }

    const higherScoreCount = await this.prisma.studentProfile.count({
      where: { totalScore: { gt: user.studentProfile?.totalScore ?? 0 } },
    });

    return {
      firstName: user.firstName,
      totalScore: user.studentProfile?.totalScore ?? 0,
      totalXp: user.studentProfile?.totalXp ?? 0,
      level: user.studentProfile?.level ?? 1,
      rank: higherScoreCount + 1,
      streak: user.streak?.currentStreak ?? 0,
    };
  }

  async getRecentResults(telegramId: string, limit = 5) {
    const user = await this.prisma.user.findUnique({ where: { telegramId } });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    return this.prisma.testAttempt.findMany({
      where: { studentId: user.id },
      orderBy: { completedAt: 'desc' },
      take: limit,
      include: { test: { select: { title: true } } },
    });
  }

  async getAchievements(telegramId: string) {
    const user = await this.prisma.user.findUnique({ where: { telegramId } });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    return this.prisma.studentAchievement.findMany({
      where: { studentId: user.id },
      include: { achievement: true },
      orderBy: { earnedAt: 'desc' },
    });
  }

  async getTopRanking(limit = 10) {
    return this.prisma.studentProfile.findMany({
      orderBy: { totalScore: 'desc' },
      take: limit,
      include: { user: { select: { firstName: true, username: true } } },
    });
  }

  async getRecentAnnouncements(limit = 5) {
    return this.prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /* ============================================================
     TEACHER FUNKSIYALARI
     ============================================================ */
  async getTeacherOverview(telegramId: string) {
    const user = await this.prisma.user.findFirst({
      where: { telegramId, role: 'TEACHER', deletedAt: null },
    });

    if (!user) {
      throw new NotFoundException('Teacher topilmadi');
    }

    const groups = await this.prisma.group.findMany({
      where: { teacherId: user.id, deletedAt: null },
      include: { _count: { select: { members: true } } },
    });

    const groupIds = groups.map((g) => g.id);
    const studentIds = Array.from(
      new Set(
        (
          await this.prisma.groupMember.findMany({
            where: { groupId: { in: groupIds } },
            select: { studentId: true },
          })
        ).map((m) => m.studentId),
      ),
    );

    const [assignmentsCount, assignedTestsCount] = await Promise.all([
      this.prisma.teacherAssignment.count({
        where: { teacherId: user.id, deletedAt: null },
      }),
      this.prisma.testAssignment.count({
        where: { assignedById: user.id },
      }),
    ]);

    return {
      groupsCount: groups.length,
      studentsCount: studentIds.length,
      assignmentsCount,
      assignedTestsCount,
    };
  }

  async getTeacherGroups(telegramId: string) {
    const user = await this.prisma.user.findFirst({
      where: { telegramId, role: 'TEACHER', deletedAt: null },
    });

    if (!user) throw new NotFoundException('Teacher topilmadi');

    const groups = await this.prisma.group.findMany({
      where: { teacherId: user.id, deletedAt: null },
      include: { _count: { select: { members: true } } },
    });

    return groups.map((g) => ({
      id: g.id,
      name: g.name,
      studentsCount: g._count.members,
    }));
  }

  /* ============================================================
     ADMIN FUNKSIYALARI
     ============================================================ */
  async getAdminOverview(telegramId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        telegramId,
        role: { in: ['ADMIN', 'SUPER_ADMIN'] },
        deletedAt: null,
      },
    });

    if (!user) throw new NotFoundException('Admin topilmadi');

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      students,
      activeStudents,
      teachers,
      courses,
      tests,
      totalScoreAgg,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: 'STUDENT', deletedAt: null } }),
      this.prisma.user.count({
        where: {
          role: 'STUDENT',
          deletedAt: null,
          lastActiveAt: { gte: sevenDaysAgo },
        },
      }),
      this.prisma.user.count({ where: { role: 'TEACHER', deletedAt: null } }),
      this.prisma.course.count({ where: { deletedAt: null } }),
      this.prisma.test.count({ where: { deletedAt: null } }),
      this.prisma.scoreTransaction.aggregate({ _sum: { amount: true } }),
    ]);

    return {
      students,
      activeStudents,
      teachers,
      courses,
      tests,
      totalScoreIssued: totalScoreAgg._sum.amount ?? 0,
    };
  }
}