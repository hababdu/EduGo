import { CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { orgWhere, createdByOrg } from '../../../common/org-scope';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class OverviewService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(actor: CurrentUserPayload) {
    const org = orgWhere(actor);
    const byCreator = createdByOrg(actor);
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
      this.prisma.user.count({ where: { role: 'STUDENT', deletedAt: null, ...org } }),
      this.prisma.user.count({
        where: { role: 'STUDENT', deletedAt: null, lastActiveAt: { gte: sevenDaysAgo }, ...org },
      }),
      this.prisma.user.count({ where: { role: 'TEACHER', deletedAt: null, ...org } }),
      this.prisma.course.count({ where: { deletedAt: null, ...byCreator } }),
      this.prisma.subject.count({ where: { deletedAt: null, course: byCreator } }),
      this.prisma.test.count({ where: { deletedAt: null, ...byCreator } }),
      this.prisma.testAttempt.count({ where: { student: org } }),
      this.prisma.testAttempt.count({ where: { completedAt: { gte: todayStart }, student: org } }),
      this.prisma.scoreTransaction.aggregate({ _sum: { amount: true }, where: { student: org } }),
      this.getDailyActiveUsersLast7Days(org),
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
  private async getDailyActiveUsersLast7Days(org: { organizationId?: string }) {
    const days: { date: string; count: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const start = new Date();
      start.setDate(start.getDate() - i);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const count = await this.prisma.activityLog.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: start, lt: end }, user: org },
      });

      days.push({ date: start.toISOString().slice(0, 10), count: count.length });
    }

    return days;
  }
}
