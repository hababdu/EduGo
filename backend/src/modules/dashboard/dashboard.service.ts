import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Student dashboard uchun yagona agregatsiyalangan endpoint —
   * frontend bir nechta so'rov o'rniga bitta chaqiruv bilan
   * hammasini oladi (mobil tarmoq uchun muhim).
   *
   * ESLATMA: "continueLesson" va "subject progress" hisoblash mantiqi
   * bu yerda soddalashtirilgan (test natijalariga asoslangan taxminiy
   * progress). To'liq LessonProgress modeli va aniqroq hisob-kitob
   * Phase 9-10 (Course/Test engine)da chuqurlashtiriladi.
   */
  async getStudentDashboard(userId: string) {
    const [user, profile, streak, subjects, recentAttempts, achievements] = await Promise.all([
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
      const passedTests = subject.tests.filter((t) => passedTestIds.has(t.id)).length;
      const progressPercent = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

      return {
        id: subject.id,
        title: subject.title,
        posterUrl: subject.posterUrl,
        progressPercent,
      };
    });

    // "Davom eting" kartasi — eng past progressli, lekin boshlangan fan
    const continueSubject = subjectCards
      .filter((s) => s.progressPercent > 0 && s.progressPercent < 100)
      .sort((a, b) => a.progressPercent - b.progressPercent)[0];

    const xp = profile?.totalXp ?? 0;
    const level = profile?.level ?? 1;
    const xpForNextLevel = level * 500; // oddiy formula — keyin balanslanadi
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
}
