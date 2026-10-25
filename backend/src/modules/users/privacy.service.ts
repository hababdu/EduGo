import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

/** Shaxsiy ma'lumot huquqlari: o'z ma'lumotini yuklab olish va hisobni o'chirish (anonimlashtirish). */
@Injectable()
export class PrivacyService {
  constructor(private readonly prisma: PrismaService) {}

  /** Foydalanuvchining O'Z ma'lumotlari (boshqa odamlarning ma'lumoti kirmaydi). */
  async exportMine(user: CurrentUserPayload) {
    const me = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, telegramId: true, phone: true, username: true, firstName: true, lastName: true, role: true, status: true, registeredAt: true, organization: { select: { name: true } } },
    });
    if (!me) throw new NotFoundException('Foydalanuvchi topilmadi');

    const [groups, attendance, payments, submissions, attempts, certificates, notifications] = await Promise.all([
      this.prisma.groupMember.findMany({ where: { studentId: user.id }, select: { joinedAt: true, group: { select: { name: true } } } }),
      this.prisma.attendanceRecord.findMany({ where: { studentId: user.id }, select: { date: true, status: true, note: true, group: { select: { name: true } } }, take: 5000 }),
      this.prisma.payment.findMany({ where: { studentId: user.id }, select: { month: true, status: true, amount: true, paidAt: true, group: { select: { name: true } } }, take: 1000 }),
      this.prisma.assignmentSubmission.findMany({
        where: { studentId: user.id },
        select: { textAnswer: true, status: true, submittedAt: true, aiScore: true, teacherScore: true, teacherFeedback: true, assignment: { select: { title: true } } },
        take: 1000,
      }),
      this.prisma.testAttempt.findMany({ where: { studentId: user.id }, select: { completedAt: true, passed: true, test: { select: { title: true } } }, take: 1000 }),
      this.prisma.certificate.findMany({ where: { studentId: user.id }, select: { code: true, title: true, issuedAt: true, revokedAt: true } }),
      this.prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 200, select: { title: true, body: true, createdAt: true } }),
    ]);

    return { exportedAt: new Date().toISOString(), profile: me, groups, attendance, payments, submissions, testAttempts: attempts, certificates, notifications };
  }

  /**
   * Hisobni o'chirish = anonimlashtirish: shaxsiy maydonlar tozalanadi, kirish yopiladi, sessiyalar bekor qilinadi.
   * Statistik/moliyaviy yozuvlar (to'lov, davomat) maktab hisobi uchun saqlanadi, lekin endi shaxsga bog'lanmaydi.
   * Faqat o'quvchi va ota-ona o'zi o'chira oladi; xodimlarni (o'qituvchi/admin) maktab admini boshqaradi.
   */
  async deleteMine(user: CurrentUserPayload, confirm: unknown) {
    if (user.role !== 'STUDENT' && user.role !== 'PARENT') {
      throw new ForbiddenException("Xodim hisobini o'zingiz o'chira olmaysiz — maktab administratoriga murojaat qiling");
    }
    if (confirm !== 'DELETE') throw new BadRequestException("Tasdiqlash uchun confirm: \"DELETE\" yuboring");
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: now } });
      await tx.notification.deleteMany({ where: { userId: user.id } });
      await tx.assignmentSubmission.updateMany({ where: { studentId: user.id }, data: { textAnswer: null } });
      await tx.user.update({
        where: { id: user.id },
        data: {
          firstName: "O'chirilgan foydalanuvchi", lastName: null, username: null, phone: null, profilePhotoUrl: null,
          telegramId: `deleted_${user.id}`, status: 'BLOCKED', deletedAt: now,
        },
      });
    });
    return { ok: true };
  }
}
