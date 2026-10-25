import { LeadsService } from './leads.service';

describe('LeadsService', () => {
  const admin: any = { id: 'a1', role: 'ADMIN', organizationId: 'o1' };
  const mk = () => {
    const prisma: any = {
      lead: {
        findMany: jest.fn().mockResolvedValue([]),
        groupBy: jest.fn().mockResolvedValue([{ status: 'NEW', _count: { _all: 3 } }]),
        create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'l1', ...data })),
        findUnique: jest.fn().mockResolvedValue({ id: 'l1', organizationId: 'o1' }),
        update: jest.fn().mockResolvedValue({}), delete: jest.fn().mockResolvedValue({}),
      },
    };
    return { prisma, svc: new LeadsService(prisma) };
  };

  it("ro'yxat o'z maktabi bilan cheklanadi va holat bo'yicha sanaydi", async () => {
    const { svc, prisma } = mk();
    const r = await svc.list(admin, 'NEW');
    expect(prisma.lead.findMany.mock.calls[0][0].where).toEqual({ organizationId: 'o1', status: 'NEW' });
    expect(r.counts).toMatchObject({ NEW: 3, TRIAL: 0 });
  });
  it("yaratishda maktab va muallif serverdan olinadi", async () => {
    const { svc } = mk();
    const l: any = await svc.create(admin, { name: ' Ali ', phone: '+998901234567' });
    expect(l).toMatchObject({ organizationId: 'o1', createdById: 'a1', name: 'Ali' });
  });
  it("boshqa maktab arizasini o'zgartirib/o'chirib bo'lmaydi", async () => {
    const { svc, prisma } = mk();
    prisma.lead.findUnique.mockResolvedValue({ id: 'l9', organizationId: 'o2' });
    await expect(svc.update(admin, 'l9', { status: 'LOST' })).rejects.toThrow();
    await expect(svc.remove(admin, 'l9')).rejects.toThrow();
    expect(prisma.lead.update).not.toHaveBeenCalled();
  });
  it("faqat maktab admini kira oladi", async () => {
    const { svc } = mk();
    await expect(svc.list({ id: 't', role: 'TEACHER', organizationId: 'o1' } as any)).rejects.toThrow();
    await expect(svc.list({ id: 's', role: 'SUPER_ADMIN' } as any)).rejects.toThrow();
  });
  it('holatni va qayta aloqa sanasini yangilaydi', async () => {
    const { svc, prisma } = mk();
    await svc.update(admin, 'l1', { status: 'TRIAL', nextContactAt: null });
    expect(prisma.lead.update.mock.calls[0][0].data).toEqual({ status: 'TRIAL', nextContactAt: null });
  });
});
