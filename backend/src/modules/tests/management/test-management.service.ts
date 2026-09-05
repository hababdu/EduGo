import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../admin/audit/audit.service';
import { CreateTestDto, AssignTestDto, ReopenTestDto } from './dto/test.dto';

@Injectable()
export class TestManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

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

    return assignment;
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
