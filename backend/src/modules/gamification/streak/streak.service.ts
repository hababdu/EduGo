import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

function isYesterday(date: Date, today: Date) {
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(date, yesterday);
}

@Injectable()
export class StreakService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 39-band — "Student ketma-ket faol bo'lgan kunlari hisoblanadi."
   * Test, lesson, homework yoki daily challenge bajarilganda chaqiriladi.
   * Bir kunda bir necha marta chaqirilsa ham streak faqat BIR MARTA oshadi
   * (idempotent — shu kun uchun lastActiveDate tekshiriladi).
   */
  async recordActivity(studentId: string) {
    const today = new Date();
    const streak = await this.prisma.streak.findUnique({ where: { studentId } });

    if (!streak) {
      return this.prisma.streak.create({
        data: { studentId, currentStreak: 1, longestStreak: 1, lastActiveDate: today },
      });
    }

    if (streak.lastActiveDate && isSameDay(streak.lastActiveDate, today)) {
      return streak; // bugun allaqachon hisoblangan
    }

    const continuesStreak = streak.lastActiveDate && isYesterday(streak.lastActiveDate, today);
    const newCurrent = continuesStreak ? streak.currentStreak + 1 : 1;

    return this.prisma.streak.update({
      where: { studentId },
      data: {
        currentStreak: newCurrent,
        longestStreak: Math.max(newCurrent, streak.longestStreak),
        lastActiveDate: today,
      },
    });
  }

  getStreak(studentId: string) {
    return this.prisma.streak.findUnique({ where: { studentId } });
  }
}
