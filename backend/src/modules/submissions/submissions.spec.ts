import { SubmissionGradingService } from './submission-grading.service';

describe('SubmissionGradingService', () => {
  const mk = (claim = 1, aiImpl?: any) => {
    const prisma: any = {
      teacherAssignment: {
        updateMany: jest.fn().mockResolvedValue({ count: claim }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'a', title: 'T', description: null, teacherId: 't', maxScore: 100 }),
        update: jest.fn().mockResolvedValue({}),
      },
      assignmentSubmission: {
        findMany: jest.fn().mockResolvedValue([
          { id: 's1', studentId: 'u1', textAnswer: 'Javob matni', gradeAttempts: 0, files: [] },
          { id: 's2', studentId: 'u2', textAnswer: null, gradeAttempts: 0, files: [] },
        ]),
        update: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const ai: any = { completeJson: aiImpl ?? jest.fn().mockResolvedValue({ score: 250, feedback: 'ok', strengths: ['a'], improvements: [] }) };
    const ctx: any = { build: jest.fn().mockResolvedValue({ text: '' }), fileText: jest.fn() };
    const n: any = { notify: jest.fn().mockResolvedValue(undefined) };
    return { svc: new SubmissionGradingService(prisma, ai, ctx, n), prisma, ai };
  };

  it('ikkinchi marta claim bo\'lmasa baholamaydi', async () => {
    const { svc, ai } = mk(0);
    expect(await svc.gradeAssignment('a')).toBeNull();
    expect(ai.completeJson).not.toHaveBeenCalled();
  });

  it('ball maxScore ga qisqartiriladi, matnsiz javob NEEDS_REVIEW', async () => {
    const { svc, prisma } = mk();
    const r = await svc.gradeAssignment('a');
    expect(r).toEqual({ graded: 1, failed: 0, review: 1 });
    const calls = prisma.assignmentSubmission.update.mock.calls.map((c: any) => c[0].data);
    expect(calls.find((d: any) => d.status === 'GRADED').aiScore).toBe(100);
    expect(calls.find((d: any) => d.status === 'NEEDS_REVIEW')).toBeTruthy();
  });

  it('AI xatosi → FAILED, ichki xato matni sizdirilmaydi', async () => {
    const { svc, prisma } = mk(1, jest.fn().mockRejectedValue(new Error('secret key abc')));
    const r = await svc.gradeAssignment('a');
    expect(r?.failed).toBe(1);
    const d = prisma.assignmentSubmission.update.mock.calls.map((c: any) => c[0].data).find((x: any) => x.status === 'FAILED');
    expect(d.gradeError).toBe('AI baholay olmadi');
  });
});
