import { DashboardService } from './dashboard.service';

function build(rows: { createdAt: Date; amount: number }[]) {
  const findMany = jest.fn().mockResolvedValue(rows);
  const prisma: any = { xpTransaction: { findMany } };
  return { svc: new DashboardService(prisma), findMany };
}
// 2026-10-03 20:00 UTC = 2026-10-04 01:00 Toshkent -> "bugun" 4-oktabr
const NOW = new Date('2026-10-03T20:00:00Z');

describe('DashboardService.getMyActivity', () => {
  it("faqat token'dagi o'quvchi uchun so'raydi va bo'sh kunlarni 0 bilan to'ldiradi", async () => {
    const { svc, findMany } = build([]);
    const r = await svc.getMyActivity('stu-1', 7, NOW);
    expect(findMany.mock.calls[0][0].where.studentId).toBe('stu-1');
    expect(r.days).toHaveLength(7);
    expect(r.days[6].date).toBe('2026-10-04');
    expect(r.days[0].date).toBe('2026-09-28');
    expect(r.days.every((d) => d.xp === 0 && d.count === 0)).toBe(true);
    expect(r.activeDays).toBe(0);
  });
  it("kunni Toshkent vaqti bo'yicha hisoblaydi (UTC 20:00 -> ertasi kun)", async () => {
    const { svc } = build([
      { createdAt: new Date('2026-10-03T18:59:00Z'), amount: 10 }, // Toshkent 23:59, 3-okt
      { createdAt: new Date('2026-10-03T19:00:00Z'), amount: 20 }, // Toshkent 00:00, 4-okt
      { createdAt: new Date('2026-10-03T19:30:00Z'), amount: 5 },
    ]);
    const r = await svc.getMyActivity('s', 7, NOW);
    const d3 = r.days.find((d) => d.date === '2026-10-03')!;
    const d4 = r.days.find((d) => d.date === '2026-10-04')!;
    expect(d3).toMatchObject({ xp: 10, count: 1 });
    expect(d4).toMatchObject({ xp: 25, count: 2 });
    expect(r.activeDays).toBe(2);
  });
  it("kunlar sonini 7..120 oralig'iga siqadi; noto'g'ri qiymat — 84", async () => {
    const { svc } = build([]);
    expect((await svc.getMyActivity('s', 9999, NOW)).days).toHaveLength(120);
    expect((await svc.getMyActivity('s', 1, NOW)).days).toHaveLength(7);
    expect((await svc.getMyActivity('s', NaN, NOW)).days).toHaveLength(84);
    expect((await svc.getMyActivity('s', undefined, NOW)).days).toHaveLength(84);
  });
  it("manfiy XP faollikni kamaytirmaydi (0 dan past bo'lmaydi)", async () => {
    const { svc } = build([{ createdAt: new Date('2026-10-04T05:00:00Z'), amount: -30 }]);
    const r = await svc.getMyActivity('s', 7, NOW);
    expect(r.days[6]).toMatchObject({ xp: 0, count: 1 });
  });
});
