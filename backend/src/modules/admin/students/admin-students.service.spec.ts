import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AdminStudentsService } from './admin-students.service';

describe('AdminStudentsService new student admission', () => {
  const actor: any = { id: 'admin-1', role: 'ADMIN', organizationId: 'school-1' };

  function setup(student: any = null) {
    const prisma: any = {
      user: {
        findUnique: jest.fn().mockResolvedValue(student),
        update: jest.fn().mockResolvedValue({ id: student?.id, organizationId: 'school-1' }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const audit: any = { log: jest.fn().mockResolvedValue(undefined) };
    const events: any = { emit: jest.fn() };
    return { prisma, audit, service: new AdminStudentsService(prisma, audit, events) };
  }

  it('includes unassigned students alongside the current school in the list query', async () => {
    const { service, prisma } = setup();
    await service.list({ page: 1, pageSize: 20 } as any, actor);
    expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        role: 'STUDENT',
        OR: [
          { organizationId: 'school-1' },
          { organizationId: null },
        ],
      }),
    }));
  });

  it('assigns an unassigned student to the current school and writes an audit record', async () => {
    const { service, prisma, audit } = setup({
      id: 'student-1', role: 'STUDENT', organizationId: null, deletedAt: null,
    });
    await service.assignToOrganization('student-1', actor);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'student-1' },
      data: { organizationId: 'school-1' },
    });
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({
      actorId: 'admin-1',
      action: 'STUDENT_ASSIGN_ORG',
      targetId: 'student-1',
    }));
  });

  it('does not allow a school admin to accept a student from another school', async () => {
    const { service, prisma } = setup({
      id: 'student-2', role: 'STUDENT', organizationId: 'school-2', deletedAt: null,
    });
    await expect(service.assignToOrganization('student-2', actor)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('does not allow an admin without a school to accept students', async () => {
    const { service, prisma } = setup({
      id: 'student-3', role: 'STUDENT', organizationId: null, deletedAt: null,
    });
    await expect(service.assignToOrganization('student-3', { ...actor, organizationId: null })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
