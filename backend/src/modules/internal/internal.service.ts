// src/modules/internal/internal.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN' | 'SUPER_ADMIN';

@Injectable()
export class InternalService {
  constructor(private readonly prisma: PrismaService) {}

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
      role: user.role as UserRole,
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