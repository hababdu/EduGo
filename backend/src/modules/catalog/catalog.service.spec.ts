import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CatalogService } from './catalog.service';

function mk(over: any = {}) {
  const tx: any = {
    schoolReview: { upsert: jest.fn(), aggregate: jest.fn().mockResolvedValue({ _avg: { rating: 4.26 }, _count: 7 }) },
    organization: { update: jest.fn() },
  };
  const prisma: any = {
    organization: { count: jest.fn().mockResolvedValue(1), findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn().mockResolvedValue(over.org ?? null), update: jest.fn(), groupBy: jest.fn().mockResolvedValue([]) },
    organizationMembership: { findFirst: jest.fn().mockResolvedValue(over.member ?? null) },
    schoolReview: { groupBy: jest.fn().mockResolvedValue([{ rating: 5, _count: 2 }]), findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn((fn: any) => fn(tx)),
  };
  return { prisma, tx, svc: new CatalogService(prisma) };
}

describe('CatalogService', () => {
  it("katalog faqat faol va ochiq maktablarni, filtr va reyting bo'yicha saralab qaytaradi", async () => {
    const { svc, prisma } = mk();
    await svc.list({ search: 'abc', city: 'Toshkent', minRating: '4', sort: 'rating', page: '2' });
    const arg = prisma.organization.findMany.mock.calls[0][0];
    expect(arg.where).toMatchObject({ status: 'ACTIVE', isPublic: true, ratingAvg: { gte: 4 } });
    expect(arg.orderBy[0]).toEqual({ ratingAvg: 'desc' });
    expect(arg.skip).toBe(20);
    expect(arg.select).not.toHaveProperty('storageChatId');
  });
  it("noma'lum yoki yopiq maktab detali 404", async () => {
    await expect(mk().svc.detail('x')).rejects.toBeInstanceOf(NotFoundException);
  });
  it("sharh faqat a'zolarga; o'rtacha reyting qayta hisoblanadi (1 xonali)", async () => {
    await expect(mk().svc.review({ id: 'u1' } as any, 'o1', 5)).rejects.toBeInstanceOf(ForbiddenException);
    const { svc, tx } = mk({ member: { id: 'm1' } });
    await svc.review({ id: 'u1' } as any, 'o1', 5, ' zo\'r ');
    expect(tx.organization.update).toHaveBeenCalledWith({ where: { id: 'o1' }, data: { ratingAvg: 4.3, ratingCount: 7 } });
  });
});
