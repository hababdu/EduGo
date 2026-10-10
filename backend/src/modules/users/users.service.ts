import { sameOrg } from '../../common/org-scope';
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
    // Admin faqat o'z tashkilotidagi (yoki hali hech kimga biriktirilmagan) foydalanuvchini ko'ra oladi
    if (isPrivileged && !isSelf && !sameOrg(requester, user.organizationId) && user.organizationId !== null) {
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
  async findAllUsers(actor: CurrentUserPayload) {
    // Admin: o'z tashkiloti + hali hech qaysi tashkilotga biriktirilmagan oddiy foydalanuvchilar ("yangi" havzasi).
    // Super admin: hamma.
    const where =
      actor.role === 'SUPER_ADMIN'
        ? { deletedAt: null }
        : {
            deletedAt: null,
            OR: [
              { organizationId: actor.organizationId ?? '__no_org__' },
              { organizationId: null, role: 'STUDENT' as const },
            ],
          };
    return this.prisma.user.findMany({
      where,
      select: {
        organizationId: true,
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
    if (role === 'SUPER_ADMIN') {
      throw new ForbiddenException('Super admin faqat server sozlamasi (SUPER_ADMIN_TELEGRAM_IDS) orqali belgilanadi');
    }
    if (userId === actor.id) {
      throw new ForbiddenException("O'z rolingizni o'zgartira olmaysiz");
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    if (user.role === 'SUPER_ADMIN') throw new ForbiddenException("Super adminning rolini o'zgartirib bo'lmaydi");

    // Admin faqat o'z tashkilotidagi yoki hali biriktirilmagan foydalanuvchini boshqaradi
    if (actor.role !== 'SUPER_ADMIN') {
      const mine = !!actor.organizationId && user.organizationId === actor.organizationId;
      const pool = user.organizationId === null && user.role === 'STUDENT';
      if (!mine && !pool) throw new NotFoundException('Foydalanuvchi topilmadi');
      if (!actor.organizationId) throw new ForbiddenException('Siz hech qaysi tashkilotga biriktirilmagansiz');
    }

    const touchesAdminTier = ADMIN_TIER.includes(user.role as string) || ADMIN_TIER.includes(role);
    if (touchesAdminTier && actor.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException("ADMIN va SUPER_ADMIN rollarini faqat super administrator boshqara oladi");
    }

    const select = { id: true, telegramId: true, role: true, firstName: true } as const;
    if (user.role === role) {
      return this.prisma.user.findUnique({ where: { id: userId }, select }); // o'zgarish yo'q — yozuv ham yo'q
    }

    // Biriktirilmagan foydalanuvchini o'qituvchi qilgan admin uni o'z tashkilotiga qo'shadi
    const adopt = actor.role !== 'SUPER_ADMIN' && user.organizationId === null ? { organizationId: actor.organizationId } : {};
    if (actor.role === 'SUPER_ADMIN' && role === 'ADMIN' && !user.organizationId) {
      throw new BadRequestException('Avval foydalanuvchini tashkilotga biriktiring (Tashkilotlar bo\'limi)');
    }
    const updated = await this.prisma.user.update({ where: { id: userId }, data: { role: role as any, ...adopt }, select });

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
