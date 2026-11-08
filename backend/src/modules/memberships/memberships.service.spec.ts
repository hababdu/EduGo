import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MembershipsService } from './memberships.service';

const user: any = { id: 'u1', role: 'STUDENT', status: 'ACTIVE', organizationId: null, telegramId: '1' };
const admin: any = { id: 'a1', role: 'ADMIN', status: 'ACTIVE', organizationId: 'o1', telegramId: '2' };
const superU: any = { id: 's1', role: 'SUPER_ADMIN', status: 'ACTIVE', organizationId: null, telegramId: '3' };

function mk(over: any = {}) {
  const m = over.membership;
  const prisma: any = {
    organization: { findFirst: jest.fn().mockResolvedValue(over.org === undefined ? { id: 'o1' } : over.org) },
    organizationMembership: {
      findUnique: jest.fn().mockResolvedValue(m ?? null),
      findFirst: jest.fn().mockResolvedValue(over.remaining ?? null),
      count: jest.fn().mockResolvedValue(over.pending ?? 0),
      create: jest.fn().mockResolvedValue({ id: 'm1', status: 'PENDING' }),
      update: jest.fn().mockResolvedValue({ id: 'm1', status: 'PENDING' }),
      upsert: jest.fn().mockResolvedValue({ id: 'm1' }),
      delete: jest.fn(), deleteMany: jest.fn(),
    },
    user: { findUnique: jest.fn().mockResolvedValue(over.target), update: jest.fn(), updateMany: jest.fn() },
    studentProfile: { upsert: jest.fn() }, teacherProfile: { upsert: jest.fn() }, adminProfile: { upsert: jest.fn() },
    adminActionLog: { create: jest.fn().mockResolvedValue({}) },
  };
  return { prisma, svc: new MembershipsService(prisma) };
}
const mem = (o: any = {}) => ({ id: 'm1', userId: 'u1', organizationId: 'o1', role: 'STUDENT', status: 'PENDING', user: { id: 'u1', role: 'STUDENT', organizationId: null }, ...o });

describe('MembershipsService', () => {
  it("so'rov yuboradi (maktabsiz foydalanuvchi)", async () => {
    const { svc, prisma } = mk();
    await expect(svc.requestJoin(user, 'o1', 'STUDENT')).resolves.toMatchObject({ status: 'PENDING' });
    expect(prisma.organizationMembership.create).toHaveBeenCalled();
  });
  it("takroriy, faol a'zo, super admin, nofaol maktab va limit rad etiladi", async () => {
    await expect(mk({ membership: mem({ status: 'PENDING' }) }).svc.requestJoin(user, 'o1')).rejects.toBeInstanceOf(ConflictException);
    await expect(mk({ membership: mem({ status: 'ACTIVE' }) }).svc.requestJoin(user, 'o1')).rejects.toBeInstanceOf(ConflictException);
    await expect(mk().svc.requestJoin(superU, 'o1')).rejects.toBeInstanceOf(BadRequestException);
    await expect(mk({ org: null }).svc.requestJoin(user, 'o1')).rejects.toBeInstanceOf(NotFoundException);
    await expect(mk({ pending: 3 }).svc.requestJoin(user, 'o1')).rejects.toBeInstanceOf(BadRequestException);
    await expect(mk().svc.requestJoin({ ...user, organizationId: 'o2' }, 'o1')).resolves.toMatchObject({ status: 'PENDING' });
  });
  it("rad etilgan so'rov qayta yuborilishi mumkin", async () => {
    const { svc, prisma } = mk({ membership: mem({ status: 'REJECTED' }) });
    await svc.requestJoin(user, 'o1');
    expect(prisma.organizationMembership.update).toHaveBeenCalled();
  });
  it("admin so'rovni tasdiqlaydi: rol, profil va faol maktab sinxronlanadi", async () => {
    const { svc, prisma } = mk({ membership: mem() });
    await svc.decide(admin, 'm1', true, 'TEACHER');
    expect(prisma.teacherProfile.upsert).toHaveBeenCalled();
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { role: 'TEACHER', organizationId: 'o1' } });
  });
  it("student second school approval keeps existing active school context", async () => {
    const { svc, prisma } = mk({ membership: mem({ user: { id: 'u1', role: 'STUDENT', organizationId: 'o2' } }) });
    await svc.decide(admin, 'm1', true);
    expect(prisma.studentProfile.upsert).toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("boshqa maktab so'rovini ko'ra olmaydi (izolyatsiya)", async () => {
    const { svc } = mk({ membership: mem({ organizationId: 'o2' }) });
    await expect(svc.decide(admin, 'm1', true)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.list(admin, { organizationId: 'o2' })).rejects.toBeInstanceOf(ForbiddenException);
  });
  it("maktab admini admin tayinlay olmaydi, o'zini o'zgartira olmaydi", async () => {
    await expect(mk().svc.attach(admin, 'u1', 'ADMIN')).rejects.toBeInstanceOf(ForbiddenException);
    const { svc } = mk({ membership: mem({ status: 'ACTIVE', userId: 'a1', user: { id: 'a1', role: 'ADMIN' } }) });
    await expect(svc.changeRole(admin, 'm1', 'TEACHER')).rejects.toBeInstanceOf(BadRequestException);
    await expect(mk({ membership: mem({ status: 'ACTIVE' }) }).svc.changeRole(admin, 'm1', 'ADMIN')).rejects.toBeInstanceOf(ForbiddenException);
  });
  it("super admin maktabni ko'rsatishi shart; a'zoni chiqarish maktabsiz holatga qaytaradi", async () => {
    await expect(mk().svc.list(superU, {})).rejects.toBeInstanceOf(BadRequestException);
    const { svc, prisma } = mk({ membership: mem({ status: 'ACTIVE' }) });
    await svc.remove(admin, 'm1');
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });
});
