import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 80-band, 1 va 2-qoidalar:
   * "Student faqat o'z accountini ko'ra oladi."
   * "Student boshqa student ma'lumotini ko'ra olmaydi."
   *
   * Bu tekshiruv FRONTEND yashirgan tugma emas — har qanday kishi
   * DevTools'dan boshqa :id bilan so'rov yuborsa ham backend shu yerda to'xtatadi.
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
}
