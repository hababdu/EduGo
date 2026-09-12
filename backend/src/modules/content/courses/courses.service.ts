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
      throw new NotFoundException('Kurs topilmadi');
    }
    return course;
  }

  async create(dto: CreateCourseDto & { type?: string; category?: string; mediaUrl?: string }, actorId: string) {
    const rawDto = dto as any;
    const payloadData = {
      type: rawDto.type || 'TEXT',
      category: rawDto.category || 'LESSON',
      mediaUrl: rawDto.mediaUrl || '',
      content: rawDto.description || '',
    };

    const startDateValue = rawDto.startDate ? new Date(rawDto.startDate) : undefined;
    const endDateValue = rawDto.endDate ? new Date(rawDto.endDate) : undefined;

    const course = await this.prisma.course.create({
      data: {
        title: rawDto.title,
        description: JSON.stringify(payloadData),
        posterUrl: rawDto.posterUrl,
        startDate: startDateValue,
        endDate: endDateValue,
        createdById: actorId,
      } as any,
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

  async update(id: string, dto: UpdateCourseDto & { type?: string; category?: string; mediaUrl?: string }, actorId: string) {
    const rawDto = dto as any;
    const existing = await this.prisma.course.findUnique({ where: { id } });
    if (!existing || !existing.id || existing.deletedAt) {
      throw new NotFoundException('Kurs topilmadi');
    }

    let descriptionToSave = existing.description;
    if (rawDto.description || rawDto.type || rawDto.category || rawDto.mediaUrl !== undefined) {
      let parsed: any = {};
      try {
        parsed = existing.description ? JSON.parse(existing.description) : {};
      } catch {
        parsed = { type: 'TEXT', category: 'LESSON', content: existing.description };
      }

      const updatedPayload = {
        ...parsed,
        ...(rawDto.type ? { type: rawDto.type } : {}),
        ...(rawDto.category ? { category: rawDto.category } : {}),
        ...(rawDto.mediaUrl !== undefined ? { mediaUrl: rawDto.mediaUrl } : {}),
        ...(rawDto.description ? { content: rawDto.description } : {}),
      };
      descriptionToSave = JSON.stringify(updatedPayload);
    }

    const startDateValue = rawDto.startDate !== undefined 
      ? (rawDto.startDate ? new Date(rawDto.startDate) : null) 
      : existing.startDate;

    const endDateValue = rawDto.endDate !== undefined 
      ? (rawDto.endDate ? new Date(rawDto.endDate) : null) 
      : existing.endDate;

    const updated = await this.prisma.course.update({
      where: { id },
      data: {
        title: rawDto.title ?? existing.title,
        description: descriptionToSave,
        posterUrl: rawDto.posterUrl ?? existing.posterUrl,
        startDate: startDateValue,
        endDate: endDateValue,
      } as any,
    });

    await this.audit.log({
      actorId,
      action: 'COURSE_UPDATE',
      targetType: 'Course',
      targetId: id,
      oldValue: existing,
      newValue: rawDto,
    });

    return updated;
  }

  async remove(id: string, actorId: string) {
    const existing = await this.prisma.course.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Kurs topilmadi');
    }

    await this.prisma.course.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.audit.log({
      actorId,
      action: 'COURSE_DELETE',
      targetType: 'Course',
      targetId: id,
    });
  }
}