import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateQuestionDto, QuestionFilterDto } from './dto/question.dto';

@Injectable()
export class QuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: QuestionFilterDto) {
    return this.prisma.question.findMany({
      where: {
        deletedAt: null,
        subjectId: filter.subjectId,
        topicId: filter.topicId,
        difficulty: filter.difficulty as any,
      },
      include: { options: { select: { id: true, text: true, order: true } } }, // isCorrect BERILMAYDI
      orderBy: { id: 'desc' },
    });
  }

  /**
   * Admin/Teacher ko'rinishida — TO'LIQ (isCorrect bilan), chunki tahrirlash uchun kerak.
   * Bu funksiyani hech qachon studentga qaratilgan endpointda chaqirmang.
   */
  async getFullForEditing(id: string) {
    const question = await this.prisma.question.findUnique({
      where: { id },
      include: { options: true },
    });
    if (!question || question.deletedAt) throw new NotFoundException('Savol topilmadi');
    return question;
  }

  async create(dto: CreateQuestionDto, actorId: string) {
    if (dto.type !== 'TEXT_ANSWER') {
      const correctCount = dto.options.filter((o) => o.isCorrect).length;
      if (correctCount === 0) {
        throw new BadRequestException('Kamida bitta to\'g\'ri javob belgilanishi shart');
      }
      if (dto.type === 'SINGLE_CHOICE' && correctCount > 1) {
        throw new BadRequestException('SINGLE_CHOICE turida faqat bitta to\'g\'ri javob bo\'lishi mumkin');
      }
    }

    return this.prisma.question.create({
      data: {
        type: dto.type,
        difficulty: dto.difficulty ?? 'MEDIUM',
        text: dto.text,
        explanation: dto.explanation,
        points: dto.points ?? 1,
        subjectId: dto.subjectId,
        topicId: dto.topicId,
        tags: dto.tags ?? [],
        createdById: actorId,
        options: {
          create: dto.options.map((o, i) => ({
            text: o.text,
            isCorrect: o.isCorrect,
            order: i,
          })),
        },
      },
      include: { options: true },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.question.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundException('Savol topilmadi');
    // Soft delete — bu savol ishlatilgan eski testlar buzilmasligi uchun (64-band)
    await this.prisma.question.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
