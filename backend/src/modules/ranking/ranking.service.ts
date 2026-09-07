import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface RankingEntry {
  studentId: string;
  firstName: string;
  username: string | null;
  totalScore: number;
  rank: number;
}

@Injectable()
export class RankingService {
  constructor(private readonly prisma: PrismaService) {}

  /** 34-band: GLOBAL RANKING */
  async getGlobalRanking(limit = 20): Promise<RankingEntry[]> {
    return this.rankProfiles({}, limit);
  }

  /** 34-band: GROUP RANKING */
  async getGroupRanking(groupId: string, limit = 50): Promise<RankingEntry[]> {
    const memberIds = (
      await this.prisma.groupMember.findMany({
        where: { groupId },
        select: { studentId: true },
      })
    ).map((m) => m.studentId);

    return this.rankProfiles({ userId: { in: memberIds } }, limit);
  }

  /** 34-band: SUBJECT RANKING — ScoreTransaction ledgeridan fan bo'yicha yig'indi */
  async getSubjectRanking(subjectId: string, limit = 50): Promise<RankingEntry[]> {
    const grouped = await this.prisma.scoreTransaction.groupBy({
      by: ['studentId'] as const,
      where: { subjectId },
      _sum: { amount: true },
    });

    const sorted = grouped
      .map((g) => ({ studentId: g.studentId, score: g._sum.amount ?? 0 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    const users = await this.prisma.user.findMany({
      where: { id: { in: sorted.map((s) => s.studentId) } },
      select: { id: true, firstName: true, username: true },
    });
    const userMap = new Map<string, (typeof users)[number]>(users.map((u) => [u.id, u]));

    return sorted.map((s, i) => ({
      studentId: s.studentId,
      firstName: userMap.get(s.studentId)?.firstName ?? '',
      username: userMap.get(s.studentId)?.username ?? null,
      totalScore: s.score,
      rank: i + 1,
    }));
  }

  /** Bitta studentning global reytingdagi o'rni (dashboard/profil uchun) */
  async getStudentRank(studentId: string): Promise<number> {
    const profile = await this.prisma.studentProfile.findUnique({ where: { userId: studentId } });
    if (!profile) return 0;

    const higherCount = await this.prisma.studentProfile.count({
      where: { totalScore: { gt: profile.totalScore } },
    });
    return higherCount + 1;
  }

  /**
   * 35-band — TIE-BREAKER: Ball teng bo'lsa, accuracy (o'rtacha foiz),
   * keyin sarflangan vaqt (kamroq vaqt — yaxshiroq) bo'yicha ajratiladi.
   *
   * Eslatma: to'liq aniq tie-break barcha studentlar bo'yicha DB darajasida
   * murakkab bo'lgani uchun, bu yerda top-N dan biroz kattaroq nomzodlar
   * to'plami olinib, xotirada aniq saralanadi — bu amaliy yechim (juda katta
   * userlar sonida keyinchalik materialized view/cache bilan optimallashtiriladi).
   */
  private async rankProfiles(
    where: { userId?: { in: string[] } },
    limit: number,
  ): Promise<RankingEntry[]> {
    const candidates = await this.prisma.studentProfile.findMany({
      where,
      orderBy: { totalScore: 'desc' },
      take: limit * 3, // tie-breaker uchun zaxira bilan olamiz
      include: { user: { select: { id: true, firstName: true, username: true } } },
    });

    const studentIds = candidates.map((c) => c.userId);
    const stats = await this.prisma.testAttempt.groupBy({
      by: ['studentId'] as const,
      where: { studentId: { in: studentIds } },
      _avg: { percent: true, timeSpentSeconds: true },
    });
    const statsMap = new Map<string, (typeof stats)[number]>(stats.map((s) => [s.studentId, s]));

    const sorted = candidates
      .map((c) => ({
        studentId: c.userId,
        firstName: c.user.firstName,
        username: c.user.username,
        totalScore: c.totalScore,
        avgPercent: statsMap.get(c.userId)?._avg.percent ?? 0,
        avgTime: statsMap.get(c.userId)?._avg.timeSpentSeconds ?? Infinity,
      }))
      .sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        if (b.avgPercent !== a.avgPercent) return b.avgPercent - a.avgPercent;
        return a.avgTime - b.avgTime; // kamroq vaqt = yaxshiroq
      })
      .slice(0, limit);

    return sorted.map((s, i) => ({
      studentId: s.studentId,
      firstName: s.firstName,
      username: s.username,
      totalScore: s.totalScore,
      rank: i + 1,
    }));
  }
}
