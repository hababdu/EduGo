import { ConflictException, ForbiddenException } from '@nestjs/common';
import { MembershipStatus, OrganizationRole, TrialLessonStatus } from '@prisma/client';
import { TrialsService } from './trials.service';

describe('TrialsService', () => {
  const prisma: any = {
    user: { findUnique: jest.fn() },
    organization: { findUnique: jest.fn() },
    group: { findUnique: jest.fn() },
    organizationMembership: { findFirst: jest.fn() },
    trialLesson: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
  };
  let service: TrialsService;
  beforeEach(() => { jest.clearAllMocks(); service = new TrialsService(prisma); });

  it('creates a pending trial request without creating enrollment or payment records', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', status: 'ACTIVE', deletedAt: null });
    prisma.organization.findUnique.mockResolvedValue({ id: 's1', status: 'ACTIVE', publiclyListed: true });
    prisma.group.findUnique.mockResolvedValue({ id: 'g1', organizationId: 's1', deletedAt: null, maxCapacity: 10, _count: { members: 2, trialLessons: 1 } });
    prisma.organizationMembership.findFirst.mockResolvedValue(null);
    prisma.trialLesson.findUnique.mockResolvedValue(null);
    prisma.trialLesson.create.mockResolvedValue({ id: 't1', status: TrialLessonStatus.REQUESTED });

    const result = await service.request('u1', 's1', 'g1', new Date(Date.now() + 86400000).toISOString());

    expect(result.status).toBe(TrialLessonStatus.REQUESTED);
    expect(prisma.trialLesson.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: 'u1', organizationId: 's1', groupId: 'g1' }) }));
    expect(prisma).not.toHaveProperty('groupMember');
    expect(prisma).not.toHaveProperty('payment');
  });

  it('blocks a second trial request for the same school', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', status: 'ACTIVE', deletedAt: null });
    prisma.organization.findUnique.mockResolvedValue({ id: 's1', status: 'ACTIVE', publiclyListed: true });
    prisma.group.findUnique.mockResolvedValue({ id: 'g1', organizationId: 's1', deletedAt: null, maxCapacity: null, _count: { members: 0, trialLessons: 0 } });
    prisma.organizationMembership.findFirst.mockResolvedValue(null);
    prisma.trialLesson.findUnique.mockResolvedValue({ id: 'existing' });

    await expect(service.request('u1', 's1', 'g1', new Date(Date.now() + 86400000).toISOString())).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.trialLesson.create).not.toHaveBeenCalled();
  });

  it('blocks trial booking when the user is already an active student of the school', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', status: 'ACTIVE', deletedAt: null });
    prisma.organization.findUnique.mockResolvedValue({ id: 's1', status: 'ACTIVE', publiclyListed: true });
    prisma.group.findUnique.mockResolvedValue({ id: 'g1', organizationId: 's1', deletedAt: null, maxCapacity: null, _count: { members: 0, trialLessons: 0 } });
    prisma.organizationMembership.findFirst.mockResolvedValue({ id: 'membership' });
    prisma.trialLesson.findUnique.mockResolvedValue(null);

    await expect(service.request('u1', 's1', 'g1', new Date(Date.now() + 86400000).toISOString())).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.trialLesson.create).not.toHaveBeenCalled();
  });

  it('allows only an active school admin to review trial requests', async () => {
    prisma.trialLesson.findUnique.mockResolvedValue({ id: 't1', organizationId: 's1', status: TrialLessonStatus.REQUESTED });
    prisma.organizationMembership.findFirst.mockResolvedValue(null);
    await expect(service.review('u1', 't1', { decision: 'APPROVED' } as any)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.trialLesson.update).not.toHaveBeenCalled();
  });
});
