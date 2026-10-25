import { SubmissionsService } from './submissions.service';

describe('SubmissionsService — qaytarish va qayta topshirish', () => {
  const hw = (over: any = {}) => ({ id: 'a1', title: 'HW', groupId: 'g1', teacherId: 't1', status: 'PUBLISHED', category: 'HOMEWORK', dueAt: new Date(Date.now() - 1000), gradingStatus: 'DONE', maxScore: 100, ...over });
  const mk = (subStatus: string | null, assignment = hw()) => {
    const row = subStatus ? { id: 'sub1', status: subStatus, files: [], studentId: 's1' } : null;
    const prisma: any = {
      teacherAssignment: { findFirst: jest.fn().mockResolvedValue(assignment), findUnique: jest.fn().mockResolvedValue(assignment) },
      groupMember: { findFirst: jest.fn().mockResolvedValue({ id: 'm' }) },
      assignmentSubmission: {
        findUnique: jest.fn().mockResolvedValue(row),
        update: jest.fn().mockResolvedValue({ id: 'sub1' }),
        create: jest.fn().mockResolvedValue({ id: 'sub1' }),
      },
      materialFile: { findMany: jest.fn().mockResolvedValue([]), updateMany: jest.fn(), delete: jest.fn(), count: jest.fn() },
      $transaction: jest.fn().mockImplementation((fn: any) => fn(prisma)),
    };
    const notifications: any = { notify: jest.fn().mockResolvedValue({}) };
    const svc = new SubmissionsService(prisma, notifications, { toDto: (f: any) => f } as any, { remove: jest.fn() } as any);
    jest.spyOn(svc as any, 'loadHomework').mockResolvedValue(assignment);
    jest.spyOn(svc, 'getMine').mockResolvedValue({} as any);
    return { prisma, notifications, svc };
  };
  const student: any = { id: 's1', role: 'STUDENT' };

  it("muddati tugagan bo'lsa ham qaytarilgan topshiriq qayta topshiriladi va baho tozalanadi", async () => {
    const { svc, prisma } = mk('RETURNED');
    await svc.submit(student, 'a1', { textAnswer: 'yangi javob' });
    const data = prisma.assignmentSubmission.update.mock.calls[0][0].data;
    expect(data).toMatchObject({ textAnswer: 'yangi javob', status: 'NEEDS_REVIEW', aiScore: null, teacherScore: null, returnNote: null });
  });
  it("baholash hali ochiq bo'lsa SUBMITTED bo'ladi", async () => {
    const { svc, prisma } = mk('RETURNED', hw({ gradingStatus: 'PENDING', dueAt: null }));
    await svc.submit(student, 'a1', { textAnswer: 'x y' });
    expect(prisma.assignmentSubmission.update.mock.calls[0][0].data.status).toBe('SUBMITTED');
  });
  it("qaytarilmagan topshiriq muddatdan keyin topshirilmaydi", async () => {
    const { svc } = mk('GRADED');
    await expect(svc.submit(student, 'a1', { textAnswer: 'x y' })).rejects.toThrow();
  });
  it("o'qituvchi qaytaradi va o'quvchiga xabar ketadi", async () => {
    const { svc, prisma, notifications } = mk('GRADED');
    prisma.assignmentSubmission.findUnique.mockResolvedValue({ id: 'sub1', studentId: 's1', assignment: { id: 'a1', title: 'HW', teacherId: 't1', deletedAt: null, group: { organizationId: 'o1' } } });
    await svc.returnForFix({ id: 't1', role: 'TEACHER' } as any, 'sub1', { note: 'Ikkinchi misolni tuzating' });
    expect(prisma.assignmentSubmission.update.mock.calls[0][0].data).toMatchObject({ status: 'RETURNED', returnNote: 'Ikkinchi misolni tuzating' });
    expect(notifications.notify).toHaveBeenCalled();
  });
  it("boshqa o'qituvchi yoki boshqa maktab admini qaytara olmaydi", async () => {
    const { svc, prisma } = mk('GRADED');
    prisma.assignmentSubmission.findUnique.mockResolvedValue({ id: 'sub1', studentId: 's1', assignment: { id: 'a1', title: 'HW', teacherId: 't1', deletedAt: null, group: { organizationId: 'o1' } } });
    await expect(svc.returnForFix({ id: 't2', role: 'TEACHER' } as any, 'sub1', { note: 'abc' })).rejects.toThrow();
    await expect(svc.returnForFix({ id: 'a', role: 'ADMIN', organizationId: 'o2' } as any, 'sub1', { note: 'abc' })).rejects.toThrow();
  });
});
