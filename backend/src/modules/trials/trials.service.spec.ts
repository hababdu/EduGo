import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { TrialsService } from './trials.service';

const student: any = { id: 'st1', role: 'STUDENT', status: 'ACTIVE', organizationId: null };
const parent: any = { id: 'p1', role: 'PARENT', status: 'ACTIVE' };
const admin: any = { id: 'a1', role: 'ADMIN', organizationId: 'o1' };

function mk(over: any = {}) {
  const prisma: any = {
    parentLink: { findUnique: jest.fn().mockResolvedValue(over.link ?? null), findMany: jest.fn().mockResolvedValue([]) },
    user: { findFirst: jest.fn().mockResolvedValue(over.stu ?? { id: 'st1', organizationId: null }) },
    organizationMembership: { findFirst: jest.fn().mockResolvedValue(over.membership ?? null) },
    organization: { findFirst: jest.fn().mockResolvedValue(over.org === undefined ? { id: 'o1' } : over.org) },
    group: { findFirst: jest.fn().mockResolvedValue(over.group === undefined ? { id: 'g1', maxCapacity: over.cap ?? null } : over.group) },
    groupMember: { count: jest.fn().mockResolvedValue(over.members ?? 0), upsert: jest.fn() },
    trialLesson: { findMany: jest.fn().mockResolvedValue(over.open ?? []), create: jest.fn().mockResolvedValue({ id: 't1', status: 'REQUESTED' }), findUnique: jest.fn().mockResolvedValue(over.trial ?? null), update: jest.fn() },
  };
  const memberships: any = { attach: jest.fn().mockResolvedValue({ id: 'm1' }) };
  return { prisma, memberships, svc: new TrialsService(prisma, memberships) };
}
const trial = (o: any = {}) => ({ id: 't1', organizationId: 'o1', studentId: 'st1', groupId: null, status: 'ATTENDED', ...o });

describe('TrialsService', () => {
  it("o'quvchi o'zi uchun yoziladi", async () => {
    const { svc, prisma } = mk();
    await expect(svc.request(student, { organizationId: 'o1' })).resolves.toMatchObject({ status: 'REQUESTED' });
    expect(prisma.trialLesson.create.mock.calls[0][0].data).toMatchObject({ studentId: 'st1', requestedById: 'st1' });
  });
  it("ota-ona faqat bog'langan farzandi uchun yoza oladi", async () => {
    await expect(mk().svc.request(parent, { organizationId: 'o1' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(mk().svc.request(parent, { organizationId: 'o1', studentId: 'x' })).rejects.toBeInstanceOf(ForbiddenException);
    const { svc, prisma } = mk({ link: { id: 'l' } });
    await svc.request(parent, { organizationId: 'o1', studentId: 'st1' });
    expect(prisma.trialLesson.create.mock.calls[0][0].data).toMatchObject({ studentId: 'st1', requestedById: 'p1' });
  });
  it("takroriy so'rov, a'zo, limit va noto'g'ri rol rad etiladi", async () => {
    await expect(mk({ open: [{ organizationId: 'o1' }] }).svc.request(student, { organizationId: 'o1' })).rejects.toBeInstanceOf(ConflictException);
    await expect(mk({ open: [{ organizationId: 'a' }, { organizationId: 'b' }, { organizationId: 'c' }] }).svc.request(student, { organizationId: 'o1' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(mk({ stu: { id: 'st1', organizationId: 'o1' } }).svc.request(student, { organizationId: 'o1' })).rejects.toBeInstanceOf(ConflictException);
    await expect(mk({ membership: { id: 'm1' } }).svc.request(student, { organizationId: 'o1' })).rejects.toBeInstanceOf(ConflictException);
    await expect(mk().svc.request({ ...student, role: 'TEACHER' }, { organizationId: 'o1' })).rejects.toBeInstanceOf(ForbiddenException);
  });
  it("holat o'tishlari tartibli; boshqa maktab so'rovi yopiq", async () => {
    await expect(mk({ trial: trial({ status: 'REQUESTED' }) }).svc.attended(admin, 't1')).rejects.toBeInstanceOf(BadRequestException);
    await expect(mk({ trial: trial({ organizationId: 'o2' }) }).svc.decline(admin, 't1')).rejects.toBeInstanceOf(ForbiddenException);
    const { svc, prisma } = mk({ trial: trial({ status: 'REQUESTED' }) });
    await svc.approve(admin, 't1', new Date(Date.now() + 86_400_000));
    expect(prisma.trialLesson.update.mock.calls[0][0].data.status).toBe('APPROVED');
    await expect(svc.approve(admin, 't1', new Date(Date.now() - 86_400_000))).rejects.toBeInstanceOf(BadRequestException);
  });
  it("qabul: a'zo qilinadi va guruhga qo'shiladi; to'lgan guruh rad etiladi", async () => {
    const { svc, prisma, memberships } = mk({ trial: trial() });
    await svc.admit(admin, 't1', 'g1');
    expect(memberships.attach).toHaveBeenCalledWith(admin, 'st1', 'STUDENT', 'o1');
    expect(prisma.groupMember.upsert).toHaveBeenCalled();
    expect(prisma.trialLesson.update.mock.calls[0][0].data.status).toBe('ADMITTED');
    await expect(mk({ trial: trial(), cap: 5, members: 5 }).svc.admit(admin, 't1', 'g1')).rejects.toBeInstanceOf(ConflictException);
    await expect(mk({ trial: trial({ status: 'APPROVED' }) }).svc.admit(admin, 't1')).rejects.toBeInstanceOf(BadRequestException);
  });
});
