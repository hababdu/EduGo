import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';

@Injectable()
export class AssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  /** O'qituvchi faqat O'Z guruhiga material qo'sha oladi (admin — istalganiga). Avval guruh egaligi tekshirilmas edi. */
  private async assertGroupAccess(groupId: string, actor: CurrentUserPayload) {
    const group = await this.prisma.group.findFirst({ where: { id: groupId, deletedAt: null }, select: { teacherId: true } });
    if (!group) throw new NotFoundException('Guruh topilmadi');
    if (actor.role === 'TEACHER' && group.teacherId !== actor.id) {
      throw new ForbiddenException('Bu guruh sizga tegishli emas');
    }
  }

  async create(actor: CurrentUserPayload, dto: CreateAssignmentDto) {
    await this.assertGroupAccess(dto.groupId, actor);
    const { tests, title, description, type, category, mediaUrl, groupId } = dto;
    return await this.prisma.assignment.create({
      data: {
        title, description, type, category, mediaUrl, groupId, // faqat oq ro'yxatdagi maydonlar
        teacherId: actor.id,
        tests: tests && tests.length > 0 ? {
          create: tests.map((t) => ({
            question: t.question,
            options: t.options,
            correctOption: t.correctOption,
          })),
        } : undefined,
      },
      include: { tests: true },
    });
  }

  async findAllForTeacher(teacherId: string, groupId?: string) {
    return await this.prisma.assignment.findMany({
      where: {
        teacherId,
        ...(groupId ? { groupId } : {}),
      },
      include: { tests: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, teacherId: string) {
    const item = await this.prisma.assignment.findUnique({
      where: { id },
      include: { tests: true },
    });
    if (!item) throw new NotFoundException('Material topilmadi');

    if (item.teacherId !== teacherId) {
      throw new ForbiddenException('Bu materialga ruxsat yoq');
    }
    return item;
  }

  async update(id: string, actor: CurrentUserPayload, dto: UpdateAssignmentDto) {
    await this.findOne(id, actor.id); // mavjudlik va egalik
    if (dto.groupId) await this.assertGroupAccess(dto.groupId, actor);

    // Faqat oq ro'yxatdagi maydonlar (teacherId/id/createdAt kabilarni mijoz o'zgartira olmaydi)
    const { tests, title, description, type, category, mediaUrl, groupId } = dto;
    const data: Record<string, unknown> = { title, description, type, category, mediaUrl, groupId };
    for (const k of Object.keys(data)) if (data[k] === undefined) delete data[k];

    // Agar yangi testlar kelsa, eskisini o'chirib yangisini qo'shamiz
    if (tests) {
      await this.prisma.assignmentTest.deleteMany({ where: { assignmentId: id } });
    }

    return await this.prisma.assignment.update({
      where: { id },
      data: {
        ...data,
        tests: tests && tests.length > 0 ? {
          create: tests.map((t) => ({
            question: t.question,
            options: t.options,
            correctOption: t.correctOption,
          })),
        } : undefined,
      },
      include: { tests: true },
    });
  }

  async remove(id: string, teacherId: string) {
    await this.findOne(id, teacherId);
    return await this.prisma.assignment.delete({
      where: { id },
    });
  }
}
