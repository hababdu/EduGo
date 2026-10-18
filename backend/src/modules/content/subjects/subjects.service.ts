import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { canEditCreatedBy, visibleCreatedBy } from '../../../common/org-scope';
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
        course: { deletedAt: null, ...visibleCreatedBy(user) },
        ...(isStudent ? { status: 'PUBLISHED' } : {}),
      },
      orderBy: { order: 'asc' },
    });
  }

  async findOneFor(id: string, user: CurrentUserPayload) {
    const subject = await this.prisma.subject.findFirst({ where: { id, course: visibleCreatedBy(user) } });
    if (!subject || subject.deletedAt) throw new NotFoundException('Fan topilmadi');
    if (user.role === 'STUDENT' && subject.status !== 'PUBLISHED') {
      throw new NotFoundException('Fan topilmadi');
    }
    return subject;
  }

  /** Yozish: faqat o'z maktabi kursi (platforma kursini maktab xodimi o'zgartira olmaydi). */
  private async assertCourseWritable(courseId: string, user: CurrentUserPayload) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: { createdBy: { select: { organizationId: true } } },
    });
    if (!course || course.deletedAt) throw new NotFoundException('Kurs topilmadi');
    if (!canEditCreatedBy(user, course.createdBy?.organizationId)) {
      throw new ForbiddenException("Bu kurs boshqa maktabga yoki platformaga tegishli");
    }
  }

  async create(dto: CreateSubjectDto, user: CurrentUserPayload) {
    await this.assertCourseWritable(dto.courseId, user);
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

  async update(id: string, dto: UpdateSubjectDto, user: CurrentUserPayload) {
    const existing = await this.prisma.subject.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundException('Fan topilmadi');
    await this.assertCourseWritable(existing.courseId, user);
    return this.prisma.subject.update({ where: { id }, data: dto });
  }

  async remove(id: string, user: CurrentUserPayload) {
    const existing = await this.prisma.subject.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundException('Fan topilmadi');
    await this.assertCourseWritable(existing.courseId, user);
    await this.prisma.subject.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
