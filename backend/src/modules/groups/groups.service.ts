// src/modules/groups/groups.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  /* ============================================================
     FIND ALL FOR USER — role bo'yicha
     ============================================================ */
  async findAllForUser(user: CurrentUserPayload) {
    const baseInclude = {
      _count: { select: { members: true } },
      teacher: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
        },
      },
    };

    // ADMIN — barcha guruhlar
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      return this.prisma.group.findMany({
        where: { deletedAt: null },
        include: baseInclude,
        orderBy: { createdAt: 'desc' },
      });
    }

    // TEACHER — faqat o'ziniki
    if (user.role === 'TEACHER') {
      return this.prisma.group.findMany({
        where: {
          teacherId: user.id,
          deletedAt: null,
        },
        include: baseInclude,
        orderBy: { createdAt: 'desc' },
      });
    }

    // STUDENT — faqat a'zo bo'lganlar
    return this.prisma.group.findMany({
      where: {
        deletedAt: null,
        members: { some: { studentId: user.id } },
      },
      include: baseInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  /* ============================================================
     FIND ONE OR THROW
     ============================================================ */
  async findOneOrThrow(groupId: string, user: CurrentUserPayload) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: true,
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
      },
    });

    if (!group || group.deletedAt) {
      throw new NotFoundException('Guruh topilmadi');
    }

    this.assertCanAccess(group, user);
    return group;
  }

  /* ============================================================
     FIND GROUP STUDENTS
     ============================================================ */
  async findGroupStudents(groupId: string, user: CurrentUserPayload) {
    await this.findOneOrThrow(groupId, user);

    return this.prisma.groupMember.findMany({
      where: { groupId },
      orderBy: { createdAt: 'asc' },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
            phone: true,
            role: true,
            status: true,
          },
        },
      },
    });
  }

  /* ============================================================
     CREATE GROUP — posterUrl bilan
     ============================================================ */
  async createGroup(
    data: {
      name: string;
      description?: string;
      posterUrl?: string;
      teacherId?: string;
    },
    user: CurrentUserPayload,
  ) {
    // 1. Validatsiya
    if (!data.name?.trim()) {
      throw new BadRequestException('Guruh nomi kiritilishi shart');
    }

    // 2. Teacher ID aniqlash
    let teacherId: string | null = null;

    if (user.role === 'TEACHER') {
      // Teacher o'zi uchun yaratadi
      teacherId = user.id;
    } else if (
      (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') &&
      data.teacherId
    ) {
      // Admin teacherId berishi mumkin — tekshirish
      const teacher = await this.prisma.user.findFirst({
        where: {
          id: data.teacherId,
          role: 'TEACHER',
          deletedAt: null,
          status: 'ACTIVE',
        },
        select: { id: true, firstName: true, lastName: true },
      });

      if (!teacher) {
        throw new BadRequestException(
          "Berilgan o'qituvchi topilmadi yoki faol emas",
        );
      }

      teacherId = teacher.id;
    }

    // 3. Guruh yaratish
    return this.prisma.group.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        posterUrl: data.posterUrl?.trim() || null,   // 👈 POSTER SAQLASH
        teacherId,
      },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
        _count: { select: { members: true } },
      },
    });
  }

  /* ============================================================
     UPDATE GROUP
     ============================================================ */
  async updateGroup(
    groupId: string,
    data: {
      name?: string;
      description?: string;
      posterUrl?: string;
      teacherId?: string | null;
    },
    user: CurrentUserPayload,
  ) {
    const group = await this.findOneOrThrow(groupId, user);

    // Teacher ID validatsiya (agar berilgan bo'lsa)
    if (data.teacherId) {
      const teacher = await this.prisma.user.findFirst({
        where: {
          id: data.teacherId,
          role: 'TEACHER',
          deletedAt: null,
          status: 'ACTIVE',
        },
      });
      if (!teacher) {
        throw new BadRequestException("O'qituvchi topilmadi yoki faol emas");
      }
    }

    return this.prisma.group.update({
      where: { id: groupId },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.description !== undefined && {
          description: data.description?.trim() || null,
        }),
        ...(data.posterUrl !== undefined && {
          posterUrl: data.posterUrl?.trim() || null,
        }),
        ...(data.teacherId !== undefined && {
          teacherId: data.teacherId || null,
        }),
      },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
        _count: { select: { members: true } },
      },
    });
  }

  /* ============================================================
     ADD STUDENT TO GROUP
     ============================================================ */
  async addStudentToGroup(
    groupId: string,
    studentId: string,
    user: CurrentUserPayload,
  ) {
    await this.findOneOrThrow(groupId, user);

    // Student mavjudligini tekshirish
    const student = await this.prisma.user.findFirst({
      where: {
        id: studentId,
        role: 'STUDENT',
        deletedAt: null,
      },
    });
    if (!student) {
      throw new BadRequestException('Student topilmadi');
    }

    // Allaqachon a'zo emasligini tekshirish
    const existing = await this.prisma.groupMember.findUnique({
      where: { groupId_studentId: { groupId, studentId } },
    });

    if (existing) {
      throw new BadRequestException("Bu talaba allaqachon guruhga qo'shilgan");
    }

    return this.prisma.groupMember.create({
      data: { groupId, studentId },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          },
        },
      },
    });
  }

  /* ============================================================
     REMOVE STUDENT FROM GROUP
     ============================================================ */
  async removeStudentFromGroup(
    groupId: string,
    studentId: string,
    user: CurrentUserPayload,
  ) {
    await this.findOneOrThrow(groupId, user);

    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_studentId: { groupId, studentId } },
    });
    if (!membership) {
      throw new NotFoundException("Bu talaba guruhda emas");
    }

    await this.prisma.groupMember.delete({
      where: { groupId_studentId: { groupId, studentId } },
    });

    return { ok: true };
  }

  /* ============================================================
     ASSIGN TEACHER
     ============================================================ */
  async assignTeacher(
    groupId: string,
    teacherId: string | null,
    user: CurrentUserPayload,
  ) {
    await this.findOneOrThrow(groupId, user);

    // Teacher ID validatsiya (agar berilgan bo'lsa)
    if (teacherId) {
      const teacher = await this.prisma.user.findFirst({
        where: {
          id: teacherId,
          role: 'TEACHER',
          deletedAt: null,
          status: 'ACTIVE',
        },
      });
      if (!teacher) {
        throw new BadRequestException("O'qituvchi topilmadi yoki faol emas");
      }
    }

    return this.prisma.group.update({
      where: { id: groupId },
      data: { teacherId: teacherId || null },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  /* ============================================================
     DELETE GROUP — soft delete
     ============================================================ */
  async deleteGroup(groupId: string, user: CurrentUserPayload) {
    const group = await this.findOneOrThrow(groupId, user);

    const now = new Date();

    // Guruh + materiallar birgalikda soft delete
    await this.prisma.$transaction([
      this.prisma.group.update({
        where: { id: group.id },
        data: { deletedAt: now },
      }),
      this.prisma.teacherAssignment.updateMany({
        where: { groupId: group.id, deletedAt: null },
        data: { deletedAt: now },
      }),
    ]);

    return { ok: true, groupId: group.id };
  }

  /* ============================================================
     ACCESS
     ============================================================ */
  private assertCanAccess(
    group: { teacherId: string | null; members: { studentId: string }[] },
    user: CurrentUserPayload,
  ) {
    // ADMIN — hamma narsa
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      return;
    }

    // TEACHER — faqat o'ziniki
    if (user.role === 'TEACHER') {
      if (group.teacherId !== user.id) {
        throw new ForbiddenException('Bu guruh sizga biriktirilmagan');
      }
      return;
    }

    // STUDENT — faqat a'zolik
    const members = group.members ?? [];
    const isMember = members.some((m) => m.studentId === user.id);

    if (!isMember) {
      throw new ForbiddenException("Siz bu guruhga a'zo emassiz");
    }
  }
}