import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { GroupsService } from '../groups/groups.service';
import { AuditService } from '../admin/audit/audit.service';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import {
  CreateAssignmentDto,
  UpdateAssignmentDto,
} from './dto/teacher-assignments.dto';

@Injectable()
export class TeacherService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly groupsService: GroupsService,
    private readonly audit: AuditService,
  ) {}

  /* ============================================================
     OVERVIEW — charts + stats
     ============================================================ */
  async getOverview(teacherId: string) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const groups = await this.prisma.group.findMany({
      where: { teacherId, deletedAt: null },
      include: {
        members: { select: { studentId: true } },
      },
    });

    const studentIds = Array.from(
      new Set(groups.flatMap((g) => g.members.map((m) => m.studentId))),
    );
    const attemptsWhere: Prisma.TestAttemptWhereInput = {
      studentId: { in: studentIds },
      completedAt: { not: { equals: null as any } },
    };

    const [
      assignedTestsCount,
      assignmentsCount,
      recentAssignments,
      attemptsStats,
      dailyActivity,
      topStudents,
    ] = await Promise.all([
      this.prisma.testAssignment.count({
        where: { assignedById: teacherId },
      }),

      this.prisma.teacherAssignment.count({
        where: { teacherId, deletedAt: null },
      }),

      this.prisma.testAssignment.findMany({
        where: { assignedById: teacherId },
        orderBy: { assignedAt: 'desc' },
        take: 5,
        include: {
          test: { select: { id: true, title: true } },
          group: { select: { id: true, name: true } },
        },
      }),

      studentIds.length > 0
        ? this.prisma.testAttempt.aggregate({
            where: attemptsWhere,
            _count: { _all: true },
            _avg: { percent: true },
          })
        : Promise.resolve({
            _count: { _all: 0 },
            _avg: { percent: 0 },
          }),

      studentIds.length > 0
        ? this.getDailyActivity(studentIds, sevenDaysAgo)
        : Promise.resolve([]),

      studentIds.length > 0
        ? this.prisma.user.findMany({
            where: { id: { in: studentIds }, deletedAt: null },
            orderBy: { studentProfile: { totalScore: 'desc' } },
            take: 5,
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
              studentProfile: { select: { totalScore: true, level: true } },
            },
          })
        : Promise.resolve([]),
    ]);

    const totalAttempts = attemptsStats._count._all ?? 0;
    const averageScore =
      attemptsStats._avg.percent != null
        ? Math.round(attemptsStats._avg.percent)
        : 0;

    return {
      groupsCount: groups.length,
      studentsCount: studentIds.length,
      assignedTestsCount,
      assignmentsCount,
      totalAttempts,
      averageScore,

      groups: groups.map((g) => ({
        id: g.id,
        name: g.name,
        studentsCount: g.members.length,
      })),

      recentAssignments: recentAssignments.map((a) => ({
        id: a.id,
        testId: a.test.id,
        testTitle: a.test.title,
        groupId: a.group?.id,
        groupName: a.group?.name ?? 'Individual',
        assignedAt: a.assignedAt,
      })),

      charts: {
        dailyActivity,
      },

      topStudents: topStudents.map((s) => ({
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        username: s.username,
        totalScore: s.studentProfile?.totalScore ?? 0,
        level: s.studentProfile?.level ?? 1,
      })),
    };
  }

  /* ============================================================
     Kunlik faollik
     ============================================================ */
  private async getDailyActivity(studentIds: string[], from: Date) {
    const where: Prisma.TestAttemptWhereInput = {
      studentId: { in: studentIds },
      completedAt: { gte: from },
    };

    const attempts = await this.prisma.testAttempt.findMany({
      where,
      select: {
        completedAt: true,
        percent: true,
        studentId: true,
      },
    });

    const map = new Map<string, { students: Set<string>; percents: number[] }>();

    for (const a of attempts) {
      if (!a.completedAt) continue;
      const key = a.completedAt.toISOString().slice(0, 10);
      if (!map.has(key)) map.set(key, { students: new Set(), percents: [] });
      const entry = map.get(key)!;
      entry.students.add(a.studentId);
      entry.percents.push(a.percent);
    }

    const result: { date: string; count: number; avgPercent: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      const entry = map.get(key);
      const avg =
        entry && entry.percents.length > 0
          ? Math.round(
              entry.percents.reduce((s, p) => s + p, 0) / entry.percents.length,
            )
          : 0;
      result.push({
        date: key,
        count: entry?.students.size ?? 0,
        avgPercent: avg,
      });
    }

    return result;
  }

  /* ============================================================
     GURUH STUDENTLARI
     ============================================================ */
  async getGroupStudents(groupId: string, requester: CurrentUserPayload) {
    const group = await this.groupsService.findOneOrThrow(groupId, requester);
    const studentIds = group.members.map((m) => m.studentId);
    if (studentIds.length === 0) return [];

    const attemptsWhere: Prisma.TestAttemptWhereInput = {
      studentId: { in: studentIds },
    };

    const [profiles, attemptCounts] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: studentIds } },
        include: { studentProfile: true },
      }),
      this.prisma.testAttempt.groupBy({
        by: ['studentId'] as const,
        where: attemptsWhere,
        _count: { _all: true },
        _avg: { percent: true },
      }),
    ]);

    const attemptMap = new Map(attemptCounts.map((a) => [a.studentId, a]));

    return profiles.map((u) => {
      const stats = attemptMap.get(u.id);
      const testsCompleted = stats?._count._all ?? 0;
      const averagePercent =
        stats?._avg.percent != null ? Math.round(stats._avg.percent) : null;

      return {
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        username: u.username,
        totalScore: u.studentProfile?.totalScore ?? 0,
        level: u.studentProfile?.level ?? 1,
        testsCompleted,
        averagePercent,
      };
    });
  }

  /* ============================================================
     TEACHER GROUPS — barcha guruhlar
     ============================================================ */
  async listMyGroups(teacherId: string) {
    return this.prisma.group.findMany({
      where: {
        teacherId,
        deletedAt: null,
      },
      include: {
        _count: {
          select: { members: true, assignments: true },
        },
      },
    });
  }

  async getMyGroup(teacherId: string, groupId: string) {
    const group = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        teacherId,
        deletedAt: null,
      },
      include: {
        members: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                username: true,
                status: true,
                studentProfile: {
                  select: { totalScore: true, level: true },
                },
              },
            },
          },
        },
        _count: {
          select: { members: true, assignments: true },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Guruh topilmadi yoki sizga tegishli emas');
    }

    return group;
  }

  /* ============================================================
     ASSIGNMENTS — CRUD
     ============================================================ */
  async listAssignments(teacherId: string, groupId?: string) {
    const where: any = { teacherId, deletedAt: null };

    if (groupId) {
      const group = await this.prisma.group.findFirst({
        where: { id: groupId, teacherId, deletedAt: null },
      });
      if (!group) throw new ForbiddenException('Bu guruh sizga tegishli emas');
      where.groupId = groupId;
    }

    return this.prisma.teacherAssignment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        group: { select: { id: true, name: true } },
        tests: { orderBy: { order: 'asc' } },
      },
    });
  }

  async getAssignment(teacherId: string, id: string) {
    const item = await this.prisma.teacherAssignment.findFirst({
      where: { id, deletedAt: null },
      include: {
        group: { select: { id: true, name: true, teacherId: true } },
        tests: { orderBy: { order: 'asc' } },
      },
    });

    if (!item) throw new NotFoundException('Material topilmadi');
    if (item.teacherId !== teacherId) {
      throw new ForbiddenException('Bu material sizga tegishli emas');
    }

    return item;
  }

  async createAssignment(teacherId: string, dto: CreateAssignmentDto) {
    const group = await this.prisma.group.findFirst({
      where: { id: dto.groupId, deletedAt: null },
    });
    if (!group) throw new NotFoundException('Guruh topilmadi');
    if (group.teacherId !== teacherId) {
      throw new ForbiddenException(
        "Siz faqat o'zingizga biriktirilgan guruhga material qo'sha olasiz",
      );
    }

    if (dto.type !== 'TEXT' && !dto.mediaUrl?.trim()) {
      throw new BadRequestException(
        "Media URL kiritilishi shart (TEXT bo'lmagan formatlar uchun)",
      );
    }

    if (dto.tests && dto.tests.length > 0) {
      for (const [i, t] of dto.tests.entries()) {
        if (!t.question?.trim()) {
          throw new BadRequestException(
            `${i + 1}-savol matni bo'sh bo'lishi mumkin emas`,
          );
        }
        if (t.options.filter((o) => o?.trim()).length < 2) {
          throw new BadRequestException(
            `${i + 1}-savolda kamida 2 ta variant kerak`,
          );
        }
      }
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const assignment = await tx.teacherAssignment.create({
        data: {
          title: dto.title.trim(),
          description: dto.description?.trim() || null,
          type: dto.type,
          category: dto.category,
          mediaUrl: dto.mediaUrl?.trim() || null,
          groupId: dto.groupId,
          teacherId,
        },
      });

      if (dto.tests && dto.tests.length > 0) {
        await tx.assignmentTest.createMany({
          data: dto.tests.map((t, i) => ({
            assignmentId: assignment.id,
            question: t.question.trim(),
            options: t.options.map((o) => o.trim()),
            correctOption: t.correctOption,
            order: i,
          })),
        });
      }

      return tx.teacherAssignment.findUnique({
        where: { id: assignment.id },
        include: {
          group: { select: { id: true, name: true } },
          tests: { orderBy: { order: 'asc' } },
        },
      });
    });

    await this.audit.log({
      actorId: teacherId,
      action: 'ASSIGNMENT_CREATE',
      targetType: 'TeacherAssignment',
      targetId: created!.id,
      newValue: {
        title: created!.title,
        groupId: created!.groupId,
        category: created!.category,
        testsCount: dto.tests?.length ?? 0,
      },
    });

    return created;
  }

  async updateAssignment(
    teacherId: string,
    id: string,
    dto: UpdateAssignmentDto,
  ) {
    const existing = await this.prisma.teacherAssignment.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Material topilmadi');
    if (existing.teacherId !== teacherId) {
      throw new ForbiddenException('Bu material sizga tegishli emas');
    }

    if (dto.groupId && dto.groupId !== existing.groupId) {
      const newGroup = await this.prisma.group.findFirst({
        where: { id: dto.groupId, deletedAt: null },
      });
      if (!newGroup) throw new NotFoundException('Yangi guruh topilmadi');
      if (newGroup.teacherId !== teacherId) {
        throw new ForbiddenException('Yangi guruh sizga tegishli emas');
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.teacherAssignment.update({
        where: { id },
        data: {
          ...(dto.title !== undefined && { title: dto.title.trim() }),
          ...(dto.description !== undefined && {
            description: dto.description?.trim() || null,
          }),
          ...(dto.type !== undefined && { type: dto.type }),
          ...(dto.category !== undefined && { category: dto.category }),
          ...(dto.mediaUrl !== undefined && {
            mediaUrl: dto.mediaUrl?.trim() || null,
          }),
          ...(dto.groupId !== undefined && { groupId: dto.groupId }),
        },
      });

      if (dto.tests !== undefined) {
        await tx.assignmentTest.deleteMany({ where: { assignmentId: id } });
        if (dto.tests.length > 0) {
          await tx.assignmentTest.createMany({
            data: dto.tests.map((t, i) => ({
              assignmentId: id,
              question: t.question.trim(),
              options: t.options.map((o) => o.trim()),
              correctOption: t.correctOption,
              order: i,
            })),
          });
        }
      }

      return tx.teacherAssignment.findUnique({
        where: { id },
        include: {
          group: { select: { id: true, name: true } },
          tests: { orderBy: { order: 'asc' } },
        },
      });
    });

    await this.audit.log({
      actorId: teacherId,
      action: 'ASSIGNMENT_UPDATE',
      targetType: 'TeacherAssignment',
      targetId: id,
      oldValue: { title: existing.title, groupId: existing.groupId },
      newValue: { title: updated!.title, groupId: updated!.groupId },
    });

    return updated;
  }

  async removeAssignment(teacherId: string, id: string) {
    const existing = await this.prisma.teacherAssignment.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Material topilmadi');
    if (existing.teacherId !== teacherId) {
      throw new ForbiddenException('Bu material sizga tegishli emas');
    }

    await this.prisma.teacherAssignment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.audit.log({
      actorId: teacherId,
      action: 'ASSIGNMENT_DELETE',
      targetType: 'TeacherAssignment',
      targetId: id,
      oldValue: { title: existing.title, groupId: existing.groupId },
    });

    return { ok: true };
  }
}