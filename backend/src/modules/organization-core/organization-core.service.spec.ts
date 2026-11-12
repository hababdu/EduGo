import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrganizationCoreService } from './organization-core.service';

function setup(over: any = {}) {
  const prisma: any = {
    organization: {
      findUnique: jest.fn().mockResolvedValue(over.organization ?? { id: 'org_12345', name: 'Edu' }),
      update: jest.fn().mockResolvedValue({ id: 'org_12345' }),
    },
    organizationType: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(over.type === undefined ? { id: 'type_12345' } : over.type),
    },
    educationDirection: {
      findMany: jest.fn().mockResolvedValue(over.directions ?? [{ id: 'dir_12345' }]),
    },
    organizationDirection: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
      count: jest.fn().mockResolvedValue(0),
    },
    organizationMembership: {
      findFirst: jest.fn().mockResolvedValue({ id: 'membership_1', role: 'TEACHER', organizationId: 'org_12345' }),
    },
    userActiveOrganization: {
      upsert: jest.fn().mockResolvedValue({ userId: 'user_12345', organizationId: 'org_12345' }),
    },
    $transaction: jest.fn(async (work: any) => work(prisma)),
  };
  return { prisma, service: new OrganizationCoreService(prisma) };
}

describe('OrganizationCoreService', () => {
  it('returns active organization types in configured order', async () => {
    const { service, prisma } = setup();
    await service.listTypes();
    expect(prisma.organizationType.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { nameUz: 'asc' }],
    }));
  });

  it('filters active directions by optional category', async () => {
    const { service, prisma } = setup();
    await service.listDirections('technology');
    expect(prisma.educationDirection.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { isActive: true, category: 'technology' },
    }));
  });

  it('assigns one type and multiple unique directions atomically', async () => {
    const { service, prisma } = setup({
      directions: [{ id: 'dir_12345' }, { id: 'dir_67890' }],
    });
    await service.classifyOrganization('org_12345', 'type_12345', ['dir_12345', 'dir_12345', 'dir_67890']);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.organization.update).toHaveBeenCalledWith({
      where: { id: 'org_12345' }, data: { typeId: 'type_12345' },
    });
    expect(prisma.organizationDirection.createMany).toHaveBeenCalledWith({
      data: [{ organizationId: 'org_12345', directionId: 'dir_12345' }, { organizationId: 'org_12345', directionId: 'dir_67890' }],
    });
  });

  it('sets active organization only when the user has an active membership', async () => {
    const { service, prisma } = setup();
    const result = await service.setActiveOrganization('user_12345', 'org_12345');
    expect(result).toEqual({ ok: true, organizationId: 'org_12345', role: 'TEACHER' });
    expect(prisma.userActiveOrganization.upsert).toHaveBeenCalledWith({
      where: { userId: 'user_12345' },
      create: { userId: 'user_12345', organizationId: 'org_12345' },
      update: { organizationId: 'org_12345' },
    });
  });

  it('rejects switching to an organization without an active membership', async () => {
    const { service, prisma } = setup();
    prisma.organizationMembership.findFirst.mockResolvedValue(null);
    await expect(service.setActiveOrganization('user_12345', 'org_12345')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects unknown organizations, inactive types and unknown directions', async () => {
    await expect(setup({ organization: null }).service.classifyOrganization('org_12345', 'type_12345', []))
      .rejects.toBeInstanceOf(NotFoundException);
    await expect(setup({ type: null }).service.classifyOrganization('org_12345', 'type_12345', []))
      .rejects.toBeInstanceOf(BadRequestException);
    await expect(setup({ directions: [] }).service.classifyOrganization('org_12345', 'type_12345', ['dir_12345']))
      .rejects.toBeInstanceOf(BadRequestException);
  });
});
