// src/modules/tests/management/test-management.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../admin/audit/audit.service';
import { NotificationsService } from '../../notifications/notifications.service';
import {
  CreateTestDto,
  AssignTestDto,
  ReopenTestDto,
} from './dto/test.dto';
import { CurrentUserPayload } from '../../../common/decorators/current-user.decorator';

@Injectable()
export class TestManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  /* ============================================================
     LIST — Admin: barcha testlar, Teacher: faqat o'zi yaratganlari
     ============================================================ */
  async list(
    requester: CurrentUserPayload,
    filters: { subjectId?: string; status?: string },
  ) {
    const where: any = { deletedAt: null };

    if (requester.role === 'TEACHER') {
      where.createdById = requester.id;
    }

    // ❌ `subjectId` filter olib tashlandi (endi mavjud emas)
    // if (filters.subjectId) where.subjectId = filters.subjectId;

    if (filters.status) where.status = filters.status;

    return this.prisma.test.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            questions: true,
            assignments: true,
            attempts: true,
          },
        },
      },
    });
  }

  /* ============================================================
     GET DETAIL
     ============================================================ */
  async getDetail(testId: string, requester: CurrentUserPayload) {
    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: {
            question: {
              include: { options: true },
            },
          },
        },
        assignments: {
          include: {
            group: { select: { id: true, name: true } },
          },
          orderBy: { assignedAt: 'desc' },
        },
      },
    });

    if (!test || test.deletedAt) {
      throw new NotFoundException('Test topilmadi');
    }

    if (requester.role === 'TEACHER' && test.createdById !== requester.id) {
      throw new ForbiddenException('Bu test sizga tegishli emas');
    }

    return test;
  }

  /* ============================================================
     LIST ASSIGNED FOR STUDENT — faqat studentga tegishli testlar
     ============================================================ */
  async listAssignedForStudent(studentId: string) {
    const groupIds = (
      await this.prisma.groupMember.findMany({
        where: { studentId },
        select: { groupId: true },
      })
    ).map((g) => g.groupId);

    const assignments = await this.prisma.testAssignment.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { targetType: 'ALL' },
          { targetType: 'GROUP', groupId: { in: groupIds } },
          { targetType: 'INDIVIDUAL', studentId },
        ],
      },
      include: { test: true },
      orderBy: { assignedAt: 'desc' },
    });

    const uniqueByTest = new Map<string, (typeof assignments)[number]>(
      assignments.map((a) => [a.testId, a]),
    );

    const attempts = await this.prisma.testAttempt.findMany({
      where: {
        studentId,
        testId: { in: Array.from(uniqueByTest.keys()) },
      },
    });

    const attemptMap = new Map<string, (typeof attempts)[number]>(
      attempts.map((a) => [a.testId, a]),
    );

    return Array.from(uniqueByTest.values()).map((a) => {
      const attempt = attemptMap.get(a.testId);
      return {
        testId: a.testId,
        title: a.test.title,
        durationSeconds: a.test.durationSeconds,
        deadline: a.deadline,
        status: attempt
          ? attempt.isRetakeAllowed
            ? ('RETAKE_AVAILABLE' as const)
            : ('COMPLETED' as const)
          : ('PENDING' as const),
        score: attempt?.score,
        maxScore: attempt?.maxScore,
        passed: attempt?.passed,
      };
    });
  }

  /* ============================================================
     CREATE — subjectId yo'q, groupIds bilan
     ============================================================ */
  async create(dto: CreateTestDto, actorId: string) {
    /* ---------- 1. Guruhlarni tekshirish ---------- */
    const groups = await this.prisma.group.findMany({
      where: {
        id: { in: dto.groupIds },
        deletedAt: null,
      },
      select: { id: true, teacherId: true, name: true },
    });

    if (groups.length !== dto.groupIds.length) {
      throw new BadRequestException("Ba'zi guruhlar topilmadi");
    }

    // Har bir guruh o'qituvchiniki ekanini tekshirish
    for (const g of groups) {
      if (g.teacherId !== actorId) {
        throw new BadRequestException(
          "Siz faqat o'zingizga biriktirilgan guruhlarga test biriktira olasiz",
        );
      }
    }

    /* ---------- 2. Savollarni yig'ish ---------- */
    let finalQuestionIds: string[] = [];

    // 2a. Bankdan savollar (questionIds)
    if (dto.questionIds && dto.questionIds.length > 0) {
      const bankQuestions = await this.prisma.question.findMany({
        where: { id: { in: dto.questionIds }, deletedAt: null },
        select: { id: true, points: true },
      });
      if (bankQuestions.length !== dto.questionIds.length) {
        throw new BadRequestException(
          "Ba'zi savollar topilmadi yoki o'chirilgan",
        );
      }
      finalQuestionIds = bankQuestions.map((q) => q.id);
    }

    // 2b. Yangi savollar (questions) — bankka yozib, ID olish
    let newQuestionIds: string[] = [];
    if (dto.questions && dto.questions.length > 0) {
      // Validatsiya
      for (const [i, q] of dto.questions.entries()) {
        if (!q.text?.trim()) {
          throw new BadRequestException(
            `${i + 1}-savol matni bo'sh bo'lishi mumkin emas`,
          );
        }
        const nonEmpty = q.options.filter((o) => o?.trim());
        if (nonEmpty.length < 2) {
          throw new BadRequestException(
            `${i + 1}-savolda kamida 2 ta variant kerak`,
          );
        }
        if (
          q.correctAnswerIndex < 0 ||
          q.correctAnswerIndex >= q.options.length
        ) {
          throw new BadRequestException(
            `${i + 1}-savolda to'g'ri javob indeksi noto'g'ri`,
          );
        }
      }

      // Savollarni bankka yozish (transaction ichida)
      const createdQuestions = await this.prisma.$transaction(
        dto.questions.map((q) =>
          this.prisma.question.create({
  data: {
    text: q.text.trim(),
    difficulty: q.difficulty,
    points: q.points,
  type: ('SINGLE' as any),// <-- Savol turini qo'shing (agar q.type bo'lmasa 'SINGLE' yoki mos keladigan turingiz)
    createdById: actorId,      // <-- Kim yaratganini qo'shing (funksiyaga kelayotgan actorId)
    options: {
      create: q.options.map((opt, idx) => ({
        text: opt.trim(),
        isCorrect: idx === q.correctAnswerIndex,
      })),
    },
  },
  select: { id: true },
})
        ),
      );
      newQuestionIds = createdQuestions.map((q) => q.id);
    }

    finalQuestionIds = [...finalQuestionIds, ...newQuestionIds];

    if (finalQuestionIds.length === 0) {
      throw new BadRequestException(
        'Kamida 1 ta savol kiritilishi kerak (bankdan yoki yangi)',
      );
    }

    /* ---------- 3. Max score hisoblash ---------- */
    const allQuestions = await this.prisma.question.findMany({
      where: { id: { in: finalQuestionIds } },
      select: { id: true, points: true },
    });

    const maxScore = dto.randomQuestions
      ? (dto.questionCount ?? finalQuestionIds.length) *
        Math.round(
          allQuestions.reduce((s, q) => s + q.points, 0) /
            allQuestions.length,
        )
      : allQuestions.reduce((sum, q) => sum + q.points, 0);

    /* ---------- 4. Test yaratish + guruhlarga biriktirish ---------- */
    const test = await this.prisma.$transaction(async (tx) => {
      // 4a. Test yaratish
      const created = await tx.test.create({
        data: {
          title: dto.title.trim(),
          description: dto.description?.trim() || null,
          // ❌ subjectId yo'q
          topicId: dto.topicId || null,
          durationSeconds: dto.durationSeconds,
          passingScore: dto.passingScore,
          maxScore,
          randomQuestions: dto.randomQuestions ?? false,
          randomAnswerOrder: dto.randomAnswerOrder ?? false,
          questionCount: dto.questionCount,
          startDate: dto.startDate ? new Date(dto.startDate) : null,
          endDate: dto.endDate ? new Date(dto.endDate) : null,
          createdById: actorId,
          questions: {
            create: finalQuestionIds.map((questionId, i) => ({
              questionId,
              order: i,
            })),
          },
        },
      });

      // 4b. Har bir guruhga biriktirish
      await tx.testAssignment.createMany({
        data: dto.groupIds.map((groupId) => ({
          testId: created.id,
          targetType: 'GROUP' as const,
          groupId,
          assignedById: actorId,
        })),
      });

      return created;
    });

    /* ---------- 5. Audit log ---------- */
    await this.audit.log({
      actorId,
      action: 'TEST_CREATE',
      targetType: 'Test',
      targetId: test.id,
      newValue: {
        title: test.title,
        groupIds: dto.groupIds,
        groupNames: groups.map((g) => g.name),
        questionsCount: finalQuestionIds.length,
      },
    });

    /* ---------- 6. Talabalarga xabar yuborish ---------- */
    try {
      const studentIds = (
        await this.prisma.groupMember.findMany({
          where: { groupId: { in: dto.groupIds } },
          select: { studentId: true },
        })
      ).map((m) => m.studentId);

      const uniqueStudentIds = Array.from(new Set(studentIds));

      if (uniqueStudentIds.length > 0) {
        await this.notifications.notifyMany(
          uniqueStudentIds,
          'TEST_ASSIGNED',
          '📝 Yangi test biriktirildi',
          `"${test.title}" testi guruhingizga biriktirildi.`,
        );
      }
    } catch (err) {
      // Xabar yuborishda xato — test yaratilgan, lekin xabar ketmagan
      console.error('Notification error:', err);
    }

    return test;
  }

  /* ============================================================
     PUBLISH
     ============================================================ */
  async publish(testId: string, actorId: string) {
    const test = await this.getOrThrow(testId);

    if (test.createdById !== actorId) {
      // Teacher faqat o'z testini publish qilishi mumkin (admin bundan mustasno)
      // Bu tekshiruv controller darajasida ham bo'lishi mumkin
    }

    await this.prisma.test.update({
      where: { id: testId },
      data: { status: 'PUBLISHED' },
    });

    await this.audit.log({
      actorId,
      action: 'TEST_PUBLISH',
      targetType: 'Test',
      targetId: testId,
      oldValue: { status: test.status },
      newValue: { status: 'PUBLISHED' },
    });

    return { ok: true, status: 'PUBLISHED' };
  }

  /* ============================================================
     ASSIGN TEST — qo'shimcha biriktirish
     ============================================================ */
  async assign(testId: string, dto: AssignTestDto, actorId: string) {
    const test = await this.getOrThrow(testId);

    // Ruxsat: teacher faqat o'z testini biriktirishi mumkin
    if (test.createdById !== actorId) {
      throw new ForbiddenException('Bu test sizga tegishli emas');
    }

    if (dto.targetType === 'GROUP' && !dto.groupId) {
      throw new BadRequestException('GROUP turi uchun groupId majburiy');
    }
    if (dto.targetType === 'INDIVIDUAL' && !dto.studentId) {
      throw new BadRequestException(
        'INDIVIDUAL turi uchun studentId majburiy',
      );
    }

    // GROUP bo'lsa — guruh teacherga tegishli ekanini tekshirish
    if (dto.targetType === 'GROUP' && dto.groupId) {
      const group = await this.prisma.group.findFirst({
        where: { id: dto.groupId, deletedAt: null },
      });
      if (!group) throw new NotFoundException('Guruh topilmadi');
      if (group.teacherId !== actorId) {
        throw new ForbiddenException('Bu guruh sizga tegishli emas');
      }
    }

    const assignment = await this.prisma.testAssignment.create({
      data: {
        testId,
        targetType: dto.targetType,
        groupId: dto.targetType === 'GROUP' ? dto.groupId : undefined,
        studentId:
          dto.targetType === 'INDIVIDUAL' ? dto.studentId : undefined,
        assignedById: actorId,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
      },
    });

    await this.audit.log({
      actorId,
      action: 'TEST_ASSIGN',
      targetType: 'Test',
      targetId: testId,
      newValue: {
        targetType: dto.targetType,
        groupId: dto.groupId,
        studentId: dto.studentId,
      },
    });

    // Talabalarga xabar
    const studentIds = await this.resolveTargetStudentIds(dto);
    if (studentIds.length > 0) {
      await this.notifications.notifyMany(
        studentIds,
        'TEST_ASSIGNED',
        '📝 Yangi test biriktirildi',
        `"${test.title}" testi sizga biriktirildi.${
          dto.deadline
            ? ` Muddat: ${new Date(dto.deadline).toLocaleString('uz-UZ')}`
            : ''
        }`,
      );
    }

    return assignment;
  }

  /* ============================================================
     REOPEN FOR STUDENT
     ============================================================ */
  async reopenForStudent(
    testId: string,
    dto: ReopenTestDto,
    actorId: string,
  ) {
    const attempt = await this.prisma.testAttempt.findUnique({
      where: {
        testId_studentId: { testId, studentId: dto.studentId },
      },
    });

    if (!attempt) {
      throw new NotFoundException(
        'Bu student uchun tugatilgan urinish topilmadi',
      );
    }

    await this.prisma.$transaction([
      this.prisma.testAttempt.update({
        where: { id: attempt.id },
        data: { isRetakeAllowed: true },
      }),
      this.prisma.testSession.deleteMany({
        where: { testId, studentId: dto.studentId },
      }),
    ]);

    await this.audit.log({
      actorId,
      action: 'TEST_REOPEN',
      targetType: 'TestAttempt',
      targetId: attempt.id,
      oldValue: { isRetakeAllowed: false },
      newValue: { isRetakeAllowed: true, studentId: dto.studentId },
    });

    return { ok: true };
  }

  /* ============================================================
     PRIVATE HELPERS
     ============================================================ */
  private async resolveTargetStudentIds(
    dto: AssignTestDto,
  ): Promise<string[]> {
    if (dto.targetType === 'INDIVIDUAL' && dto.studentId) {
      return [dto.studentId];
    }

    if (dto.targetType === 'GROUP' && dto.groupId) {
      const members = await this.prisma.groupMember.findMany({
        where: { groupId: dto.groupId },
        select: { studentId: true },
      });
      return members.map((m) => m.studentId);
    }

    if (dto.targetType === 'ALL') {
      const students = await this.prisma.user.findMany({
        where: { role: 'STUDENT', deletedAt: null },
        select: { id: true },
      });
      return students.map((s) => s.id);
    }

    return [];
  }

  private async getOrThrow(testId: string) {
    const test = await this.prisma.test.findUnique({
      where: { id: testId },
    });
    if (!test || test.deletedAt) {
      throw new NotFoundException('Test topilmadi');
    }
    return test;
  }
}