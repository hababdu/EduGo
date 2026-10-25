import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { orgWhere } from '../../common/org-scope';
import { PrismaService } from '../../prisma/prisma.service';
import { currentMonth, monthEndsAfter, parseMonth } from './payments.service';

const TZ_OFFSET_MS = 5 * 3_600_000;
const PAY_UZ: Record<string, string> = { PAID: "To'lagan", WAIVED: 'Imtiyoz', UNPAID: "To'lamagan" };

/** Oyning [boshi, keyingi oy boshi) — Toshkent kunlari (DATE ustuni uchun UTC yarim tun). */
export function monthRange(month: string): { from: Date; to: Date } {
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  return { from: new Date(Date.UTC(y, m - 1, 1)), to: new Date(Date.UTC(y, m, 1)) };
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Maktab (admin) uchun oylik hisobot: to'lovlar va davomat. SUPER_ADMIN — hammasi. */
  async monthlyXlsx(user: CurrentUserPayload, monthInput?: string, now: Date = new Date()): Promise<{ buffer: Buffer; fileName: string }> {
    const month = parseMonth(monthInput ?? currentMonth(now), now);
    const { from, to } = monthRange(month);

    const groups = await this.prisma.group.findMany({
      where: { deletedAt: null, ...orgWhere(user) },
      orderBy: { name: 'asc' },
      select: {
        id: true, name: true, monthlyFee: true,
        teacher: { select: { firstName: true, lastName: true } },
        members: { select: { joinedAt: true, student: { select: { id: true, firstName: true, lastName: true, username: true, phone: true } } } },
      },
    });
    const ids = groups.map((g) => g.id);
    const [payments, attendance] = ids.length
      ? await Promise.all([
          this.prisma.payment.findMany({ where: { month, groupId: { in: ids } }, select: { groupId: true, studentId: true, status: true, amount: true, paidAt: true } }),
          this.prisma.attendanceRecord.findMany({ where: { groupId: { in: ids }, date: { gte: from, lt: to } }, select: { groupId: true, studentId: true, status: true } }),
        ])
      : [[], []];

    const payBy = new Map(payments.map((p) => [`${p.groupId}:${p.studentId}`, p]));
    const attBy = new Map<string, { present: number; absent: number; excused: number }>();
    for (const a of attendance) {
      const k = `${a.groupId}:${a.studentId}`;
      const c = attBy.get(k) ?? { present: 0, absent: 0, excused: 0 };
      if (a.status === 'PRESENT') c.present++; else if (a.status === 'ABSENT') c.absent++; else c.excused++;
      attBy.set(k, c);
    }
    const name = (u: { firstName: string; lastName?: string | null }) => `${u.firstName} ${u.lastName ?? ''}`.trim();

    const wb = new ExcelJS.Workbook();
    wb.created = now;
    const sPay = wb.addWorksheet("To'lovlar");
    sPay.columns = [
      { header: 'Guruh', key: 'g', width: 24 }, { header: "O'qituvchi", key: 't', width: 24 }, { header: "O'quvchi", key: 's', width: 28 },
      { header: 'Telefon', key: 'ph', width: 16 }, { header: "Oylik to'lov (so'm)", key: 'fee', width: 18 },
      { header: 'Holat', key: 'st', width: 14 }, { header: "To'langan (so'm)", key: 'am', width: 16 }, { header: 'Sana', key: 'dt', width: 14 },
    ];
    const sAtt = wb.addWorksheet('Davomat');
    sAtt.columns = [
      { header: 'Guruh', key: 'g', width: 24 }, { header: "O'quvchi", key: 's', width: 28 }, { header: 'Keldi', key: 'p', width: 10 },
      { header: 'Kelmadi', key: 'a', width: 10 }, { header: 'Sababli', key: 'e', width: 10 }, { header: 'Davomat %', key: 'pc', width: 12 },
    ];

    let collected = 0, expected = 0, debtors = 0;
    for (const g of groups) {
      const teacher = g.teacher ? name(g.teacher) : '';
      for (const m of g.members) {
        const due = monthEndsAfter(month, new Date(m.joinedAt));
        const p = payBy.get(`${g.id}:${m.student.id}`);
        const status = p?.status ?? 'UNPAID';
        if (due && g.monthlyFee && status !== 'WAIVED') expected += g.monthlyFee;
        if (status === 'PAID') collected += p?.amount ?? 0;
        if (due && status === 'UNPAID') debtors++;
        sPay.addRow({
          g: g.name, t: teacher, s: name(m.student), ph: m.student.phone ?? '', fee: g.monthlyFee ?? '',
          st: due || p ? PAY_UZ[status] : 'Oy oxirida qo\'shilgan', am: p?.amount ?? 0, dt: p?.paidAt ? new Date(p.paidAt.getTime() + TZ_OFFSET_MS).toISOString().slice(0, 10) : '',
        });
        const c = attBy.get(`${g.id}:${m.student.id}`) ?? { present: 0, absent: 0, excused: 0 };
        const tot = c.present + c.absent + c.excused;
        sAtt.addRow({ g: g.name, s: name(m.student), p: c.present, a: c.absent, e: c.excused, pc: tot ? Math.round((c.present * 100) / tot) : '' });
      }
    }
    sPay.addRow({});
    sPay.addRow({ g: 'JAMI', s: `Qarzdorlar: ${debtors}`, fee: `Kutilgan: ${expected}`, am: collected });
    for (const ws of [sPay, sAtt]) { ws.getRow(1).font = { bold: true }; ws.views = [{ state: 'frozen', ySplit: 1 }]; }

    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    return { buffer, fileName: `hisobot_${month}.xlsx` };
  }
}
