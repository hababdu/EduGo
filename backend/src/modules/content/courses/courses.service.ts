// src/modules/content/courses/courses.service.ts
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

  /* ============================================================
     LIST — Student faqat PUBLISHED, boshqalar hammasi
     ============================================================ */
  async findAllFor(user: CurrentUserPayload) {
    const isStudent = user.role === 'STUDENT';

    return this.prisma.course.findMany({
      where: {
        deletedAt: null,
        ...(isStudent ? { status: 'PUBLISHED' } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { subjects: true },
        },
      },
    });
  }

  /* ============================================================
     GET ONE
     ============================================================ */
  async findOneFor(id: string, user: CurrentUserPayload) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        subjects: {
          where: {
            deletedAt: null,
            ...(user.role === 'STUDENT' ? { status: 'PUBLISHED' } : {}),
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!course || course.deletedAt) {
      throw new NotFoundException('Kurs topilmadi');
    }

    if (user.role === 'STUDENT' && course.status !== 'PUBLISHED') {
      throw new NotFoundException('Kurs topilmadi');
    }

    return course;
  }

  /* ============================================================
     CREATE — Teacher/Admin
     ============================================================ */
  async create(
    dto: CreateCourseDto & {
      type?: string;
      category?: string;
      mediaUrl?: string;
    },
    actorId: string,
  ) {
    const rawDto = dto as any;

    // description ni JSON sifatida saqlash (eski format saqlanadi)
    const payloadData = {
      type: rawDto.type || 'TEXT',
      category: rawDto.category || 'LESSON',
      mediaUrl: rawDto.mediaUrl || '',
      content: rawDto.description || '',
    };

    const course = await this.prisma.course.create({
      data: {
        title: rawDto.title.trim(),
        description: JSON.stringify(payloadData),
        posterUrl: rawDto.posterUrl || null,
        status: 'DRAFT',                              // 👈 default DRAFT
        startDate: rawDto.startDate
          ? new Date(rawDto.startDate)
          : null,
        endDate: rawDto.endDate ? new Date(rawDto.endDate) : null,
        createdById: actorId,
      },
    });

    await this.audit.log({
      actorId,
      action: 'COURSE_CREATE',
      targetType: 'Course',
      targetId: course.id,
      newValue: { title: course.title, status: course.status },
    });

    return course;
  }

  /* ============================================================
     UPDATE
     ============================================================ */
  async update(
    id: string,
    dto: UpdateCourseDto & {
      type?: string;
      category?: string;
      mediaUrl?: string;
    },
    actorId: string,
  ) {
    const rawDto = dto as any;

    const existing = await this.prisma.course.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new NotFoundException('Kurs topilmadi');
    }

    // description JSON birlashtirish
    let descriptionToSave = existing.description;
    if (
      rawDto.description ||
      rawDto.type ||
      rawDto.category ||
      rawDto.mediaUrl !== undefined
    ) {
      let parsed: any = {};
      try {
        parsed = existing.description ? JSON.parse(existing.description) : {};
      } catch {
        parsed = {
          type: 'TEXT',
          category: 'LESSON',
          content: existing.description,
        };
      }

      const updatedPayload = {
        ...parsed,
        ...(rawDto.type ? { type: rawDto.type } : {}),
        ...(rawDto.category ? { category: rawDto.category } : {}),
        ...(rawDto.mediaUrl !== undefined
          ? { mediaUrl: rawDto.mediaUrl }
          : {}),
        ...(rawDto.description ? { content: rawDto.description } : {}),
      };
      descriptionToSave = JSON.stringify(updatedPayload);
    }

    const updated = await this.prisma.course.update({
      where: { id },
      data: {
        title: rawDto.title?.trim() ?? existing.title,
        description: descriptionToSave,
        posterUrl:
          rawDto.posterUrl !== undefined
            ? rawDto.posterUrl
            : existing.posterUrl,
        status: rawDto.status ?? existing.status,        // 👈 status update
        startDate:
          rawDto.startDate !== undefined
            ? rawDto.startDate
              ? new Date(rawDto.startDate)
              : null
            : existing.startDate,
        endDate:
          rawDto.endDate !== undefined
            ? rawDto.endDate
              ? new Date(rawDto.endDate)
              : null
            : existing.endDate,
      },
    });

    await this.audit.log({
      actorId,
      action: 'COURSE_UPDATE',
      targetType: 'Course',
      targetId: id,
      oldValue: {
        title: existing.title,
        status: existing.status,
      },
      newValue: {
        title: updated.title,
        status: updated.status,
      },
    });

    return updated;
  }

  /* ============================================================
     DELETE — soft
     ============================================================ */
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
      oldValue: { title: existing.title },
    });

    return { ok: true };
  }
}