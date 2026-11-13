import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { DynamicEducationService } from './dynamic-education.service';

function setup(over: any = {}) {
  const prisma: any = {
    organization: { findUnique: jest.fn().mockResolvedValue({ id: 'org_12345' }) },
    organizationMembership: { findFirst: jest.fn().mockResolvedValue({ id: 'membership_1' }) },
    organizationEducationModel: {
      findUnique: jest.fn().mockResolvedValue(over.model ?? null),
      upsert: jest.fn().mockResolvedValue({ id: 'model_1' }),
    },
    organizationModuleConfig: {
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    organizationPolicy: {
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    organizationAcademicPeriod: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'period_1' }),
      update: jest.fn().mockResolvedValue({ id: 'period_1' }),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      findFirst: jest.fn().mockResolvedValue({ id: 'period_1', organizationId: 'org_12345', startsAt: new Date('2026-01-01'), endsAt: new Date('2026-12-31') }),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    $transaction: jest.fn(async (work: any) => work(prisma)),
  };
  return { prisma, service: new DynamicEducationService(prisma) };
}
const admin = { id: 'user_1', role: 'ADMIN', organizationId: 'org_12345', activeOrganizationId: 'org_12345' } as any;
const superAdmin = { id: 'root', role: 'SUPER_ADMIN', organizationId: null } as any;

describe('DynamicEducationService', () => {
  it('returns a configurable catalog of models, features and policies', async () => {
    const { service } = setup();
    const catalog = await service.catalog();
    expect(catalog.models.some((m) => m.key === 'SHORT_TERM')).toBe(true);
    expect(catalog.features.some((m) => m.key === 'ASSIGNMENTS')).toBe(true);
    expect(catalog.policies.some((m) => m.key === 'PAYMENT')).toBe(true);
  });

  it('requires organization admin membership for organization settings', async () => {
    const { service, prisma } = setup();
    prisma.organizationMembership.findFirst.mockResolvedValue(null);
    await expect(service.getConfig(admin)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requires an explicit organization for Super Admin and validates it', async () => {
    const { service } = setup();
    await expect(service.getConfig(superAdmin)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.getConfig(superAdmin, 'missing')).rejects.toBeInstanceOf(Error);
  });

  it('atomically saves model, module switches and organization policies', async () => {
    const { service, prisma } = setup();
    await service.saveConfig(admin, {
      modelKey: 'SHORT_TERM',
      settings: { attendanceMode: 'OPTIONAL' },
      modules: [
        { featureKey: 'GROUPS', enabled: true },
        { featureKey: 'TESTS', enabled: false },
      ],
      policies: [{ policyKey: 'PAYMENT', config: { mode: 'MONTHLY' } }],
    });
    expect(prisma.organizationEducationModel.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { organizationId: 'org_12345' },
      create: expect.objectContaining({ modelKey: 'SHORT_TERM' }),
    }));
    expect(prisma.organizationModuleConfig.deleteMany).toHaveBeenCalledWith({ where: { organizationId: 'org_12345' } });
    expect(prisma.organizationModuleConfig.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([expect.objectContaining({ featureKey: 'TESTS', enabled: false })]),
    }));
    expect(prisma.organizationPolicy.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: [expect.objectContaining({ policyKey: 'PAYMENT' })],
    }));
  });

  it('rejects unknown feature and policy keys', async () => {
    const { service } = setup();
    await expect(service.saveConfig(admin, { modelKey: 'CUSTOM', modules: [{ featureKey: 'HACK', enabled: true }] as any }))
      .rejects.toBeInstanceOf(BadRequestException);
    await expect(service.saveConfig(admin, { modelKey: 'CUSTOM', policies: [{ policyKey: 'HACK', config: {} }] as any }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('only activates one academic period per organization', async () => {
    const { service, prisma } = setup();
    await service.createPeriod(admin, { name: '2026/27', startsAt: '2026-09-01T00:00:00.000Z', endsAt: '2027-06-01T00:00:00.000Z', isActive: true });
    expect(prisma.organizationAcademicPeriod.updateMany).toHaveBeenCalledWith({
      where: { organizationId: 'org_12345', isActive: true }, data: { isActive: false },
    });
    expect(prisma.organizationAcademicPeriod.create).toHaveBeenCalled();
  });

  it('rejects invalid date ranges', async () => {
    const { service } = setup();
    await expect(service.createPeriod(admin, { name: 'Invalid', startsAt: '2026-09-01T00:00:00.000Z', endsAt: '2026-01-01T00:00:00.000Z' }))
      .rejects.toBeInstanceOf(BadRequestException);
  });
});
