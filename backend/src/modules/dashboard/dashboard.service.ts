// src/modules/dashboard/dashboard.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /* ============================================================
     FAOLLIK MATRITSASI — kunlar kesimida (Toshkent vaqti, UTC+5)
     ============================================================ */
  static readonly ACTIVITY_TZ_OFFSET_HOURS = 5;
  static readonly ACTIVITY_MAX_DAYS = 120;

  /** Faqat TOKEN'dagi o'quvchining o'z faolligi. Bo'sh kunlar ham 0 bilan qaytadi. */
  async getMyActivity(userId: string, daysRaw?: number, now: Date = new Date()) {
    const n = Number.isFinite(daysRaw) ? Math.trunc(daysRaw as number) : 84;
    const days = Math.min(DashboardService.ACTIVITY_MAX_DAYS, Math.max(7, n));
    const offsetMs = DashboardService.ACTIVITY_TZ_OFFSET_HOURS * 3_600_000;

    // Toshkent "bugun" yarim kechasi (UTC ms), keyin (days-1) kun orqaga
    const localNow = new Date(now.getTime() + offsetMs);
    const todayStartLocal = Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate());
    const startLocal = todayStartLocal - (days - 1) * 86_400_000;
    const since = new Date(startLocal - offsetMs);

    const rows = await this.prisma.xpTransaction.findMany({
      where: { studentId: userId, createdAt: { gte: since } },
      select: { createdAt: true, amount: true },
    });

    const map = new Map<string, { xp: number; count: number }>();
    for (const r of rows) {
      const key = new Date(r.createdAt.getTime() + offsetMs).toISOString().slice(0, 10);
      const cur = map.get(key) ?? { xp: 0, count: 0 };
      cur.xp += Math.max(0, r.amount);
      cur.count += 1;
      map.set(key, cur);
    }

    const out: { date: string; xp: number; count: number }[] = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startLocal + i * 86_400_000).toISOString().slice(0, 10);
      const v = map.get(date) ?? { xp: 0, count: 0 };
      out.push({ date, xp: v.xp, count: v.count });
    }
    return { days: out, activeDays: out.filter((d) => d.count > 0).length };
  }

  /* ============================================================
     STUDENT DASHBOARD
     ============================================================ */
  async getStudentDashboard(userId: string) {
    const [user, profile, streak, subjects, recentAttempts, achievements] =
      await Promise.all([
        this.prisma.user.findUnique({ where: { id: userId } }),
        this.prisma.studentProfile.findUnique({ where: { userId } }),
        this.prisma.streak.findUnique({ where: { studentId: userId } }),
        this.prisma.subject.findMany({
          where: { status: 'PUBLISHED', deletedAt: null },
          include: {
            sections: { include: { topics: true } },
            tests: true,
          },
        }),
        this.prisma.testAttempt.findMany({
          where: { studentId: userId },
          orderBy: { completedAt: 'desc' },
          take: 5,
          include: { test: { select: { title: true } } },
        }),
        this.prisma.studentAchievement.findMany({
          where: { studentId: userId },
          orderBy: { earnedAt: 'desc' },
          take: 6,
          include: { achievement: true },
        }),
      ]);

    const rankAbove = await this.prisma.studentProfile.count({
      where: { totalScore: { gt: profile?.totalScore ?? 0 } },
    });

    const passedTestIds = new Set(
      (
        await this.prisma.testAttempt.findMany({
          where: { studentId: userId, passed: true },
          select: { testId: true },
        })
      ).map((a) => a.testId),
    );

    const subjectCards = subjects.map((subject) => {
      const totalTests = subject.tests.length;
      const passedTests = subject.tests.filter((t) =>
        passedTestIds.has(t.id),
      ).length;
      const progressPercent =
        totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

      return {
        id: subject.id,
        title: subject.title,
        posterUrl: subject.posterUrl,
        progressPercent,
      };
    });

    // "Davom eting" kartasi — boshlangan, lekin tugatilmagan fan
    const continueSubject = subjectCards
      .filter((s) => s.progressPercent > 0 && s.progressPercent < 100)
      .sort((a, b) => a.progressPercent - b.progressPercent)[0];

    const xp = profile?.totalXp ?? 0;
    const level = profile?.level ?? 1;
    const xpForNextLevel = level * 500;
    const xpIntoLevel = xp % 500;

    return {
      student: {
        firstName: user?.firstName ?? '',
        profilePhotoUrl: user?.profilePhotoUrl ?? null,
        streak: streak?.currentStreak ?? 0,
        rank: rankAbove + 1,
      },
      continueLesson: continueSubject
        ? {
            subjectId: continueSubject.id,
            subjectTitle: continueSubject.title,
            progressPercent: continueSubject.progressPercent,
          }
        : null,
      subjects: subjectCards,
      stats: {
        totalScore: profile?.totalScore ?? 0,
        xp,
        level,
        xpIntoLevel,
        xpForNextLevel: 500,
      },
      recentResults: recentAttempts.map((a) => ({
        testTitle: a.test.title,
        percent: a.percent,
        passed: a.passed,
      })),
      achievements: achievements.map((a) => ({
        id: a.id,
        title: a.achievement.title,
        iconUrl: a.achievement.iconUrl,
      })),
    };
  }

  /* ============================================================
     LIST MY ASSIGNMENTS — faqat o'z guruhlariga tegishli materiallar
     ============================================================ */
  async listMyAssignments(studentId: string) {
    // 1. Student a'zo bo'lgan guruhlar
    const memberships = await this.prisma.groupMember.findMany({
      where: { studentId },
      select: { groupId: true },
    });
    const groupIds = memberships.map((m) => m.groupId);

    if (groupIds.length === 0) return [];

    // 2. Faqat shu guruhlarga tegishli materiallar
    return this.prisma.teacherAssignment.findMany({
      where: {
        groupId: { in: groupIds },
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        group: { select: { id: true, name: true } },
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
        tests: { orderBy: { order: 'asc' } },
      },
    });
  }

  /* ============================================================
     GET MY ASSIGNMENT — bitta material
     ============================================================ */
  async getMyAssignment(studentId: string, assignmentId: string) {
    const memberships = await this.prisma.groupMember.findMany({
      where: { studentId },
      select: { groupId: true },
    });
    const groupIds = memberships.map((m) => m.groupId);

    const item = await this.prisma.teacherAssignment.findFirst({
      where: {
        id: assignmentId,
        groupId: { in: groupIds },
        deletedAt: null,
      },
      include: {
        group: { select: { id: true, name: true } },
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
        tests: { orderBy: { order: 'asc' } },
      },
    });

    if (!item) {
      throw new NotFoundException('Material topilmadi');
    }

    return item;
  }
}