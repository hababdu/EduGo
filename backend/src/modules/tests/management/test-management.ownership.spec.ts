import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TestManagementService } from './test-management.service';

function build(over: any = {}) {
  const prisma: any = {
    test: {
      findFirst: jest.fn().mockResolvedValue({ id: 't', createdById: 'tA', status: 'DRAFT', deletedAt: null }),
      findUnique: jest.fn().mockResolvedValue({ id: 't', createdById: 'tA', status: 'DRAFT', deletedAt: null }),
      update: jest.fn().mockResolvedValue({}),
    },
    user: { findFirst: jest.fn().mockResolvedValue({ id: 's' }) },
    group: { findFirst: jest.fn().mockResolvedValue({ id: 'g', teacherId: 'tA' }) },
    groupMember: { findFirst: jest.fn().mockResolvedValue({ id: 'm' }) },
    testAssignment: { create: jest.fn().mockResolvedValue({ id: 'asg' }) },
    ...over,
  };
  const audit: any = { log: jest.fn() };
  const notif: any = new Proxy({}, { get: () => jest.fn().mockResolvedValue(undefined) });
  return { prisma, svc: new TestManagementService(prisma, audit, notif) };
}

describe('publish — egalik', () => {
  it("boshqa o'qituvchining testini e'lon qila olmaydi", async () => {
    const { svc, prisma } = build();
    await expect(svc.publish('t', 'tB', 'TEACHER')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.test.update).not.toHaveBeenCalled();
  });
  it("egasi va admin e'lon qila oladi", async () => {
    const a = build();
    await expect(a.svc.publish('t', 'tA', 'TEACHER')).resolves.toMatchObject({ ok: true });
    const b = build();
    await expect(b.svc.publish('t', 'adm', 'ADMIN')).resolves.toMatchObject({ ok: true });
  });
});

describe('assign INDIVIDUAL — tekshiruvlar', () => {
  const dto: any = { targetType: 'INDIVIDUAL', studentId: 's' };
  it("studentId haqiqiy o'quvchi emas -> 404", async () => {
    const { svc, prisma } = build({ user: { findFirst: jest.fn().mockResolvedValue(null) } });
    await expect(svc.assign('t', dto, 'tA', 'TEACHER')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.testAssignment.create).not.toHaveBeenCalled();
  });
  it("o'qituvchi o'z guruhida bo'lmagan o'quvchiga biriktira olmaydi -> 403", async () => {
    const { svc, prisma } = build({ groupMember: { findFirst: jest.fn().mockResolvedValue(null) } });
    await expect(svc.assign('t', dto, 'tA', 'TEACHER')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.testAssignment.create).not.toHaveBeenCalled();
  });
  it("o'z guruhidagi o'quvchiga biriktiradi", async () => {
    const { svc, prisma } = build();
    await svc.assign('t', dto, 'tA', 'TEACHER');
    expect(prisma.testAssignment.create).toHaveBeenCalled();
  });
});
