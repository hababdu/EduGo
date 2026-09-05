import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GroupsService } from '../groups/groups.service';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class TeacherService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly groupsService: GroupsService,
  ) {}

  /**
   * Teacher Dashboard uchun umumiy ko'rinish — FAQAT shu teacherga
   * tegishli ma'lumotlar (44-band: "Teacher faqat o'ziga tegishli
   * resurslarga kira olsin").
   */
  async getOverview(teacherId: string) {
    const groups = await this.prisma.group.findMany({
      where: { teacherId, deletedAt: null },
      include: { members: true },
    });

    const groupIds = groups.map((g) => g.id);
    const distinctStudentIds = new Set(
      groups.flatMap((g) => g.members.map((m) => m.studentId)),
    );

    const [assignedTestsCount, recentAssignments] = await Promise.all([
      this.prisma.testAssignment.count({
        where: { assignedById: teacherId },
      }),
      this.prisma.testAssignment.findMany({
        where: { assignedById: teacherId },
        orderBy: { assignedAt: 'desc' },
        take: 5,
        include: { test: { select: { title: true } }, group: { select: { name: true } } },
      }),
    ]);

    return {
      groupsCount: groups.length,
      studentsCount: distinctStudentIds.size,
      assignedTestsCount,
      groups: groups.map((g) => ({
        id: g.id,
        name: g.name,
        studentsCount: g.members.length,
      })),
      recentAssignments: recentAssignments.map((a) => ({
        id: a.id,
        testTitle: a.test.title,
        groupName: a.group?.name ?? 'Individual',
        assignedAt: a.assignedAt,
        deadline: a.deadline,
      })),
    };
  }

  /**
   * Guruhdagi studentlar va ularning ballari.
   * Ownership tekshiruvi GroupsService.findOneOrThrow orqali — teacher
   * boshqa teacherning guruhini so'rasa shu yerda 403 qaytadi.
   */
  async getGroupStudents(groupId: string, requester: CurrentUserPayload) {
    const group = await this.groupsService.findOneOrThrow(groupId, requester);

    const studentIds = group.members.map((m) => m.studentId);

    const [profiles, attemptCounts] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: studentIds } },
        include: { studentProfile: true },
      }),
      this.prisma.testAttempt.groupBy({
        by: ['studentId'] as const,
        where: { studentId: { in: studentIds } },
        _count: { id: true },
        _avg: { percent: true },
      }),
    ]);

    const attemptMap = new Map<string, (typeof attemptCounts)[number]>(
      attemptCounts.map((a) => [a.studentId, a]),
    );

    return profiles.map((u) => {
      const stats = attemptMap.get(u.id);
      return {
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        totalScore: u.studentProfile?.totalScore ?? 0,
        level: u.studentProfile?.level ?? 1,
        testsCompleted: stats?._count.id ?? 0,
        averagePercent: stats?._avg.percent ? Math.round(stats._avg.percent) : null,
      };
    });
  }
}
