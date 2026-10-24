import { TeacherService } from './teacher.service';
import { DashboardService } from '../dashboard/dashboard.service';

describe('TeacherService.getTodo', () => {
  it('baholash navbati va davomati past o\'quvchilarni qaytaradi', async () => {
    const A = { id: 'a1', title: 'HW1', group: { id: 'g1', name: 'G1' } };
    const rec = (studentId: string, status: string) => ({
      groupId: 'g1', studentId, status, group: { name: 'G1' }, student: { firstName: studentId, lastName: null, deletedAt: null },
    });
    const prisma: any = {
      assignmentSubmission: { findMany: jest.fn().mockResolvedValue([{ assignment: A }, { assignment: A }]) },
      attendanceRecord: {
        findMany: jest.fn().mockResolvedValue([
          rec('s1', 'ABSENT'), rec('s1', 'ABSENT'), rec('s1', 'PRESENT'),
          rec('s2', 'PRESENT'), rec('s2', 'PRESENT'), rec('s2', 'PRESENT'),
          rec('s3', 'ABSENT'), // 3 tadan kam — hisobga olinmaydi
        ]),
      },
    };
    const svc = new TeacherService(prisma, {} as any, {} as any, {} as any);
    const r = await svc.getTodo('t1');
    expect(r.toGradeTotal).toBe(2);
    expect(r.toGrade[0]).toMatchObject({ assignmentId: 'a1', pending: 2 });
    expect(r.atRisk).toHaveLength(1);
    expect(r.atRisk[0]).toMatchObject({ studentId: 's1', attendancePct: 33 });
    expect(prisma.assignmentSubmission.findMany.mock.calls[0][0].where.assignment.teacherId).toBe('t1');
  });
});

describe('DashboardService.myTasks', () => {
  it('topshirilmaganlar oldinda, muddati o\'tgani belgilanadi', async () => {
    const past = new Date(Date.now() - 86_400_000);
    const prisma: any = {
      groupMember: { findMany: jest.fn().mockResolvedValue([{ groupId: 'g1' }]) },
      teacherAssignment: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'x', title: 'Done', dueAt: null, maxScore: 100, group: { id: 'g1', name: 'G' }, submissions: [{ status: 'GRADED', aiScore: 80, teacherScore: null }] },
          { id: 'y', title: 'Late', dueAt: past, maxScore: 100, group: { id: 'g1', name: 'G' }, submissions: [] },
        ]),
      },
    };
    const svc = new (DashboardService as any)(prisma);
    const r = await svc.myTasks('s1');
    expect(r.map((t: any) => t.id)).toEqual(['y', 'x']);
    expect(r[0]).toMatchObject({ state: 'PENDING', overdue: true });
    expect(r[1]).toMatchObject({ state: 'GRADED', score: 80 });
  });
});

describe('DashboardService.myStanding', () => {
  it('davomat foizi va oylik to\'lov holatini hisoblaydi', async () => {
    const prisma: any = {
      groupMember: { findMany: jest.fn().mockResolvedValue([
        { group: { id: 'g1', name: 'A', monthlyFee: 100000 } },
        { group: { id: 'g2', name: 'B', monthlyFee: null } },
      ]) },
      attendanceRecord: { findMany: jest.fn().mockResolvedValue([
        { groupId: 'g1', status: 'PRESENT' }, { groupId: 'g1', status: 'ABSENT' },
      ]) },
      payment: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const svc = new (DashboardService as any)(prisma);
    const r = await svc.myStanding('s1');
    expect(r[0]).toMatchObject({ groupId: 'g1', attendancePct: 50, absent: 1, payment: 'UNPAID' });
    expect(r[1]).toMatchObject({ attendancePct: null, payment: 'NONE' });
  });
});

describe('TeacherService.getGroupSubmissionStats', () => {
  it("faqat o'z guruhi uchun, topshirilgan va baholanganlarni sanaydi", async () => {
    const prisma: any = {
      group: { findFirst: jest.fn().mockResolvedValue({ id: 'g1', _count: { members: 5 } }) },
      teacherAssignment: { findMany: jest.fn().mockResolvedValue([
        { id: 'a', title: 'HW', dueAt: null, submissions: [{ status: 'GRADED', teacherScore: null }, { status: 'NEEDS_REVIEW', teacherScore: null }, { status: 'SUBMITTED', teacherScore: 7 }] },
      ]) },
    };
    const svc = new TeacherService(prisma, {} as any, {} as any, {} as any);
    const r = await svc.getGroupSubmissionStats('t1', 'g1');
    expect(r[0]).toMatchObject({ total: 5, submitted: 3, graded: 2 });
    expect(prisma.group.findFirst.mock.calls[0][0].where.teacherId).toBe('t1');
    prisma.group.findFirst.mockResolvedValue(null);
    await expect(svc.getGroupSubmissionStats('t2', 'g1')).rejects.toThrow();
  });
});
