import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { GroupsService } from './groups.service';
import { CreateGroupDto, UpdateGroupDto } from './dto/groups.dto';

const teacher: any = { id: 'tA', role: 'TEACHER', organizationId: 'o1' };
const admin: any = { id: 'adm', role: 'ADMIN', organizationId: 'o1' };

function build(opts: { maxCapacity?: number | null; members?: number } = {}) {
  const group = { id: 'g', organizationId: 'o1', teacherId: 'tA', deletedAt: null, maxCapacity: opts.maxCapacity ?? null, members: [] as any[], teacher: null };
  const tx: any = {
    group: { update: jest.fn().mockResolvedValue({}) },
    groupMember: {
      count: jest.fn().mockResolvedValue(opts.members ?? 0),
      create: jest.fn().mockResolvedValue({ id: 'new' }),
    },
  };
  const prisma: any = {
    group: { findUnique: jest.fn().mockResolvedValue(group), update: jest.fn().mockResolvedValue({}) },
    user: { findFirst: jest.fn().mockResolvedValue({ id: 's', organizationId: 'o1' }), findUnique: jest.fn().mockResolvedValue({ id: 'tB' }), findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    organizationMembership: { findFirst: jest.fn().mockResolvedValue(null) },
    groupMember: {
      findUnique: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(opts.members ?? 0),
      create: jest.fn().mockResolvedValue({ id: 'new' }),
    },
    $transaction: jest.fn().mockImplementation(async (fn: any) => fn(tx)),
  };
  return { prisma, tx, svc: new GroupsService(prisma) };
}

describe("sig'im cheklovi (addStudentToGroup)", () => {
  it("to'lgan guruhga qo'shilmaydi", async () => {
    const { svc, tx } = build({ maxCapacity: 2, members: 2 });
    await expect(svc.addStudentToGroup('g', 's', teacher)).rejects.toThrow("Guruh to'lgan (2/2)");
    expect(tx.groupMember.create).not.toHaveBeenCalled();
  });
  it("joy bo'lsa qo'shadi va avval guruh qatorini qulflaydi", async () => {
    const { svc, tx } = build({ maxCapacity: 3, members: 2 });
    await svc.addStudentToGroup('g', 's', teacher);
    expect(tx.group.update).toHaveBeenCalled();
    expect(tx.groupMember.create).toHaveBeenCalled();
  });
  it("asosiy maktabi boshqa bo'lgan, lekin shu maktabga faol a'zo talabani qo'shadi", async () => {
    const a = build();
    a.prisma.user.findFirst.mockResolvedValue({ id: 's', organizationId: 'o2' });
    a.prisma.organizationMembership.findFirst.mockResolvedValue({ id: 'membership-o1' });
    await a.svc.addStudentToGroup('g', 's', teacher);
    expect(a.prisma.organizationMembership.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 's', organizationId: 'o1', role: 'STUDENT', status: 'ACTIVE' },
    }));
    expect(a.prisma.groupMember.create).toHaveBeenCalled();
  });
  it("maktab a'zoligi yo'q talabani boshqa maktab guruhiga qo'shmaydi", async () => {
    const a = build();
    a.prisma.user.findFirst.mockResolvedValue({ id: 's', organizationId: 'o2' });
    await expect(a.svc.addStudentToGroup('g', 's', teacher)).rejects.toThrow("Talaba ushbu maktabning faol a'zosi emas");
    expect(a.prisma.groupMember.create).not.toHaveBeenCalled();
  });
  it("sig'im belgilanmagan bo'lsa tranzaksiyasiz oddiy qo'shadi", async () => {
    const { svc, prisma } = build({ maxCapacity: null, members: 999 });
    await svc.addStudentToGroup('g', 's', teacher);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.groupMember.create).toHaveBeenCalled();
  });
});

