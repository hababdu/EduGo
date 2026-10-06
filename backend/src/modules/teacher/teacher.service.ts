// src/modules/teacher/teacher.service.ts
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
import { NotificationsService } from '../notifications/notifications.service';
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
    private readonly notifications: NotificationsService,
  ) {}

  /* ============================================================
     OVERVIEW
     ============================================================ */
  async getOverview(teacherId: string) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const groups = await this.prisma.group.findMany({
      where: { teacherId, deletedAt: null },
      include: { members: { select: { studentId: true } } },
    });

    const studentIds = Array.from(
      new Set(groups.flatMap((g) => g.members.map((m) => m.studentId))),
    );

    const attemptsWhere: Prisma.TestAttemptWhereInput = {
      studentId: { in: studentIds },
      completedAt: { lte: new Date() },
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
        : Promise.resolve({ _count: { _all: 0 }, _avg: { percent: 0 } }),

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
      charts: { dailyActivity },
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

  private async getDailyActivity(studentIds: string[], from: Date) {
    const where: Prisma.TestAttemptWhereInput = {
      studentId: { in: studentIds },
      completedAt: { gte: from },
    };

    const attempts = await this.prisma.testAttempt.findMany({
      where,
      select: { completedAt: true, percent: true, studentId: true },
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
     GROUP STUDENTS
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
     TEACHER GROUPS
     ============================================================ */
  async listMyGroups(teacherId: string) {
    return this.prisma.group.findMany({
      where: { teacherId, deletedAt: null },
      include: {
        _count: {
          select: { members: true, assignments: true },
        },
      },
    });
  }

  async getMyGroup(teacherId: string, groupId: string) {
    const group = await this.prisma.group.findFirst({
      where: { id: groupId, teacherId, deletedAt: null },
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
     ASSIGNMENTS — yordamchilar
     ============================================================ */
  private static readonly ASSIGNMENT_INCLUDE = {
    group: { select: { id: true, name: true } },
    tests: { orderBy: { order: 'asc' as const } },
    files: {
      orderBy: { order: 'asc' as const },
      select: { id: true, kind: true, fileName: true, mimeType: true, sizeBytes: true, order: true },
    },
  };

  private static readonly MAX_UPLOAD_FOR_INLINE = 20 * 1024 * 1024;

  private withPreview<T extends { files?: { sizeBytes: number }[] }>(a: T) {
    if (!a.files) return a;
    return {
      ...a,
      files: a.files.map((f) => ({ ...f, previewable: f.sizeBytes <= TeacherService.MAX_UPLOAD_FOR_INLINE })),
    };
  }

  private assertHttpUrl(url?: string | null) {
    if (url && !/^https?:\/\/[^\s]+$/i.test(url.trim())) {
      throw new BadRequestException("Havola http:// yoki https:// bilan boshlanishi kerak");
    }
  }

  private parseDueAt(v?: string | null): Date | null | undefined {
    if (v === undefined) return undefined;
    if (v === null || v === '') return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) throw new BadRequestException("Muddat noto'g'ri");
    return d;
  }

  /** Material e'lon qilinganda guruh o'quvchilariga bildirishnoma (xato asosiy amalni buzmaydi). */
  private async notifyPublished(assignment: { id: string; title: string; groupId: string; dueAt: Date | null }) {
    try {
      const members = await this.prisma.groupMember.findMany({
        where: { groupId: assignment.groupId },
        select: { studentId: true },
      });
      if (members.length === 0) return;
      const due = assignment.dueAt ? ` Muddat: ${assignment.dueAt.toLocaleDateString('uz-UZ')}.` : '';
      await this.notifications.notifyMany(
        members.map((m) => m.studentId),
        'NEW_LESSON',
        'Yangi material',
        `"${assignment.title}" materiali qo'shildi.${due}`,
      );
    } catch {
      /* bildirishnoma — best-effort */
    }
  }

  /** Ko'rilganlik: har bir material uchun nechta o'quvchi ochgan / guruhda nechta o'quvchi bor. */
  private async viewStats(items: { id: string; groupId: string }[]) {
    if (items.length === 0) return new Map<string, { viewed: number; total: number }>();
    const [views, members] = await Promise.all([
      this.prisma.materialView.groupBy({
        by: ['assignmentId'],
        where: { assignmentId: { in: items.map((i) => i.id) } },
        _count: { _all: true },
      }),
      this.prisma.groupMember.groupBy({
        by: ['groupId'],
        where: { groupId: { in: Array.from(new Set(items.map((i) => i.groupId))) } },
        _count: { _all: true },
      }),
    ]);
    const viewMap = new Map(views.map((v) => [v.assignmentId, v._count._all]));
    const memMap = new Map(members.map((m) => [m.groupId, m._count._all]));
    return new Map(
      items.map((i) => [i.id, { viewed: viewMap.get(i.id) ?? 0, total: memMap.get(i.groupId) ?? 0 }]),
    );
  }

  /* ============================================================
     ASSIGNMENTS — LIST
     ============================================================ */
  async listAssignments(teacherId: string, groupId?: string) {
    // ✅ MUHIM: `teacherId` filter orqali faqat o'z materiallari
    const where: Prisma.TeacherAssignmentWhereInput = {
      teacherId,
      deletedAt: null,
    };

    if (groupId) {
      const group = await this.prisma.group.findFirst({
        where: { id: groupId, teacherId, deletedAt: null },
      });
      if (!group) {
        throw new ForbiddenException('Bu guruh sizga tegishli emas');
      }
      where.groupId = groupId;
    }

    const items = await this.prisma.teacherAssignment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        group: { select: { id: true, name: true } },
        tests: { select: { id: true, title: true } },
        files: {
          orderBy: { order: 'asc' },
          select: { id: true, kind: true, fileName: true, mimeType: true, sizeBytes: true, order: true },
        },
      },
    });
    const stats = await this.viewStats(items);
    return items.map((a) => ({ ...this.withPreview(a), stats: stats.get(a.id) }));
  }

  /* ============================================================
     ASSIGNMENTS — GET ONE
     ============================================================ */
  async getAssignment(teacherId: string, id: string) {
    const item = await this.prisma.teacherAssignment.findFirst({
      where: { id, deletedAt: null },
      include: {
        ...TeacherService.ASSIGNMENT_INCLUDE,
        group: { select: { id: true, name: true, teacherId: true } },
      },
    });

    if (!item) throw new NotFoundException('Material topilmadi');
    if (item.teacherId !== teacherId) {
      throw new ForbiddenException('Bu material sizga tegishli emas');
    }

    // Kim ochgan / kim ochmagan
    const [members, views] = await Promise.all([
      this.prisma.groupMember.findMany({
        where: { groupId: item.groupId },
        select: { student: { select: { id: true, firstName: true, lastName: true, username: true } } },
      }),
      this.prisma.materialView.findMany({
        where: { assignmentId: id },
        select: { studentId: true, firstViewedAt: true, lastViewedAt: true },
      }),
    ]);
    const viewMap = new Map(views.map((v) => [v.studentId, v]));
    const viewers = members.map((m) => ({
      studentId: m.student.id,
      firstName: m.student.firstName,
      lastName: m.student.lastName,
      username: m.student.username,
      viewedAt: viewMap.get(m.student.id)?.firstViewedAt ?? null,
    }));

    return {
      ...this.withPreview(item),
      stats: { viewed: viewers.filter((v) => v.viewedAt).length, total: viewers.length },
      viewers,
    };
  }

  /* ============================================================
     ASSIGNMENTS — CREATE (bir yoki bir nechta guruhga)
     ============================================================ */
  async createAssignment(teacherId: string, dto: CreateAssignmentDto) {
    const groupIds = Array.from(new Set(dto.groupIds?.length ? dto.groupIds : dto.groupId ? [dto.groupId] : []));
    if (groupIds.length === 0) throw new BadRequestException('Kamida bitta guruh tanlang');

    const groups = await this.prisma.group.findMany({
      where: { id: { in: groupIds }, deletedAt: null },
      select: { id: true, teacherId: true },
    });
    if (groups.length !== groupIds.length) throw new NotFoundException('Guruh topilmadi');
    if (groups.some((g) => g.teacherId !== teacherId)) {
      throw new ForbiddenException("Siz faqat o'zingizga biriktirilgan guruhga material qo'sha olasiz");
    }

    const fileIds = Array.from(new Set(dto.fileIds ?? []));
    const files = fileIds.length
      ? await this.prisma.materialFile.findMany({
          where: { id: { in: fileIds }, uploaderId: teacherId, assignmentId: null },
        })
      : [];
    if (files.length !== fileIds.length) {
      throw new BadRequestException('Fayl topilmadi yoki allaqachon biriktirilgan');
    }
    // Foydalanuvchi tanlagan tartibda
    files.sort((a, b) => fileIds.indexOf(a.id) - fileIds.indexOf(b.id));

    this.assertHttpUrl(dto.mediaUrl);
    const status = dto.status ?? 'PUBLISHED';
    const type = files.length > 0 ? files[0].kind : dto.type;
    if (status === 'PUBLISHED' && type !== 'TEXT' && files.length === 0 && !dto.mediaUrl?.trim()) {
      throw new BadRequestException(
        "Fayl yuklang yoki havola kiriting (matndan boshqa format uchun). Tayyor bo'lmasa — qoralama sifatida saqlang",
      );
    }
    this.validateTests(dto.tests);
    const dueAt = this.parseDueAt(dto.dueAt) ?? null;
    const publishedAt = status === 'PUBLISHED' ? new Date() : null;

    const created = await this.prisma.$transaction(async (tx) => {
      const out: { id: string; title: string; groupId: string; dueAt: Date | null }[] = [];
      for (const [gi, groupId] of groupIds.entries()) {
        const a = await tx.teacherAssignment.create({
          data: {
            title: dto.title.trim(),
            description: dto.description?.trim() || null,
            type,
            category: dto.category,
            mediaUrl: dto.mediaUrl?.trim() || null,
            groupId,
            teacherId,
            status,
            publishedAt,
            dueAt,
          },
        });

        if (dto.tests && dto.tests.length > 0) {
          await tx.assignmentTest.createMany({
            data: dto.tests.map((t, i) => ({
              assignmentId: a.id,
              question: t.question.trim(),
              options: t.options.map((o) => o.trim()),
              correctOption: t.correctOption,
              order: i,
            })),
          });
        }

        if (files.length > 0) {
          if (gi === 0) {
            // Birinchi guruh — asl fayllarni biriktiramiz
            for (const [fi, f] of files.entries()) {
              await tx.materialFile.update({ where: { id: f.id }, data: { assignmentId: a.id, order: fi } });
            }
          } else {
            // Qolgan guruhlar — bir xil Telegram faylidan nusxa (qayta yuklash yo'q)
            await tx.materialFile.createMany({
              data: files.map((f, fi) => ({
                assignmentId: a.id,
                uploaderId: teacherId,
                kind: f.kind,
                fileName: f.fileName,
                mimeType: f.mimeType,
                sizeBytes: f.sizeBytes,
                tgFileId: f.tgFileId,
                tgMessageId: f.tgMessageId,
                order: fi,
              })),
            });
          }
        }
        out.push({ id: a.id, title: a.title, groupId, dueAt });
      }
      return out;
    });

    for (const a of created) {
      await this.audit.log({
        actorId: teacherId,
        action: 'ASSIGNMENT_CREATE',
        targetType: 'TeacherAssignment',
        targetId: a.id,
        newValue: {
          title: a.title,
          groupId: a.groupId,
          category: dto.category,
          status,
          filesCount: files.length,
          testsCount: dto.tests?.length ?? 0,
        },
      });
      if (status === 'PUBLISHED') void this.notifyPublished(a);
    }

    const result = await this.prisma.teacherAssignment.findMany({
      where: { id: { in: created.map((c) => c.id) } },
      include: TeacherService.ASSIGNMENT_INCLUDE,
    });
    return result.map((a) => this.withPreview(a));
  }

  private validateTests(tests?: { question: string; options: string[] }[]) {
    if (!tests) return;
    for (const [i, t] of tests.entries()) {
      if (!t.question?.trim()) {
        throw new BadRequestException(`${i + 1}-savol matni bo'sh bo'lishi mumkin emas`);
      }
      if (t.options.filter((o) => o?.trim()).length < 2) {
        throw new BadRequestException(`${i + 1}-savolda kamida 2 ta variant kerak`);
      }
    }
  }

  /* ============================================================
     ASSIGNMENTS — UPDATE
     ============================================================ */
  async updateAssignment(teacherId: string, id: string, dto: UpdateAssignmentDto) {
    const existing = await this.prisma.teacherAssignment.findFirst({
      where: { id, deletedAt: null },
      include: { files: { select: { id: true } } },
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

    this.assertHttpUrl(dto.mediaUrl);
    this.validateTests(dto.tests);
    const dueAt = this.parseDueAt(dto.dueAt);

    // Fayllar: to'liq yangi ro'yxat (tartib bilan). Yangi fayllar faqat o'zining biriktirilmagan yuklamalari bo'lishi mumkin.
    let newFileIds: string[] | undefined;
    if (dto.fileIds) {
      newFileIds = Array.from(new Set(dto.fileIds));
      const currentIds = new Set(existing.files.map((f) => f.id));
      const toAttach = newFileIds.filter((f) => !currentIds.has(f));
      if (toAttach.length) {
        const ok = await this.prisma.materialFile.count({
          where: { id: { in: toAttach }, uploaderId: teacherId, assignmentId: null },
        });
        if (ok !== toAttach.length) {
          throw new BadRequestException('Fayl topilmadi yoki allaqachon biriktirilgan');
        }
      }
    }

    const becomesPublished = dto.status === 'PUBLISHED' && existing.status !== 'PUBLISHED';

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.teacherAssignment.update({
        where: { id },
        data: {
          ...(dto.title !== undefined && { title: dto.title.trim() }),
          ...(dto.description !== undefined && { description: dto.description?.trim() || null }),
          ...(dto.type !== undefined && { type: dto.type }),
          ...(dto.category !== undefined && { category: dto.category }),
          ...(dto.mediaUrl !== undefined && { mediaUrl: dto.mediaUrl?.trim() || null }),
          ...(dto.groupId !== undefined && { groupId: dto.groupId }),
          ...(dto.status !== undefined && { status: dto.status }),
          ...(becomesPublished && { publishedAt: new Date() }),
          ...(dueAt !== undefined && { dueAt }),
        },
      });

      if (newFileIds) {
        await tx.materialFile.deleteMany({
          where: { assignmentId: id, id: { notIn: newFileIds } },
        });
        for (const [i, fid] of newFileIds.entries()) {
          await tx.materialFile.updateMany({
            where: { id: fid, OR: [{ assignmentId: id }, { assignmentId: null, uploaderId: teacherId }] },
            data: { assignmentId: id, order: i },
          });
        }
      }

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
        include: TeacherService.ASSIGNMENT_INCLUDE,
      });
    });

    await this.audit.log({
      actorId: teacherId,
      action: 'ASSIGNMENT_UPDATE',
      targetType: 'TeacherAssignment',
      targetId: id,
      oldValue: { title: existing.title, groupId: existing.groupId, status: existing.status },
      newValue: { title: updated!.title, groupId: updated!.groupId, status: updated!.status },
    });

    if (becomesPublished) {
      void this.notifyPublished({
        id,
        title: updated!.title,
        groupId: updated!.groupId,
        dueAt: updated!.dueAt,
      });
    }

    return this.withPreview(updated!);
  }

  /* ============================================================
     ASSIGNMENTS — DELETE
     ============================================================ */
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
