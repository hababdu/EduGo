import { ForbiddenException } from '@nestjs/common';
import { EducationFeatureGuard } from './education-feature.guard';

describe('EducationFeatureGuard', () => {
  const context = (user: any, metadata: string | undefined = 'TESTS') => ({
    getHandler: () => ({}), getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as any);
  const reflector: any = { getAllAndOverride: jest.fn().mockReturnValue('TESTS') };
  const prisma: any = { organizationModuleConfig: { findUnique: jest.fn().mockResolvedValue({ enabled: false }) } };

  beforeEach(() => { jest.clearAllMocks(); reflector.getAllAndOverride.mockReturnValue('TESTS'); prisma.organizationModuleConfig.findUnique.mockResolvedValue({ enabled: false }); });

  it('does not block routes without feature metadata', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(await new EducationFeatureGuard(reflector, prisma).canActivate(context({ id: 'u' }))).toBe(true);
    expect(prisma.organizationModuleConfig.findUnique).not.toHaveBeenCalled();
  });

  it('bypasses global super admin', async () => {
    expect(await new EducationFeatureGuard(reflector, prisma).canActivate(context({ id: 'root', role: 'SUPER_ADMIN' }))).toBe(true);
    expect(prisma.organizationModuleConfig.findUnique).not.toHaveBeenCalled();
  });

  it('blocks explicitly disabled organization module', async () => {
    await expect(new EducationFeatureGuard(reflector, prisma).canActivate(context({ id: 'u', role: 'STUDENT', activeOrganizationId: 'org1' })))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.organizationModuleConfig.findUnique).toHaveBeenCalledWith({
      where: { organizationId_featureKey: { organizationId: 'org1', featureKey: 'TESTS' } }, select: { enabled: true },
    });
  });

  it('allows missing config for legacy organizations', async () => {
    prisma.organizationModuleConfig.findUnique.mockResolvedValue(null);
    expect(await new EducationFeatureGuard(reflector, prisma).canActivate(context({ id: 'u', role: 'STUDENT', activeOrganizationId: 'org1' }))).toBe(true);
  });
});
