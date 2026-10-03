import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';

function build(target: any) {
  const prisma: any = {
    user: {
      findUnique: jest.fn().mockResolvedValue(target),
      update: jest.fn().mockResolvedValue({ id: 'u', role: 'TEACHER' }),
    },
    adminActionLog: { create: jest.fn().mockResolvedValue({}) },
  };
  return { prisma, svc: new UsersService(prisma) };
}
const admin: any = { id: 'a1', role: 'ADMIN' };
const sa: any = { id: 's1', role: 'SUPER_ADMIN' };

describe('UsersService.updateRole', () => {
  it("noto'g'ri rolni rad etadi", async () => {
    const { svc, prisma } = build({ id: 'u', role: 'STUDENT' });
    await expect(svc.updateRole('u', 'GOD', admin)).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.updateRole('u', undefined, admin)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
  it("o'z rolini o'zgartira olmaydi", async () => {
    const { svc } = build({ id: 'a1', role: 'ADMIN' });
    await expect(svc.updateRole('a1', 'TEACHER', admin)).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('topilmasa 404', async () => {
    const { svc } = build(null);
    await expect(svc.updateRole('u', 'TEACHER', admin)).rejects.toBeInstanceOf(NotFoundException);
  });
  it('oddiy admin ADMIN/SUPER_ADMIN bera olmaydi va ularni tushira olmaydi', async () => {
    const a = build({ id: 'u', role: 'STUDENT' });
    await expect(a.svc.updateRole('u', 'ADMIN', admin)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(a.svc.updateRole('u', 'SUPER_ADMIN', admin)).rejects.toBeInstanceOf(ForbiddenException);
    const b = build({ id: 'u', role: 'ADMIN' });
    await expect(b.svc.updateRole('u', 'STUDENT', admin)).rejects.toBeInstanceOf(ForbiddenException);
    expect(a.prisma.user.update).not.toHaveBeenCalled();
    expect(b.prisma.user.update).not.toHaveBeenCalled();
  });
  it("admin STUDENT<->TEACHER o'zgartiradi va audit yoziladi; super admin ADMIN bera oladi", async () => {
    const a = build({ id: 'u', role: 'STUDENT' });
    await a.svc.updateRole('u', 'TEACHER', admin);
    expect(a.prisma.adminActionLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'ROLE_CHANGE', actorId: 'a1', targetId: 'u', oldValue: { role: 'STUDENT' }, newValue: { role: 'TEACHER' } }),
    });
    const b = build({ id: 'u', role: 'TEACHER' });
    await b.svc.updateRole('u', 'ADMIN', sa);
    expect(b.prisma.user.update).toHaveBeenCalled();
  });
  it("o'zgarishsiz so'rov yozuv va audit qoldirmaydi", async () => {
    const a = build({ id: 'u', role: 'TEACHER' });
    await a.svc.updateRole('u', 'TEACHER', admin);
    expect(a.prisma.user.update).not.toHaveBeenCalled();
    expect(a.prisma.adminActionLog.create).not.toHaveBeenCalled();
  });
});
