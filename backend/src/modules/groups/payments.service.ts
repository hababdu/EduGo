import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { MarkPaymentsDto } from './dto/payments.dto';
import { tashkentToday } from './attendance.service';

const TZ_OFFSET_MS = 5 * 3_600_000; // Toshkent
export const PAYMENT_MAX_BACK_MONTHS = 24;

/** Toshkent bo'yicha joriy oy: "YYYY-MM" */
export function currentMonth(now: Date = new Date()): string {
  return tashkentToday(now).slice(0, 7);
}

const monthIndex = (m: string) => Number(m.slice(0, 4)) * 12 + (Number(m.slice(5, 7)) - 1);

/** "YYYY-MM": haqiqiy oy, kelajak emas, 24 oydan eski emas. */
export function parseMonth(input: unknown, now: Date = new Date()): string {
  if (typeof input !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(input)) {
    throw new BadRequestException("Oy YYYY-MM ko'rinishida bo'lsin");
  }
  const cur = currentMonth(now);
  if (monthIndex(input) > monthIndex(cur)) throw new BadRequestException("Kelajak oyi uchun to'lov belgilab bo'lmaydi");
  if (monthIndex(cur) - monthIndex(input) > PAYMENT_MAX_BACK_MONTHS) {
    throw new BadRequestException(`Faqat oxirgi ${PAYMENT_MAX_BACK_MONTHS} oy uchun belgilash mumkin`);
  }
  return input;
}

/** Oy tugagan paytdan (keyingi oyning boshi, Toshkent) oldin qo'shilgan o'quvchi shu oy uchun to'lashi kerak. */
export function monthEndsAfter(month: string, joinedAt: Date): boolean {
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7)); // 1..12 → Date.UTC(y, m, 1) = keyingi oy boshi
  const nextMonthStart = Date.UTC(y, m, 1) - TZ_OFFSET_MS;
  return joinedAt.getTime() < nextMonthStart;
}

export type PaymentState = 'PAID' | 'WAIVED' | 'UNPAID';

