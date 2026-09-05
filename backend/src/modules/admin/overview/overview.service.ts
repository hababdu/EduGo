import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class OverviewService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalStudents,
      activeStudents,
      totalTeachers,
      totalCourses,
      totalSubjects,
      totalTests,
      completedTestsCount,
      todayTestAttempts,
      scoreSumAgg,
      dailyActivity,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: 'STUDENT', deletedAt: null } }),
      this.prisma.user.count({
        where: { role: 'STUDENT', deletedAt: null, lastActiveAt: { gte: sevenDaysAgo } },
      }),
      this.prisma.user.count({ where: { role: 'TEACHER', deletedAt: null } }),
      this.prisma.course.count({ where: { deletedAt: null } }),
      this.prisma.subject.count({ where: { deletedAt: null } }),
      this.prisma.test.count({ where: { deletedAt: null } }),
      this.prisma.testAttempt.count(),
      this.prisma.testAttempt.count({ where: { completedAt: { gte: todayStart } } }),
      this.prisma.scoreTransaction.aggregate({ _sum: { amount: true } }),
      this.getDailyActiveUsersLast7Days(),
    ]);

    return {
      totals: {
        students: totalStudents,
        activeStudents,
        teachers: totalTeachers,
        courses: totalCourses,
        subjects: totalSubjects,
        tests: totalTests,
        completedTests: completedTestsCount,
        totalScoreIssued: scoreSumAgg._sum.amount ?? 0,
      },
      today: {
        testAttempts: todayTestAttempts,
      },
      charts: {
        dailyActiveUsers: dailyActivity,
      },
    };
  }

  /** Oxirgi 7 kunlik faol foydalanuvchilar — chart uchun */
  private async getDailyActiveUsersLast7Days() {
    const days: { date: string; count: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const start = new Date();
      start.setDate(start.getDate() - i);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const count = await this.prisma.activityLog.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: start, lt: end } },
      });

      days.push({ date: start.toISOString().slice(0, 10), count: count.length });
    }

    return days;
  }
}
