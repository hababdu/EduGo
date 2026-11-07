import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SchoolsService } from './schools.service';

describe('SchoolsService', () => {
  const prisma: any = {
    organization: { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  let service: SchoolsService;
  beforeEach(() => { jest.clearAllMocks(); service = new SchoolsService(prisma); });

  it('lists only active and published schools', async () => {
    prisma.organization.findMany.mockReturnValue(Promise.resolve([{ id: 's1', name: 'School' }]));
    prisma.organization.count.mockReturnValue(Promise.resolve(1));
    prisma.$transaction.mockImplementation((operations: any[]) => Promise.all(operations));
    const result = await service.listPublic({ page: 1, limit: 12 });
    expect(result.pagination.total).toBe(1);
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.organization.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: 'ACTIVE', publiclyListed: true }),
    }));
  });

  it('does not reveal unpublished schools', async () => {
    prisma.organization.findFirst.mockResolvedValue(null);
    await expect(service.getPublic('hidden-school')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.organization.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ publiclyListed: true, status: 'ACTIVE' }),
    }));
  });

  it('rejects school creation by a non-super-admin', async () => {
    prisma.user.findUnique.mockResolvedValue({ role: 'ADMIN', status: 'ACTIVE', deletedAt: null });
    await expect(service.create('admin1', { name: 'School' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.organization.create).not.toHaveBeenCalled();
  });
});