describe('updateGroup', () => {
  it("o'qituvchi guruhni boshqa o'qituvchiga topshira olmaydi, admin oladi", async () => {
    const a = build();
    await expect(a.svc.updateGroup('g', { teacherId: 'tB' }, teacher)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(a.svc.updateGroup('g', { teacherId: null }, teacher)).rejects.toBeInstanceOf(ForbiddenException);
    expect(a.prisma.group.update).not.toHaveBeenCalled();
    const b = build();
    await b.svc.updateGroup('g', { teacherId: 'tB' }, admin);
    expect(b.prisma.group.update).toHaveBeenCalled();
  });
  it("sig'imni a'zolar sonidan kamaytirib bo'lmaydi; null sig'imni olib tashlaydi", async () => {
    const a = build({ members: 5 });
    await expect(a.svc.updateGroup('g', { maxCapacity: 4 }, teacher)).rejects.toBeInstanceOf(BadRequestException);
    await a.svc.updateGroup('g', { maxCapacity: 5, telegramChatUrl: ' https://t.me/mygroup ' }, teacher);
    expect(a.prisma.group.update.mock.calls[0][0].data).toMatchObject({ maxCapacity: 5, telegramChatUrl: 'https://t.me/mygroup' });
    const b = build({ members: 5 });
    await b.svc.updateGroup('g', { maxCapacity: null, telegramChatUrl: null }, teacher);
    expect(b.prisma.group.update.mock.calls[0][0].data).toMatchObject({ maxCapacity: null, telegramChatUrl: null });
  });
});

describe('DTO tekshiruvi — Telegram havola va sig\'im', () => {
  const errs = async (cls: any, o: any) => (await validate(plainToInstance(cls, o))).map((e) => e.property);
  it("faqat https://t.me | telegram.me havolalari o'tadi", async () => {
    expect(await errs(CreateGroupDto, { name: 'A', telegramChatUrl: 'https://t.me/edugo_group' })).toEqual([]);
    expect(await errs(CreateGroupDto, { name: 'A', telegramChatUrl: 'https://t.me/+AbCdEf123' })).toEqual([]);
    for (const bad of ['javascript:alert(1)', 'http://t.me/abc', 'https://evil.com/t.me/abc', 'https://t.me/', 'https://t.me/a b', 'data:text/html,x']) {
      expect(await errs(CreateGroupDto, { name: 'A', telegramChatUrl: bad })).toContain('telegramChatUrl');
    }
  });
  it("sig'im 1..500 butun son; update'da null ruxsat", async () => {
    for (const bad of [0, -1, 501, 1.5, 'x']) expect(await errs(CreateGroupDto, { name: 'A', maxCapacity: bad })).toContain('maxCapacity');
    expect(await errs(CreateGroupDto, { name: 'A', maxCapacity: 30 })).toEqual([]);
    expect(await errs(UpdateGroupDto, { maxCapacity: null, telegramChatUrl: null })).toEqual([]);
  });
});

describe('findAvailableStudents', () => {
  it("maktabning faol a'zolarini qidiradi va guruhdagi talabalarni chiqarib tashlaydi", async () => {
    const a = build();
    a.prisma.user.findMany.mockResolvedValue([{ id: 's2', firstName: 'Ali', lastName: 'Valiyev' }]);
    a.prisma.user.count.mockResolvedValue(1);
    const result = await a.svc.findAvailableStudents('g', teacher, 'Ali');
    expect(result).toMatchObject({ total: 1, items: [{ id: 's2' }] });
    const where = a.prisma.user.findMany.mock.calls[0][0].where;
    expect(where.groupMemberships).toEqual({ none: { groupId: 'g' } });
    expect(where.OR).toEqual(expect.arrayContaining([
      { organizationId: 'o1' },
      { memberships: { some: { organizationId: 'o1', role: 'STUDENT', status: 'ACTIVE' } } },
    ]));
  });
});


describe('addStudentsToGroup', () => {
  it('takroriy IDlarni olib tashlaydi va mos talabalarni qo\'shadi', async () => {
    const a = build();
    const addSpy = jest.spyOn(a.svc, 'addStudentToGroup').mockResolvedValue({ id: 'added' } as any);
    const result = await a.svc.addStudentsToGroup('g', ['s1', 's1', 's2'], teacher);
    expect(addSpy).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ requested: 2, addedCount: 2, skippedCount: 0 });
  });

  it('bitta talaba qo\'shilmasa, qolganlari davom etadi va sabab qaytariladi', async () => {
    const a = build();
    jest.spyOn(a.svc, 'addStudentToGroup')
      .mockResolvedValueOnce({ id: 'added' } as any)
      .mockRejectedValueOnce(new BadRequestException('Guruh to\'lgan'));
    const result = await a.svc.addStudentsToGroup('g', ['s1', 's2'], teacher);
    expect(result).toMatchObject({ requested: 2, addedCount: 1, skippedCount: 1 });
    expect(result.skipped[0]).toMatchObject({ studentId: 's2', reason: "Guruh to'lgan" });
  });

  it('100 tadan ortiq IDni rad etadi', async () => {
    const a = build();
    await expect(a.svc.addStudentsToGroup('g', Array.from({ length: 101 }, (_, i) => String(i)), teacher))
      .rejects.toBeInstanceOf(BadRequestException);
  });
});
