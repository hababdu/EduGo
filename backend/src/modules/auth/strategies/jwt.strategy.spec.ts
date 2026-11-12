import { JwtStrategy } from './jwt.strategy';

function setup(over: any = {}) {
  const prisma: any = {
    user: { findUnique: jest.fn().mockResolvedValue(over.user ?? {
      id: 'u1', telegramId: '1001', role: 'STUDENT', status: 'ACTIVE', deletedAt: null,
      organizationId: 'legacy-org', activeRole: null, activeOrganizationContext: null,
    }) },
    organizationMembership: {
      findFirst: jest.fn().mockResolvedValue(over.membership ?? { role: 'TEACHER', organization: { status: 'ACTIVE' } }),
    },
    userActiveOrganization: { deleteMany: jest.fn() },
  };
  const config: any = { get: jest.fn((key: string) => key === 'JWT_SECRET' ? 'test-secret' : undefined) };
  return { prisma, strategy: new JwtStrategy(config, prisma) };
}

describe('JwtStrategy active organization context', () => {
  it('does not infer active organization from legacy User.organizationId', async () => {
    const { prisma, strategy } = setup();
    const user = await strategy.validate({ sub: 'u1', role: 'STUDENT' });
    expect(user.organizationId).toBeNull();
    expect(user.activeOrganizationId).toBeNull();
    expect(prisma.organizationMembership.findFirst).not.toHaveBeenCalled();
  });

  it('resolves organization role from the selected active membership', async () => {
    const { prisma, strategy } = setup({
      user: {
        id: 'u1', telegramId: '1001', role: 'STUDENT', status: 'ACTIVE', deletedAt: null,
        organizationId: 'legacy-org', activeRole: null,
        activeOrganizationContext: { organizationId: 'org-teaching', organization: { status: 'ACTIVE' } },
      },
      membership: { role: 'TEACHER', organization: { status: 'ACTIVE' } },
    });
    const user = await strategy.validate({ sub: 'u1', role: 'STUDENT' });
    expect(user.organizationId).toBe('org-teaching');
    expect(user.activeOrganizationId).toBe('org-teaching');
    expect(user.role).toBe('TEACHER');
    expect(prisma.organizationMembership.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 'u1', organizationId: 'org-teaching', status: 'ACTIVE' },
    }));
  });

  it('clears an active context whose membership is no longer active', async () => {
    const { prisma, strategy } = setup({
      user: {
        id: 'u1', telegramId: '1001', role: 'STUDENT', status: 'ACTIVE', deletedAt: null,
        organizationId: 'legacy-org', activeRole: null,
        activeOrganizationContext: { organizationId: 'org-old', organization: { status: 'ACTIVE' } },
      },
      membership: null,
    });
    const user = await strategy.validate({ sub: 'u1', role: 'STUDENT' });
    expect(user.organizationId).toBeNull();
    expect(prisma.userActiveOrganization.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1', organizationId: 'org-old' },
    });
  });
});
