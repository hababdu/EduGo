import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Rolga qarab RO'YXAT o'zi filtrlanadi — bu "list endpoint"lar uchun
   * eng ishonchli usul: teacher so'rov yuborayotganda hech qachon
   * boshqa teacherning guruhlari umuman qaytarilmaydi (keyin
   * frontendda "yashirish" emas, DB darajasida chiqarilmaydi).
   */
  async findAllForUser(user: CurrentUserPayload) {
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      return this.prisma.group.findMany({ where: { deletedAt: null } });
    }

    if (user.role === 'TEACHER') {
      return this.prisma.group.findMany({
        where: { teacherId: user.id, deletedAt: null },
      });
    }

    // STUDENT — faqat o'zi a'zo bo'lgan guruh(lar)
    return this.prisma.group.findMany({
      where: {
        deletedAt: null,
        members: { some: { studentId: user.id } },
      },
    });
  }

  /**
   * SINGLE resource uchun — avval topamiz, keyin OWNERSHIP tekshiramiz.
   * Bu funksiya har bir "detail"/"update"/"delete" endpointida chaqiriladi.
   */
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

  /**
   * MARKAZIY ownership qoidasi — barcha joyda shu funksiya orqali tekshiriladi,
   * shunda qoida bitta joyda o'zgartiriladi va hech qayerda unutilmaydi.
   */
  private assertCanAccess(
    group: { teacherId: string | null; members: { studentId: string }[] },
    user: CurrentUserPayload,
  ) {
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      return; // admin hammasiga kira oladi
    }

    if (user.role === 'TEACHER') {
      if (group.teacherId !== user.id) {
        throw new ForbiddenException('Bu guruh sizga biriktirilmagan');
      }
      return;
    }

    // STUDENT — faqat o'zi a'zo bo'lsa
    const isMember = group.members.some((m) => m.studentId === user.id);
    if (!isMember) {
      throw new ForbiddenException('Siz bu guruhga a\'zo emassiz');
    }
  }
}
