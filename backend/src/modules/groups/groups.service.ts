import { ForbiddenException, Injectable, NotFoundException ,BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForUser(user: CurrentUserPayload) {
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      return this.prisma.group.findMany({
        where: { deletedAt: null },
        include: { _count: { select: { members: true } } },
      });
    }

    if (user.role === 'TEACHER') {
      return this.prisma.group.findMany({
        where: { teacherId: user.id, deletedAt: null },
        include: { _count: { select: { members: true } } },
      });
    }

    return this.prisma.group.findMany({
      where: {
        deletedAt: null,
        members: { some: { studentId: user.id } },
      },
      include: { _count: { select: { members: true } } },
    });
  }

  /**
   * Guruh yaratish
   */
  async createGroup(data: { name: string; description?: string }, user: CurrentUserPayload) {
    // Agar o'qituvchi yaratayotgan bo'lsa, teacherId avtomatik o'ziga bog'lanadi
    const teacherId = user.role === 'TEACHER' ? user.id : undefined;

    return this.prisma.group.create({
      data: {
        name: data.name,
        teacherId: teacherId,
      },
    });
  }
async addStudentToGroup(groupId: string, studentId: string, user: CurrentUserPayload) {
    // Guruh mavjudligini va ruxsat borligini tekshiramiz
    await this.findOneOrThrow(groupId, user);

    // Talaba allaqachon guruhda borligini tekshiramiz
    const existing = await this.prisma.groupMember.findUnique({
      where: { groupId_studentId: { groupId, studentId } },
    });

    if (existing) {
      throw new BadRequestException('Bu talaba allaqachon guruhga qo\'shilgan');
    }

    return this.prisma.groupMember.create({
      data: { groupId, studentId },
    });
  }
  async findOneOrThrow(groupId: string, user: CurrentUserPayload) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group || group.deletedAt) {
      throw new NotFoundException('Guruh topilmadi');
    }

    this.assertCanAccess(group, user);
    return group;
  }


  async assignTeacher(groupId: string, teacherId: string, user: CurrentUserPayload) {
    // Guruh mavjudligini va foydalanuvchi huquqini tekshirish
    await this.findOneOrThrow(groupId, user);

    return this.prisma.group.update({
      where: { id: groupId },
      data: { teacherId: teacherId },
    });
  }
  /**
   * Guruhni o'chirish
   */
  
  async deleteGroup(groupId: string, user: CurrentUserPayload) {
    const group = await this.findOneOrThrow(groupId, user);

    // Agar o'qituvchi bo'lsa, faqat o'zining guruhini o'chira oladi (assertCanAccess buni tekshiradi)
    return this.prisma.group.update({
      where: { id: group.id },
      data: { deletedAt: new Date() },
    });
  }

  private assertCanAccess(
    group: { teacherId: string | null; members: { studentId: string }[] },
    user: CurrentUserPayload,
  ) {
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      return;
    }

    if (user.role === 'TEACHER') {
      if (group.teacherId !== user.id) {
        throw new ForbiddenException('Bu guruh sizga biriktirilmagan');
      }
      return;
    }

    const isMember = group.members.some((m) => m.studentId === user.id);
    if (!isMember) {
      throw new ForbiddenException('Siz bu guruhga a\'zo emassiz');
    }
  }
}