import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InternalService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * "👤 Profilim" / "🏆 Ballarim" tugmalari uchun.
   * telegramId orqali — bot faqat shuni biladi, ichki userId'ni bilmaydi.
   */
  async getStudentSummary(telegramId: string) {
    const user = await this.prisma.user.findUnique({
      where: { telegramId },
      include: { studentProfile: true, streak: true },
    });

    if (!user) {
      throw new NotFoundException(
        'Foydalanuvchi topilmadi. Avval "Darsni boshlash" orqali platformaga kiring.',
      );
    }

    // Umumiy reytingdagi o'rni — oddiy usul (kelajakda cache/materialized view bilan optimallashtiriladi)
    const higherScoreCount = await this.prisma.studentProfile.count({
      where: { totalScore: { gt: user.studentProfile?.totalScore ?? 0 } },
    });

    return {
      firstName: user.firstName,
      totalScore: user.studentProfile?.totalScore ?? 0,
      totalXp: user.studentProfile?.totalXp ?? 0,
      level: user.studentProfile?.level ?? 1,
      rank: higherScoreCount + 1,
      streak: user.streak?.currentStreak ?? 0,
    };
  }

  /** "📊 Natijalarim" tugmasi — so'nggi test natijalari */
  async getRecentResults(telegramId: string, limit = 5) {
    const user = await this.prisma.user.findUnique({ where: { telegramId } });
    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    return this.prisma.testAttempt.findMany({
      where: { studentId: user.id },
      orderBy: { completedAt: 'desc' },
      take: limit,
      include: { test: { select: { title: true } } },
    });
  }

  /** "🏅 Yutuqlarim" tugmasi */
  async getAchievements(telegramId: string) {
    const user = await this.prisma.user.findUnique({ where: { telegramId } });
    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    return this.prisma.studentAchievement.findMany({
      where: { studentId: user.id },
      include: { achievement: true },
      orderBy: { earnedAt: 'desc' },
    });
  }

  /** "🏆 Reyting" tugmasi — TOP 10 global */
  async getTopRanking(limit = 10) {
    return this.prisma.studentProfile.findMany({
      orderBy: { totalScore: 'desc' },
      take: limit,
      include: { user: { select: { firstName: true, username: true } } },
    });
  }

  /** "📢 E'lonlar" tugmasi */
  async getRecentAnnouncements(limit = 5) {
    return this.prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
