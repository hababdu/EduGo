import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { superAdminIds } from '../../common/super-admin.util';
import { SuperAdminService } from './super-admin.service';

describe('superAdminIds', () => {
  it('faqat to\'g\'ri raqamli ID larni oladi', () => {
    expect(superAdminIds('123456, 789012 ,abc,,12')).toEqual(['123456', '789012']);
    expect(superAdminIds(undefined)).toEqual([]);
  });
});

describe('SuperAdminService', () => {
  const actor: any = { id: 's1', role: 'SUPER_ADMIN' };
  const mk = (over: any = {}) => {
    const prisma: any = {
      organization: { findFirst: jest.fn().mockResolvedValue(null), findUnique: jest.fn().mockResolvedValue({ id: 'o1', name: 'M' }), create: jest.fn().mockResolvedValue({ id: 'o1' }) },
      user: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({ id: 'u', firstName: 'A', lastName: null, username: null }) },
      adminActionLog: { create: jest.fn().mockResolvedValue({}) },
      ...over,
    };
    return { prisma, svc: new SuperAdminService(prisma, {} as any, {} as any, {} as any, {} as any) };
  };

  it('bir xil nomli maktab 409', async () => {
    const { svc } = mk({ organization: { findFirst: jest.fn().mockResolvedValue({ id: 'x' }) } });
    await expect(svc.createOrg(actor, { name: 'Maktab 1' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('maktab yaratilganda audit yoziladi', async () => {
    const { svc, prisma } = mk();
    await svc.createOrg(actor, { name: ' Maktab 1 ' });
    expect(prisma.organization.create.mock.calls[0][0].data.name).toBe('Maktab 1');
    expect(prisma.adminActionLog.create.mock.calls[0][0].data.action).toBe('ORG_CREATE');
  });

  it('adminni tayinlash: topilmasa 404, super adminni rad etadi, boshqa maktab xodimi 409', async () => {
    const a = mk(); a.prisma.user.findUnique.mockResolvedValue(null);
    await expect(a.svc.assignAdmin(actor, 'o1', { telegramId: '111' })).rejects.toBeInstanceOf(NotFoundException);
    const b = mk(); b.prisma.user.findUnique.mockResolvedValue({ id: 'u', role: 'SUPER_ADMIN' });
    await expect(b.svc.assignAdmin(actor, 'o1', { telegramId: '111' })).rejects.toBeInstanceOf(BadRequestException);
    const c = mk(); c.prisma.user.findUnique.mockResolvedValue({ id: 'u', role: 'TEACHER', organizationId: 'other' });
    await expect(c.svc.assignAdmin(actor, 'o1', { telegramId: '111' })).rejects.toBeInstanceOf(ConflictException);
    const d = mk(); d.prisma.user.findUnique.mockResolvedValue({ id: 'u', role: 'STUDENT', organizationId: null });
    await d.svc.assignAdmin(actor, 'o1', { telegramId: '111' });
    expect(d.prisma.user.update.mock.calls[0][0].data).toEqual({ role: 'ADMIN', organizationId: 'o1' });
  });

  it("o'zini va super adminni bloklab bo'lmaydi", async () => {
    const a = mk(); a.prisma.user.findUnique.mockResolvedValue({ id: 's1', role: 'ADMIN' });
    await expect(a.svc.setBlocked(actor, 's1', true)).rejects.toBeInstanceOf(BadRequestException);
    const b = mk(); b.prisma.user.findUnique.mockResolvedValue({ id: 'x', role: 'SUPER_ADMIN' });
    await expect(b.svc.setBlocked(actor, 'x', true)).rejects.toBeInstanceOf(BadRequestException);
  });
});
