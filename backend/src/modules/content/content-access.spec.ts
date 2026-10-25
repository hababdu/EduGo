import { assertCanEditContent, assertCanSeeContent } from './content-access';

describe('content-access', () => {
  const chain = (org: string | null) => ({ createdBy: { organizationId: org } });
  const mk = (org: string | null) => {
    const prisma: any = {
      subject: { findUnique: jest.fn().mockResolvedValue({ course: chain(org) }) },
      section: { findUnique: jest.fn().mockResolvedValue({ subject: { course: chain(org) } }) },
      topic: { findUnique: jest.fn().mockResolvedValue({ section: { subject: { course: chain(org) } } }) },
      lesson: { findUnique: jest.fn().mockResolvedValue({ topic: { section: { subject: { course: chain(org) } } } }) },
    };
    return prisma;
  };
  const teacherA: any = { id: 't', role: 'TEACHER', organizationId: 'A' };
  const superU: any = { id: 's', role: 'SUPER_ADMIN' };

  it("o'z maktabi kontentini hamma darajada o'zgartiradi", async () => {
    for (const lvl of ['subject', 'section', 'topic', 'lesson'] as const) {
      await expect(assertCanEditContent(mk('A'), teacherA, lvl, 'x')).resolves.toBeUndefined();
    }
  });
  it("boshqa maktab yoki platforma kontentini o'zgartira olmaydi", async () => {
    for (const lvl of ['subject', 'section', 'topic', 'lesson'] as const) {
      await expect(assertCanEditContent(mk('B'), teacherA, lvl, 'x')).rejects.toThrow();
      await expect(assertCanEditContent(mk(null), teacherA, lvl, 'x')).rejects.toThrow();
    }
  });
  it("super admin hamma kontentni o'zgartiradi", async () => {
    await expect(assertCanEditContent(mk('B'), superU, 'lesson', 'x')).resolves.toBeUndefined();
  });
  it("ko'rish: o'z maktabi va platforma ochiq, boshqa maktab yopiq (404)", async () => {
    await expect(assertCanSeeContent(mk('A'), teacherA, 'topic', 'x')).resolves.toBeUndefined();
    await expect(assertCanSeeContent(mk(null), teacherA, 'topic', 'x')).resolves.toBeUndefined();
    await expect(assertCanSeeContent(mk('B'), teacherA, 'topic', 'x')).rejects.toThrow();
  });
  it('mavjud bo\'lmasa 404', async () => {
    const p = mk('A'); p.lesson.findUnique.mockResolvedValue(null);
    await expect(assertCanEditContent(p, teacherA, 'lesson', 'x')).rejects.toThrow();
  });
});
