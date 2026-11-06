import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { effectiveRole } from '../../common/super-admin.util';
import { InternalService } from './internal.service';

describe('effectiveRole', () => {
  it('faqat SUPER_ADMIN uchun activeRole hisobga olinadi', () => {
    expect(effectiveRole('SUPER_ADMIN', 'TEACHER')).toBe('TEACHER');
    expect(effectiveRole('SUPER_ADMIN', null)).toBe('SUPER_ADMIN');
    expect(effectiveRole('SUPER_ADMIN', 'SUPER_ADMIN')).toBe('SUPER_ADMIN');
    expect(effectiveRole('STUDENT', 'ADMIN')).toBe('STUDENT');
    expect(effectiveRole('ADMIN', 'SUPER_ADMIN')).toBe('ADMIN');
  });
});

describe('InternalService.switchRole', () => {
  const make = (user: any, ids = '111') => {
    const prisma: any = {
      user: { findFirst: jest.fn().mockResolvedValue(user), update: jest.fn().mockResolvedValue({}), findUnique: jest.fn() },
      organization: { findFirst: jest.fn().mockResolvedValue({ id: 'o1' }), findMany: jest.fn().mockResolvedValue([]) },
      studentProfile: { upsert: jest.fn() },
      teacherProfile: { upsert: jest.fn() },
      adminProfile: { upsert: jest.fn() },
      adminActionLog: { create: jest.fn() },
    };
    prisma.user.findFirst.mockResolvedValue(user);
    const config: any = { get: () => ids };
    const svc = new InternalService(prisma, config, {} as any, {} as any, {} as any);
    jest.spyOn(svc, 'getUserRole').mockResolvedValue({ role: 'TEACHER' } as any);
    return { svc, prisma };
  };

  it("super admin bo'lmaganni rad etadi", async () => {
    const { svc } = make({ id: 'u', telegramId: '222', role: 'ADMIN', activeRole: null });
    await expect(svc.switchRole('222', { role: 'TEACHER', organizationId: 'o1' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("noto'g'ri rolni rad etadi", async () => {
    const { svc } = make({ id: 'u', telegramId: '111', role: 'SUPER_ADMIN', activeRole: null });
    await expect(svc.switchRole('111', { role: 'PARENT' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("o'qituvchi rolida tashkilot majburiy", async () => {
    const { svc } = make({ id: 'u', telegramId: '111', role: 'SUPER_ADMIN', activeRole: null });
    await expect(svc.switchRole('111', { role: 'TEACHER' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("faol rol va tashkilot o'rnatiladi, profil yaratiladi, haqiqiy rol o'zgarmaydi", async () => {
    const { svc, prisma } = make({ id: 'u', telegramId: '111', role: 'SUPER_ADMIN', activeRole: null });
    await svc.switchRole('111', { role: 'TEACHER', organizationId: 'o1' });
    expect(prisma.teacherProfile.upsert).toHaveBeenCalled();
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u' }, data: { activeRole: 'TEACHER', organizationId: 'o1' } });
  });

  it('SUPER_ADMIN ga qaytganda faol rol va tashkilot tozalanadi', async () => {
    const { svc, prisma } = make({ id: 'u', telegramId: '111', role: 'SUPER_ADMIN', activeRole: 'TEACHER' });
    await svc.switchRole('111', { role: 'SUPER_ADMIN' });
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u' }, data: { activeRole: null, organizationId: null } });
  });
});
