import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { GroupsService } from './groups.service';
import { CreateGroupDto, UpdateGroupDto } from './dto/groups.dto';

const teacher: any = { id: 'tA', role: 'TEACHER' };
const admin: any = { id: 'adm', role: 'ADMIN' };

function build(opts: { maxCapacity?: number | null; members?: number } = {}) {
  const group = { id: 'g', teacherId: 'tA', deletedAt: null, maxCapacity: opts.maxCapacity ?? null, members: [] as any[], teacher: null };
  const tx: any = {
    group: { update: jest.fn().mockResolvedValue({}) },
    groupMember: {
      count: jest.fn().mockResolvedValue(opts.members ?? 0),
      create: jest.fn().mockResolvedValue({ id: 'new' }),
    },
  };
  const prisma: any = {
    group: { findUnique: jest.fn().mockResolvedValue(group), update: jest.fn().mockResolvedValue({}) },
    user: { findFirst: jest.fn().mockResolvedValue({ id: 's' }) },
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