const fullName = (u: { firstName: string; lastName?: string | null }) => `${u.firstName} ${u.lastName ?? ''}`.trim();

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Pul ma'lumotlari — faqat administrator (himoya qatlami: controller roli buzilsa ham shu yerda to'xtaydi). */
  private assertAdmin(user: CurrentUserPayload) {
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException("To'lov ma'lumotlari faqat administrator uchun");
    }
  }

  private async loadGroup(groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, name: true, monthlyFee: true, deletedAt: true },
    });
    if (!group || group.deletedAt) throw new NotFoundException('Guruh topilmadi');
    return group;
  }

  /** Bir guruhning bir oylik to'lov holati. */
  async groupMonth(groupId: string, monthInput: string | undefined, user: CurrentUserPayload, now: Date = new Date()) {
    this.assertAdmin(user);
    const month = parseMonth(monthInput ?? currentMonth(now), now);
    const group = await this.loadGroup(groupId);

    const [members, payments] = await Promise.all([
      this.prisma.groupMember.findMany({
        where: { groupId },
        orderBy: { createdAt: 'asc' },
        select: { joinedAt: true, student: { select: { id: true, firstName: true, lastName: true, username: true } } },
      }),
      this.prisma.payment.findMany({
        where: { groupId, month },
        select: { studentId: true, status: true, amount: true, note: true, paidAt: true },
      }),
    ]);
    const byStudent = new Map<string, any>(payments.map((p: any) => [p.studentId, p]));

    const students = members.map((m: any) => {
      const p = byStudent.get(m.student.id);
      return {
        studentId: m.student.id,
        firstName: m.student.firstName,
        lastName: m.student.lastName ?? null,
        username: m.student.username ?? null,
        status: (p?.status ?? 'UNPAID') as PaymentState,
        amount: p?.amount ?? 0,
        note: p?.note ?? null,
        paidAt: p?.paidAt ?? null,
        // Oy tugagach qo'shilgan o'quvchidan shu oy uchun to'lov talab qilinmaydi
        due: monthEndsAfter(month, new Date(m.joinedAt)),
      };
    });

    return { groupId, name: group.name, month, monthlyFee: group.monthlyFee ?? null, students, totals: this.totals(students, group.monthlyFee) };
  }

  private totals(students: { status: PaymentState; amount: number; due: boolean }[], fee: number | null) {
    const due = students.filter((s) => s.due || s.status !== 'UNPAID');
    const paid = due.filter((s) => s.status === 'PAID').length;
    const waived = due.filter((s) => s.status === 'WAIVED').length;
    const unpaid = due.filter((s) => s.status === 'UNPAID').length;
    const collected = due.reduce((a, s) => a + (s.status === 'PAID' ? s.amount : 0), 0);
    // Kutilgan: to'lashi kerak bo'lganlar (imtiyozlilardan tashqari) × oylik to'lov
    const expected = fee != null ? (paid + unpaid) * fee : null;
    return { paid, waived, unpaid, collected, expected };
  }

  /** Belgilarni saqlaydi. UNPAID — yozuvni o'chiradi. Faqat guruh a'zolari. */
  async markMonth(groupId: string, dto: MarkPaymentsDto, user: CurrentUserPayload, now: Date = new Date()) {
    this.assertAdmin(user);
    const month = parseMonth(dto.month, now);
    const group = await this.loadGroup(groupId);

    const ids = dto.records.map((r) => r.studentId);
    if (new Set(ids).size !== ids.length) throw new BadRequestException("Bitta o'quvchi ro'yxatda ikki marta uchrayapti");
    const members = await this.prisma.groupMember.findMany({ where: { groupId, studentId: { in: ids } }, select: { studentId: true } });
    if (members.length !== ids.length) throw new BadRequestException(`${ids.length - members.length} ta o'quvchi bu guruh a'zosi emas`);

    const ops: any[] = [];
    for (const r of dto.records) {
      const where = { groupId_studentId_month: { groupId, studentId: r.studentId, month } };
      if (r.status === 'UNPAID') {
        ops.push(this.prisma.payment.deleteMany({ where: { groupId, studentId: r.studentId, month } }));
        continue;
      }
      const amount = r.status === 'WAIVED' ? 0 : r.amount ?? group.monthlyFee;
      if (amount == null) throw new BadRequestException("Summani kiriting yoki guruh uchun oylik to'lovni belgilang");
      const note = r.note?.trim() || null;
      ops.push(
        this.prisma.payment.upsert({
          where,
          create: { groupId, studentId: r.studentId, month, status: r.status, amount, note, markedById: user.id },
          update: { status: r.status, amount, note, markedById: user.id, paidAt: now },
        }),
      );
    }
    await this.prisma.$transaction(ops);
    return { ok: true, month, saved: dto.records.length };
  }

  /** Barcha guruhlar bo'yicha oylik xulosa va qarzdorlar ro'yxati. */
  async overview(monthInput: string | undefined, user: CurrentUserPayload, now: Date = new Date()) {
    this.assertAdmin(user);
    const month = parseMonth(monthInput ?? currentMonth(now), now);

    const groups = await this.prisma.group.findMany({
      where: { deletedAt: null, members: { some: {} } },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        monthlyFee: true,
        members: { select: { joinedAt: true, student: { select: { id: true, firstName: true, lastName: true, username: true } } } },
      },
    });
    const payments = groups.length
      ? await this.prisma.payment.findMany({
          where: { month, groupId: { in: groups.map((g: any) => g.id) } },
          select: { groupId: true, studentId: true, status: true, amount: true },
        })
      : [];
    const byKey = new Map<string, any>(payments.map((p: any) => [`${p.groupId}:${p.studentId}`, p]));

    const debtors: { studentId: string; name: string; username: string | null; groupId: string; groupName: string; monthlyFee: number | null }[] = [];
    const rows = groups.map((g: any) => {
      const students = g.members.map((m: any) => {
        const p = byKey.get(`${g.id}:${m.student.id}`);
        const s = {
          status: (p?.status ?? 'UNPAID') as PaymentState,
          amount: p?.amount ?? 0,
          due: monthEndsAfter(month, new Date(m.joinedAt)),
        };
        if (s.status === 'UNPAID' && s.due) {
          debtors.push({ studentId: m.student.id, name: fullName(m.student), username: m.student.username ?? null, groupId: g.id, groupName: g.name, monthlyFee: g.monthlyFee ?? null });
        }
        return s;
      });
      return { groupId: g.id, name: g.name, monthlyFee: g.monthlyFee ?? null, membersCount: g.members.length, ...this.totals(students, g.monthlyFee) };
    });

    const sum = (f: (r: (typeof rows)[number]) => number) => rows.reduce((a, r) => a + f(r), 0);
    return {
      month,
      totals: {
        collected: sum((r) => r.collected),
        expected: sum((r) => r.expected ?? 0),
        paid: sum((r) => r.paid),
        waived: sum((r) => r.waived),
        unpaid: sum((r) => r.unpaid),
      },
      groups: rows,
      debtors: debtors.slice(0, 200),
    };
  }

  /** O'quvchining o'z to'lov holati (oxirgi 6 oy). Faqat o'zi a'zo bo'lgan guruh uchun. */
  async myPayments(groupId: string, user: CurrentUserPayload, now: Date = new Date()) {
    const member = await this.prisma.groupMember.findUnique({
      where: { groupId_studentId: { groupId, studentId: user.id } },
      select: { joinedAt: true, group: { select: { monthlyFee: true, deletedAt: true } } },
    });
    if (!member || member.group.deletedAt) throw new NotFoundException('Guruh topilmadi');

    const cur = currentMonth(now);
    const months: string[] = [];
    for (let i = 0; i < 6; i++) {
      const idx = monthIndex(cur) - i;
      const m = `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`;
      if (monthEndsAfter(m, new Date(member.joinedAt))) months.push(m);
    }
    const rows = months.length
      ? await this.prisma.payment.findMany({ where: { groupId, studentId: user.id, month: { in: months } }, select: { month: true, status: true } })
      : [];
    const byMonth = new Map<string, PaymentState>(rows.map((r: any) => [r.month, r.status]));
    return {
      groupId,
      monthlyFee: member.group.monthlyFee ?? null,
      months: months.map((m) => ({ month: m, status: (byMonth.get(m) ?? 'UNPAID') as PaymentState })),
    };
  }
}
