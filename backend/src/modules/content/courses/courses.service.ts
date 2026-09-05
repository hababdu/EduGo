import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { CreateCourseDto, UpdateCourseDto } from './dto/course.dto';
import { AuditService } from '../../admin/audit/audit.service';

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * 86-band: "O'quvchi faqat Published contentni ko'rsin."
   * Admin/Teacher esa DRAFT/REVIEW holatidagilarni ham ko'rishi kerak
   * (o'zi tayyorlayotgan kontentni tekshirish uchun).
   */
  async findAllFor(user: CurrentUserPayload) {
    const isStudent = user.role === 'STUDENT';
    return this.prisma.course.findMany({
      where: {
        deletedAt: null,
        ...(isStudent ? { status: 'PUBLISHED' } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneFor(id: string, user: CurrentUserPayload) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course || course.deletedAt) {
      throw new NotFoundException('Kurs topilmadi');
    }
    if (user.role === 'STUDENT' && course.status !== 'PUBLISHED') {
      throw new NotFoundException('Kurs topilmadi'); // student uchun DRAFT "yo'q" bo'lib ko'rinadi
    }
    return course;
  }

  async create(dto: CreateCourseDto, actorId: string) {
    const course = await this.prisma.course.create({
      data: {
        title: dto.title,
        description: dto.description,
        posterUrl: dto.posterUrl,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        createdById: actorId,
      },
    });

    await this.audit.log({
      actorId,
      action: 'COURSE_CREATE',
      targetType: 'Course',
      targetId: course.id,
      newValue: { title: course.title },
    });

    return course;
  }

  async update(id: string, dto: UpdateCourseDto, actorId: string) {
    const existing = await this.prisma.course.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Kurs topilmadi');
    }

    const updated = await this.prisma.course.update({ where: { id }, data: dto });

    await this.audit.log({
      actorId,
      action: 'COURSE_UPDATE',
      targetType: 'Course',
      targetId: id,
      oldValue: existing,
      newValue: dto,
    });

    return updated;
  }

  /** 64-band — SOFT DELETE, tarixiy natijalar buzilmasligi uchun */
  async remove(id: string, actorId: string) {
    const existing = await this.prisma.course.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Kurs topilmadi');
    }

    await this.prisma.course.update({ where: { id }, data: { deletedAt: new Date() } });

    await this.audit.log({
      actorId,
      action: 'COURSE_DELETE',
      targetType: 'Course',
      targetId: id,
    });
  }
}
