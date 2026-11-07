import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TeachingService } from './teaching.service';

const admin: any = { id: 'a1', role: 'ADMIN', organizationId: 'o1' };
const teacherU: any = { id: 't1', role: 'TEACHER', organizationId: 'o1' };

function mk(over: any = {}) {
  const prisma: any = {
    user: { findFirst: jest.fn().mockResolvedValue(over.teacher === undefined ? { id: 't1' } : over.teacher) },
    schoolSubject: { findFirst: jest.fn().mockResolvedValue({ id: 's1' }), create: jest.fn().mockResolvedValue({ id: 's1', name: 'Fizika' }), findUnique: jest.fn().mockResolvedValue({ id: 's1', organizationId: over.subjectOrg ?? 'o1' }), delete: jest.fn() },
    group: { findFirst: jest.fn().mockResolvedValue({ id: 'g1' }) },
    teachingAssignment: { create: jest.fn().mockResolvedValue({ id: 'ta1' }), findUnique: jest.fn().mockResolvedValue({ id: 'ta1', organizationId: 'o1', groupId: 'g1', teacherId: 't1' }) },
    scheduleSlot: { findMany: jest.fn().mockResolvedValue(over.slots ?? []), create: jest.fn().mockResolvedValue({ id: 'sl1' }) },
  };
  return { prisma, svc: new TeachingService(prisma) };
}
const slot = (o: any = {}) => ({ weekday: 1, startTime: '09:00', endTime: '10:00', room: '101', ...o });
const other = (o: any = {}) => ({ startTime: '09:30', endTime: '10:30', room: null, assignment: { groupId: 'gX', teacherId: 'tX' }, ...o });

describe('TeachingService', () => {
  it("o'qituvchini fan va sinfga tayinlaydi (faqat o'z maktabi doirasida qidiradi)", async () => {
    const { svc, prisma } = mk();
    await svc.assign(admin, { teacherId: 't1', subjectId: 's1', groupId: 'g1' });
    expect(prisma.user.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: 'o1', role: 'TEACHER' }) }));
    expect(prisma.teachingAssignment.create).toHaveBeenCalled();
  });
  it("boshqa maktab o'qituvchisi topilmaydi; takroriy tayinlash 409; boshqa maktabga kirish 403", async () => {
    await expect(mk({ teacher: null }).svc.assign(admin, { teacherId: 't9', subjectId: 's1', groupId: 'g1' })).rejects.toBeInstanceOf(NotFoundException);
    const { svc, prisma } = mk();
    prisma.teachingAssignment.create.mockRejectedValue({ code: 'P2002' });
    await expect(svc.assign(admin, { teacherId: 't1', subjectId: 's1', groupId: 'g1' })).rejects.toBeInstanceOf(ConflictException);
    await expect(svc.listSubjects(admin, 'o2')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(mk({ subjectOrg: 'o2' }).svc.removeSubject(admin, 's1')).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('jadval: yaroqsiz vaqt va kesishuvlar (o\'qituvchi, sinf, xona) rad etiladi', async () => {
    await expect(mk().svc.addSlot(admin, 'ta1', slot({ startTime: '10:00', endTime: '09:00' }))).rejects.toBeInstanceOf(BadRequestException);
    await expect(mk({ slots: [other({ assignment: { groupId: 'gX', teacherId: 't1' } })] }).svc.addSlot(admin, 'ta1', slot())).rejects.toThrow("O'qituvchi shu vaqtda band");
    await expect(mk({ slots: [other({ assignment: { groupId: 'g1', teacherId: 'tX' } })] }).svc.addSlot(admin, 'ta1', slot())).rejects.toThrow('Sinfda shu vaqtda');
    await expect(mk({ slots: [other({ room: '101' })] }).svc.addSlot(admin, 'ta1', slot())).rejects.toThrow('Xona shu vaqtda band');
  });
  it('jadval: chegaradosh vaqt (10:00 da tugab 10:00 da boshlanishi) to\'qnashuv emas', async () => {
    const { svc, prisma } = mk({ slots: [other({ startTime: '10:00', endTime: '11:00', assignment: { groupId: 'g1', teacherId: 't1' } })] });
    await svc.addSlot(admin, 'ta1', slot());
    expect(prisma.scheduleSlot.create).toHaveBeenCalled();
  });
  it("o'qituvchi o'z jadvalini ko'radi; maktabsiz foydalanuvchi bo'sh ro'yxat oladi", async () => {
    const { svc } = mk();
    await expect(svc.mine({ ...teacherU, organizationId: null })).resolves.toEqual([]);
    await expect(svc.mine(admin)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
