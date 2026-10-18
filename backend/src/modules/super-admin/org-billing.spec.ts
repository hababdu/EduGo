import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrgBillingService } from './org-billing.service';
import { currentMonth } from '../groups/payments.service';

const SA: any = { id: 'sa', role: 'SUPER_ADMIN', organizationId: null };

function make(over: Partial<Record<string, any>> = {}) {
  const prisma: any = {
    organization: { findUnique: jest.fn().mockResolvedValue({ id: 'o1', name: 'A', monthlyPlanFee: 500000 }), findMany: jest.fn().mockResolvedValue([]) },
    orgPayment: { findUnique: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]), upsert: jest.fn().mockResolvedValue({}), deleteMany: jest.fn().mockResolvedValue({}) },
    adminActionLog: { create: jest.fn().mockResolvedValue({}) },
    ...over,
  };
  return { svc: new OrgBillingService(prisma), prisma };
}

describe('OrgBillingService (maktab → super admin obunasi)', () => {
  const month = currentMonth();

  it("summa berilmasa maktabning oylik narxini oladi", async () => {
    const { svc, prisma } = make();
    const r = await svc.mark(SA, 'o1', { month, status: 'PAID' });
    expect(r.amount).toBe(500000);
    expect(prisma.orgPayment.upsert.mock.calls[0][0].create).toMatchObject({ organizationId: 'o1', amount: 500000, markedById: 'sa' });
  });

  it("narx ham, summa ham yo'q bo'lsa PAID rad etiladi", async () => {
    const { svc } = make({ organization: { findUnique: jest.fn().mockResolvedValue({ id: 'o1', monthlyPlanFee: null }) } });
    await expect(svc.mark(SA, 'o1', { month, status: 'PAID' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('UNPAID yozuvni o\'chiradi, WAIVED summa 0', async () => {
    const { svc, prisma } = make();
    await svc.mark(SA, 'o1', { month, status: 'UNPAID' });
    expect(prisma.orgPayment.deleteMany).toHaveBeenCalled();
    const r = await svc.mark(SA, 'o1', { month, status: 'WAIVED', amount: 999 });
    expect(r.amount).toBe(0);
  });

  it("kelajak oyi rad etiladi, noma'lum maktab 404", async () => {
    const { svc } = make();
    await expect(svc.mark(SA, 'o1', { month: '2099-01', status: 'PAID', amount: 1 })).rejects.toBeInstanceOf(BadRequestException);
    const m = make({ organization: { findUnique: jest.fn().mockResolvedValue(null) } });
    await expect(m.svc.mark(SA, 'zz', { month, status: 'PAID', amount: 1 })).rejects.toBeInstanceOf(NotFoundException);
  });

  it("admin faqat o'z maktabini ko'radi; maktabsiz admin — 404", async () => {
    const { svc, prisma } = make();
    const r = await svc.mine({ id: 'a1', role: 'ADMIN', organizationId: 'o1' } as any);
    expect(prisma.organization.findUnique.mock.calls[0][0].where.id).toBe('o1');
    expect(r.state).toBe('UNPAID');
    await expect(svc.mine({ id: 'a2', role: 'ADMIN', organizationId: null } as any)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('overview: yig\'ilgan va qarzdor maktablar', async () => {
    const { svc } = make({
      organization: { findMany: jest.fn().mockResolvedValue([
        { id: 'a', name: 'A', status: 'ACTIVE', monthlyPlanFee: 100 },
        { id: 'b', name: 'B', status: 'ACTIVE', monthlyPlanFee: 200 },
        { id: 'c', name: 'C', status: 'SUSPENDED', monthlyPlanFee: 300 },
      ]) },
      orgPayment: { findMany: jest.fn().mockResolvedValue([{ organizationId: 'a', status: 'PAID', amount: 100, note: null, paidAt: new Date() }]) },
    });
    const r = await svc.overview(month);
    expect(r.totals).toMatchObject({ paid: 1, unpaid: 1, collected: 100, expected: 300 });
  });
});
