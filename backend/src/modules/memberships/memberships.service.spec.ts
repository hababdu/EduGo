import { ForbiddenException } from '@nestjs/common';
import { MembershipStatus, OrganizationRole } from '@prisma/client';
import { MembershipsService } from './memberships.service';

describe('MembershipsService', () => {
  const prisma: any = {
    user: { findUnique: jest.fn() },
    organization: { findUnique: jest.fn() },
    organizationMembership: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
  };
  let service: MembershipsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MembershipsService(prisma);
  });

  it('allows a student to request membership in an active school', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', status: 'ACTIVE', deletedAt: null });
    prisma.organization.findUnique.mockResolvedValue({ id: 'o1', status: 'ACTIVE' });
    prisma.organizationMembership.findUnique.mockResolvedValue(null);
    prisma.organizationMembership.upsert.mockResolvedValue({ id: 'm1', status: MembershipStatus.REQUESTED });

    const result = await service.requestToJoin('u1', 'o1', OrganizationRole.STUDENT);

    expect(result.id).toBe('m1');
    expect(prisma.organizationMembership.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ userId: 'u1', organizationId: 'o1', role: OrganizationRole.STUDENT, status: MembershipStatus.REQUESTED }),
    }));
  });

  it('does not allow users to self-request a teacher or admin role', async () => {
    await expect(service.requestToJoin('u1', 'o1', OrganizationRole.TEACHER)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.requestToJoin('u1', 'o1', OrganizationRole.ADMIN)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('requires a global Super Admin to appoint a school Admin', async () => {
    prisma.user.findUnique.mockResolvedValue({ role: 'STUDENT', status: 'ACTIVE', deletedAt: null });

    await expect(service.appointSchoolAdmin('u1', 'o1', 'u2')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.organizationMembership.upsert).not.toHaveBeenCalled();
  });

  it('requires an active Admin membership in the same school to appoint a teacher', async () => {
    prisma.organizationMembership.findFirst.mockResolvedValue(null);

    await expect(service.appointTeacher('u1', 'o1', 'u2')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.organizationMembership.upsert).not.toHaveBeenCalled();
  });
});
