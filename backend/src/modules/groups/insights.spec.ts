import { InsightsService, lastMonths } from './insights.service';

describe('InsightsService', () => {
  const now = new Date('2026-10-25T06:00:00Z');
  const admin: any = { id: 'a', role: 'ADMIN', organizationId: 'o1' };

  it('lastMonths yil almashuvini to\'g\'ri hisoblaydi', () => {
    expect(lastMonths(3, new Date('2026-01-15T00:00:00Z'))).toEqual(['2025-11', '2025-12', '2026-01']);
  });

  it('finance: kutilgan/yig\'ilgan summa, imtiyoz hisobga olinmaydi, faqat o\'z maktabi', async () => {
    const joined = new Date('2026-01-01T00:00:00Z');
    const prisma: any = {
      group: { findMany: jest.fn().mockResolvedValue([{ id: 'g1', name: 'A', monthlyFee: 100, members: [
        { joinedAt: joined, studentId: 's1' }, { joinedAt: joined, studentId: 's2' }, { joinedAt: joined, studentId: 's3' },
      ] }]) },
      payment: { findMany: jest.fn().mockResolvedValue([
        { groupId: 'g1', studentId: 's1', month: '2026-10', status: 'PAID', amount: 100 },
        { groupId: 'g1', studentId: 's2', month: '2026-10', status: 'WAIVED', amount: 0 },
      ]) },
    };
    const r = await new InsightsService(prisma).finance(admin, 2, now);
    expect(prisma.group.findMany.mock.calls[0][0].where).toMatchObject({ organizationId: 'o1' });
    const cur = r.months[1];
    expect(cur).toMatchObject({ month: '2026-10', collected: 100, expected: 200, paid: 1, unpaid: 1, rate: 50 });
    expect(r.topGroups[0]).toMatchObject({ name: 'A', collected: 100 });
  });

  it('atRisk: davomati past yoki faolsiz o\'quvchilarni topadi', async () => {
    const recent = new Date('2026-10-24T00:00:00Z');
    const old = new Date('2026-09-01T00:00:00Z');
    const prisma: any = {
      user: { findMany: jest.fn().mockResolvedValue([
        { id: 's1', firstName: 'A', lastName: null, lastActiveAt: recent, groupMemberships: [{ group: { name: 'G' } }] },
        { id: 's2', firstName: 'B', lastName: null, lastActiveAt: old, groupMemberships: [{ group: { name: 'G' } }] },
        { id: 's3', firstName: 'C', lastName: null, lastActiveAt: recent, groupMemberships: [{ group: { name: 'G' } }] },
      ]) },
      attendanceRecord: { findMany: jest.fn().mockResolvedValue([
        { studentId: 's1', status: 'ABSENT' }, { studentId: 's1', status: 'ABSENT' }, { studentId: 's1', status: 'PRESENT' },
        { studentId: 's3', status: 'PRESENT' }, { studentId: 's3', status: 'PRESENT' }, { studentId: 's3', status: 'PRESENT' },
      ]) },
    };
    const r = await new InsightsService(prisma).atRisk(admin, now);
    expect(r.map((x) => x.studentId).sort()).toEqual(['s1', 's2']);
    expect(r.find((x) => x.studentId === 's1')!.reasons[0]).toContain('33%');
    expect(prisma.user.findMany.mock.calls[0][0].where).toMatchObject({ organizationId: 'o1', role: 'STUDENT' });
  });
});
