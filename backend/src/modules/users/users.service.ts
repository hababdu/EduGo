import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

export const ASSIGNABLE_ROLES = ['STUDENT', 'TEACHER', 'ADMIN', 'SUPER_ADMIN'] as const;
const ADMIN_TIER: string[] = ['ADMIN', 'SUPER_ADMIN'];

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 80-band, 1 va 2-qoidalar:
   * "Student faqat o'z accountini ko'ra oladi."
   * "Student boshqa student ma'lumotini ko'ra olmaydi."
   */
  async getProfileFor(targetUserId: string, requester: CurrentUserPayload) {
    const isSelf = targetUserId === requester.id;
    const isPrivileged = requester.role === 'ADMIN' || requester.role === 'SUPER_ADMIN';

    let isOwnerTeacher = false;
    if (requester.role === 'TEACHER' && !isSelf) {
      // Teacher faqat O'Z guruhidagi studentni ko'ra oladi
      const sharedGroup = await this.prisma.groupMember.findFirst({
        where: {
          studentId: targetUserId,
          group: { teacherId: requester.id },
        },
      });
      isOwnerTeacher = !!sharedGroup;
    }

    if (!isSelf && !isPrivileged && !isOwnerTeacher) {
      throw new ForbiddenException(
        'Siz faqat o\'z profilingizni yoki o\'z guruhingizdagi studentlarni ko\'ra olasiz',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: { studentProfile: true, streak: true },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    return user;
  }

  // =========================================================================
  // ADMIN PANEL UCHUN METODLAR
  // =========================================================================

  /**
   * Barcha foydalanuvchilar ro'yxatini qaytaradi (Admin uchun)
   */
  async findAllUsers() {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        telegramId: true,
        firstName: true,
        lastName: true,
        username: true,
        role: true,
      },
    });
  }

  /**
   * Foydalanuvchi rolini o'zgartirish. Qoidalar (avval umuman yo'q edi — har qanday ADMIN istalgan odamni SUPER_ADMIN qila olardi):
   *  • rol faqat ma'lum qiymatlardan biri bo'lishi shart (aks holda 400, oldin 500 edi)
   *  • hech kim O'Z rolini o'zgartira olmaydi
   *  • ADMIN/SUPER_ADMIN darajasiga tegishli har qanday o'zgarishni (berish yoki olish) faqat SUPER_ADMIN qiladi;
   *    oddiy ADMIN faqat STUDENT <-> TEACHER ni boshqaradi
   *  • har bir o'zgarish audit jurnaliga yoziladi
   */
  async updateRole(userId: string, role: unknown, actor: CurrentUserPayload) {
    if (typeof role !== 'string' || !(ASSIGNABLE_ROLES as readonly string[]).includes(role)) {
      throw new BadRequestException("Noto'g'ri rol");
    }
    if (userId === actor.id) {
      throw new ForbiddenException("O'z rolingizni o'zgartira olmaysiz");
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    const touchesAdminTier = ADMIN_TIER.includes(user.role as string) || ADMIN_TIER.includes(role);
    if (touchesAdminTier && actor.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException("ADMIN va SUPER_ADMIN rollarini faqat super administrator boshqara oladi");
    }

    const select = { id: true, telegramId: true, role: true, firstName: true } as const;
    if (user.role === role) {
      return this.prisma.user.findUnique({ where: { id: userId }, select }); // o'zgarish yo'q — yozuv ham yo'q
    }

    const updated = await this.prisma.user.update({ where: { id: userId }, data: { role: role as any }, select });

    await this.prisma.adminActionLog.create({
      data: {
        actorId: actor.id,
        action: 'ROLE_CHANGE',
        targetType: 'User',
        targetId: userId,
        oldValue: { role: user.role } as any,
        newValue: { role } as any,
      },
    });
    return updated;
  }
}
