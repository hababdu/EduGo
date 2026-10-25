import { Injectable } from '@nestjs/common';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { orgWhere } from '../../common/org-scope';
import { PrismaService } from '../../prisma/prisma.service';
import { currentMonth, monthEndsAfter } from './payments.service';

const DAY_MS = 86_400_000;

/** Oxirgi `n` oy (eskidan yangiga), Toshkent oyi bo'yicha. */
export function lastMonths(n: number, now: Date = new Date()): string[] {
  const cur = currentMonth(now);
  let y = Number(cur.slice(0, 4));
  let m = Number(cur.slice(5, 7));
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    out.unshift(`${y}-${String(m).padStart(2, '0')}`);
    m--;
    if (m === 0) { m = 12; y--; }
  }
  return out;
}

/** Maktab egasi uchun tahlil: tushum dinamikasi va "xavf ostidagi" o'quvchilar. Faqat admin (o'z maktabi). */
@Injectable()
export class InsightsService {
  constructor(private readonly prisma: PrismaService) {}

  async finance(user: CurrentUserPayload, monthsInput?: number, now: Date = new Date()) {
    const months = lastMonths(Math.min(Math.max(Math.floor(monthsInput || 6), 2), 12), now);
    const groups = await this.prisma.group.findMany({
      where: { deletedAt: null, ...orgWhere(user) },
      select: { id: true, name: true, monthlyFee: true, members: { select: { joinedAt: true, studentId: true } } },
    });
    const ids = groups.map((g) => g.id);
    const pays = ids.length
      ? await this.prisma.payment.findMany({ where: { groupId: { in: ids }, month: { in: months } }, select: { groupId: true, studentId: true, month: true, status: true, amount: true } })
      : [];

    const rows = months.map((month) => {
      let collected = 0, expected = 0, paid = 0, unpaid = 0;
      for (const g of groups) {
        for (const m of g.members) {
          if (!monthEndsAfter(month, new Date(m.joinedAt))) continue;
          const p = pays.find((x) => x.month === month && x.groupId === g.id && x.studentId === m.studentId);
          if (p?.status === 'WAIVED') continue;
          if (g.monthlyFee) expected += g.monthlyFee;
          if (p?.status === 'PAID') { paid++; collected += p.amount; } else unpaid++;
        }
      }
      return { month, collected, expected, paid, unpaid, rate: expected > 0 ? Math.round((collected * 100) / expected) : null };
    });

    const cur = months[months.length - 1];
    const byGroup = groups
      .map((g) => ({
        groupId: g.id, name: g.name, students: g.members.length, monthlyFee: g.monthlyFee,
        collected: pays.filter((p) => p.month === cur && p.groupId === g.id && p.status === 'PAID').reduce((a, p) => a + p.amount, 0),
      }))
      .sort((a, b) => b.collected - a.collected)
      .slice(0, 10);

    return { months: rows, topGroups: byGroup };
  }

  /** Davomati past (<70%, kamida 3 belgi) yoki 14+ kun kirmagan faol o'quvchilar. */
  async atRisk(user: CurrentUserPayload, now: Date = new Date()) {
    const since = new Date(now.getTime() + 5 * 3_600_000 - 30 * DAY_MS);
    since.setUTCHours(0, 0, 0, 0);
    const inactiveBefore = new Date(now.getTime() - 14 * DAY_MS);

    const students = await this.prisma.user.findMany({
      where: { role: 'STUDENT', status: 'ACTIVE', deletedAt: null, groupMemberships: { some: {} }, ...orgWhere(user) },
      select: {
        id: true, firstName: true, lastName: true, lastActiveAt: true,
        groupMemberships: { select: { group: { select: { name: true } } }, take: 3 },
      },
      take: 2000,
    });
    if (students.length === 0) return [];
    const att = await this.prisma.attendanceRecord.findMany({
      where: { studentId: { in: students.map((s) => s.id) }, date: { gte: since } },
      select: { studentId: true, status: true },
    });
    const by = new Map<string, { present: number; total: number }>();
    for (const a of att) {
      const c = by.get(a.studentId) ?? { present: 0, total: 0 };
      c.total++;
      if (a.status === 'PRESENT') c.present++;
      by.set(a.studentId, c);
    }

    const out: { studentId: string; name: string; groups: string[]; attendancePct: number | null; idleDays: number; reasons: string[]; score: number }[] = [];
    for (const s of students) {
      const reasons: string[] = [];
      const c = by.get(s.id);
      const pct = c && c.total >= 3 ? Math.round((c.present * 100) / c.total) : null;
      if (pct !== null && pct < 70) reasons.push(`Davomat ${pct}%`);
      const idle = Math.floor((now.getTime() - new Date(s.lastActiveAt).getTime()) / DAY_MS);
      if (new Date(s.lastActiveAt) < inactiveBefore) reasons.push(`${idle} kundan beri kirmagan`);
      if (reasons.length === 0) continue;
      out.push({
        studentId: s.id, name: `${s.firstName} ${s.lastName ?? ''}`.trim(), groups: s.groupMemberships.map((m) => m.group.name),
        attendancePct: pct, idleDays: idle, reasons, score: reasons.length * 100 - (pct ?? 100) + Math.min(idle, 60),
      });
    }
    return out.sort((a, b) => b.score - a.score).slice(0, 30).map(({ score, ...r }) => r);
  }
}
