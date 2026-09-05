import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { CreateSubjectDto, UpdateSubjectDto } from './dto/subject.dto';

@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByCourse(courseId: string, user: CurrentUserPayload) {
    const isStudent = user.role === 'STUDENT';
    return this.prisma.subject.findMany({
      where: {
        courseId,
        deletedAt: null,
        ...(isStudent ? { status: 'PUBLISHED' } : {}),
      },
      orderBy: { order: 'asc' },
    });
  }

  async findOneFor(id: string, user: CurrentUserPayload) {
    const subject = await this.prisma.subject.findUnique({ where: { id } });
    if (!subject || subject.deletedAt) throw new NotFoundException('Fan topilmadi');
    if (user.role === 'STUDENT' && subject.status !== 'PUBLISHED') {
      throw new NotFoundException('Fan topilmadi');
    }
    return subject;
  }

  create(dto: CreateSubjectDto) {
    return this.prisma.subject.create({
      data: {
        courseId: dto.courseId,
        title: dto.title,
        description: dto.description,
        posterUrl: dto.posterUrl,
        order: dto.order ?? 0,
      },
    });
  }

  async update(id: string, dto: UpdateSubjectDto) {
    const existing = await this.prisma.subject.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundException('Fan topilmadi');
    return this.prisma.subject.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const existing = await this.prisma.subject.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundException('Fan topilmadi');
    await this.prisma.subject.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
