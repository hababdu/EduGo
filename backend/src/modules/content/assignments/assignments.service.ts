import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(teacherId: string, dto: any) {
    return await this.prisma.assignment.create({
      data: {
        title: dto.title,
        description: dto.description,
        type: dto.type,
        category: dto.category,
        mediaUrl: dto.mediaUrl,
        groupId: dto.groupId,
        teacherId: teacherId,
      },
    });
  }

  async findAll(groupId?: string) {
    return await this.prisma.assignment.findMany({
      where: groupId ? { groupId } : undefined,
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.assignment.findUnique({
      where: { id },
    });
    if (!item) throw new NotFoundException('Material topilmadi');
    return item;
  }

  async update(id: string, dto: any) {
    return await this.prisma.assignment.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    return await this.prisma.assignment.delete({
      where: { id },
    });
  }
}