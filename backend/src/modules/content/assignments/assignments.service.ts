import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(teacherId: string, dto: any) {
    const { tests, ...assignmentData } = dto;
    return await this.prisma.assignment.create({
      data: {
        ...assignmentData,
        teacherId,
        tests: tests && tests.length > 0 ? {
          create: tests.map((t: any) => ({
            question: t.question,
            options: t.options,
            correctOption: t.correctOption,
          }))
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

  async update(id: string, teacherId: string, dto: any) {
    await this.findOne(id, teacherId); // Huquqni va mavjudligini tekshirish
    const { tests, ...assignmentData } = dto;

    // Agar yangi testlar kelsa, eskisini o'chirib yangisini qo'shish yoki to'g'ridan-to'g'ri yangilash mumkin
    if (tests) {
      await this.prisma.assignmentTest.deleteMany({
        where: { assignmentId: id },
      });
    }

    return await this.prisma.assignment.update({
      where: { id },
      data: {
        ...assignmentData,
        tests: tests && tests.length > 0 ? {
          create: tests.map((t: any) => ({
            question: t.question,
            options: t.options,
            correctOption: t.correctOption,
          }))
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