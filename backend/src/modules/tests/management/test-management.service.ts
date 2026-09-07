import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../admin/audit/audit.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { CreateTestDto, AssignTestDto, ReopenTestDto } from './dto/test.dto';
import { CurrentUserPayload } from '../../../common/decorators/current-user.decorator';

@Injectable()
export class TestManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Admin — barcha testlar. Teacher — FAQAT o'zi yaratgan testlar (44-band). */
  async list(requester: CurrentUserPayload, filters: { subjectId?: string; status?: string }) {
    const where: any = { deletedAt: null };
    if (requester.role === 'TEACHER') {
      where.createdById = requester.id;
    }
    if (filters.subjectId) where.subjectId = filters.subjectId;
    if (filters.status) where.status = filters.status;

    return this.prisma.test.findMany({
      where,
      orderBy: { id: 'desc' },
      include: {
        subject: { select: { title: true } },
        _count: { select: { questions: true, assignments: true, attempts: true } },
      },
    });
  }

  async getDetail(testId: string, requester: CurrentUserPayload) {
    const test = await this.prisma.test.findUnique({
      where: { id: testId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: { question: { include: { options: true } } },
        },
        assignments: {
          include: { group: { select: { name: true } } },
          orderBy: { assignedAt: 'desc' },
        },
      },
    });
    if (!test || test.deletedAt) throw new NotFoundException('Test topilmadi');

    if (requester.role === 'TEACHER' && test.createdById !== requester.id) {
      throw new BadRequestException('Bu test sizga tegishli emas');
    }

    return test;
  }

  /** Student uchun — o'ziga tayinlangan barcha testlar, holati bilan */
  async listAssignedForStudent(studentId: string) {
    const groupIds = (
      await this.prisma.groupMember.findMany({ where: { studentId }, select: { groupId: true } })
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

    // Bir xil test bir necha marta tayinlangan bo'lishi mumkin — testId bo'yicha unique qilamiz
    const uniqueByTest = new Map<string, (typeof assignments)[number]>(
      assignments.map((a) => [a.testId, a]),
    );

    const attempts = await this.prisma.testAttempt.findMany({
      where: { studentId, testId: { in: Array.from(uniqueByTest.keys()) } },
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

  async create(dto: CreateTestDto, actorId: string) {
    const questions = await this.prisma.question.findMany({
      where: { id: { in: dto.questionIds }, deletedAt: null },
    });
    if (questions.length !== dto.questionIds.length) {
      throw new BadRequestException('Ba\'zi savollar topilmadi yoki o\'chirilgan');
    }

    const maxScore = dto.randomQuestions
      ? // random bo'lsa: tanlanadigan savollar sonining o'rtacha ball taxminiy hisobi
        (dto.questionCount ?? dto.questionIds.length) *
        Math.round(questions.reduce((s, q) => s + q.points, 0) / questions.length)
      : questions.reduce((sum, q) => sum + q.points, 0);

    const test = await this.prisma.test.create({
      data: {
        title: dto.title,
        description: dto.description,
        subjectId: dto.subjectId,
        topicId: dto.topicId,
        durationSeconds: dto.durationSeconds,
        passingScore: dto.passingScore,
        maxScore,
        randomQuestions: dto.randomQuestions ?? false,
        randomAnswerOrder: dto.randomAnswerOrder ?? false,
        questionCount: dto.questionCount,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        createdById: actorId,
        questions: {
          create: dto.questionIds.map((questionId, i) => ({ questionId, order: i })),
        },
      },
    });

    await this.audit.log({
      actorId,
      action: 'TEST_CREATE',
      targetType: 'Test',
      targetId: test.id,
      newValue: { title: test.title },
    });

    return test;
  }

  async publish(testId: string, actorId: string) {
    const test = await this.getOrThrow(testId);
    await this.prisma.test.update({ where: { id: testId }, data: { status: 'PUBLISHED' } });
    await this.audit.log({
      actorId,
      action: 'TEST_PUBLISH',
      targetType: 'Test',
      targetId: testId,
      oldValue: { status: test.status },
      newValue: { status: 'PUBLISHED' },
    });
  }

  /** 46-band — TEST ASSIGNMENT */
  async assign(testId: string, dto: AssignTestDto, actorId: string) {
    await this.getOrThrow(testId);

    if (dto.targetType === 'GROUP' && !dto.groupId) {
      throw new BadRequestException('GROUP turi uchun groupId majburiy');
    }
    if (dto.targetType === 'INDIVIDUAL' && !dto.studentId) {
      throw new BadRequestException('INDIVIDUAL turi uchun studentId majburiy');
    }

    const assignment = await this.prisma.testAssignment.create({
      data: {
        testId,
        targetType: dto.targetType,
        groupId: dto.targetType === 'GROUP' ? dto.groupId : undefined,
        studentId: dto.targetType === 'INDIVIDUAL' ? dto.studentId : undefined,
        assignedById: actorId,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
      },
    });

    await this.audit.log({
      actorId,
      action: 'TEST_ASSIGN',
      targetType: 'Test',
      targetId: testId,
      newValue: { targetType: dto.targetType, groupId: dto.groupId, studentId: dto.studentId },
    });

    // 50-band — "📝 Yangi test biriktirildi." bildirishnomasi
    const test = await this.prisma.test.findUnique({ where: { id: testId } });
    const studentIds = await this.resolveTargetStudentIds(dto);
    if (test && studentIds.length > 0) {
      await this.notifications.notifyMany(
        studentIds,
        'TEST_ASSIGNED',
        '📝 Yangi test biriktirildi',
        `"${test.title}" testi sizga biriktirildi.${dto.deadline ? ` Muddat: ${new Date(dto.deadline).toLocaleString('uz-UZ')}` : ''}`,
      );
    }

    return assignment;
  }

  private async resolveTargetStudentIds(dto: AssignTestDto): Promise<string[]> {
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

  /**
   * 26-band — ADMIN TESTNI QAYTA OCHISHI.
   * "Shunda test faqat shu student uchun qayta ochiladi. Boshqa studentlarga
   * ta'sir qilmasin." — shuning uchun bu FAQAT shu (testId, studentId)
   * juftligiga tegadi.
   */
  async reopenForStudent(testId: string, dto: ReopenTestDto, actorId: string) {
    const attempt = await this.prisma.testAttempt.findUnique({
      where: { testId_studentId: { testId, studentId: dto.studentId } },
    });
    if (!attempt) {
      throw new NotFoundException('Bu student uchun tugatilgan urinish topilmadi');
    }

    await this.prisma.$transaction([
      this.prisma.testAttempt.update({
        where: { id: attempt.id },
        data: { isRetakeAllowed: true },
      }),
      // Eski sessiyani ham tozalaymiz — shunda student qaytadan "start" qila oladi
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
  }

  private async getOrThrow(testId: string) {
    const test = await this.prisma.test.findUnique({ where: { id: testId } });
    if (!test || test.deletedAt) throw new NotFoundException('Test topilmadi');
    return test;
  }
}
