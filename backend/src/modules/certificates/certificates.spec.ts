import { certCode, CertificatesService } from './certificates.service';

describe('CertificatesService', () => {
  it('kod 10 belgili', () => expect(certCode()).toMatch(/^[A-HJ-NP-Z2-9]{10}$/));

  const mk = () => {
    const prisma: any = {
      group: { findUnique: jest.fn().mockResolvedValue({ id: 'g1', name: 'Ingliz B1', teacherId: 't1', organizationId: 'o1', deletedAt: null, organization: { name: 'Maktab 1' } }) },
      groupMember: { findFirst: jest.fn().mockResolvedValue({ student: { firstName: 'Vali', lastName: 'Aliyev', deletedAt: null } }) },
      certificate: {
        create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'c1', ...data })),
        findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}), findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const notifications: any = { notify: jest.fn().mockResolvedValue({}) };
    return { prisma, notifications, svc: new CertificatesService(prisma, notifications) };
  };

  it("o'qituvchi o'z guruhi o'quvchisiga sertifikat beradi, ismlar nusxalanadi", async () => {
    const { svc, notifications } = mk();
    const c = await svc.issue({ id: 't1', role: 'TEACHER' } as any, { studentId: 's1', groupId: 'g1' });
    expect(c).toMatchObject({ studentName: 'Vali Aliyev', groupName: 'Ingliz B1', schoolName: 'Maktab 1', organizationId: 'o1' });
    expect(c.title).toContain('Ingliz B1');
    expect(notifications.notify).toHaveBeenCalled();
  });
  it("begona o'qituvchi, boshqa maktab admini rad etiladi", async () => {
    const { svc } = mk();
    await expect(svc.issue({ id: 't2', role: 'TEACHER' } as any, { studentId: 's1', groupId: 'g1' })).rejects.toThrow();
    await expect(svc.issue({ id: 'a', role: 'ADMIN', organizationId: 'o2' } as any, { studentId: 's1', groupId: 'g1' })).rejects.toThrow();
  });
  it("guruh a'zosi bo'lmagan o'quvchiga berilmaydi", async () => {
    const { svc, prisma } = mk();
    prisma.groupMember.findFirst.mockResolvedValue(null);
    await expect(svc.issue({ id: 't1', role: 'TEACHER' } as any, { studentId: 's9', groupId: 'g1' })).rejects.toThrow();
  });
  it('verify: ochiq maydonlargina qaytaradi, bekor qilingani valid=false', async () => {
    const { svc, prisma } = mk();
    prisma.certificate.findUnique.mockResolvedValue({ code: 'ABCDEFGH23', studentId: 'secret', studentName: 'Vali', title: 'T', groupName: 'G', schoolName: 'S', issuedAt: new Date(), revokedAt: new Date() });
    const r: any = await svc.verify('abcdefgh23');
    expect(r.valid).toBe(false);
    expect(r.studentId).toBeUndefined();
    await expect(svc.verify('!!')).rejects.toThrow();
    prisma.certificate.findUnique.mockResolvedValue(null);
    await expect(svc.verify('ABCDEFGH23')).rejects.toThrow();
  });
});
