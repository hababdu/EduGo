import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TeachingService } from './teaching.service';

const admin: any = { id: 'a1', role: 'ADMIN', organizationId: 'o1' };
const teacherU: any = { id: 't1', role: 'TEACHER', organizationId: 'o1' };

function mk(over: any = {}) {
  const prisma: any = {
    user: { findFirst: jest.fn().mockResolvedValue(over.teacher === undefined ? { id: 't1' } : over.teacher) },
    organizationMembership: { findFirst: jest.fn().mockResolvedValue(over.teacher === null ? null : { user: { id: 't1' } }) },
    schoolSubject: { findFirst: jest.fn().mockResolvedValue({ id: 's1' }), create: jest.fn().mockResolvedValue({ id: 's1', name: 'Fizika' }), findUnique: jest.fn().mockResolvedValue({ id: 's1', organizationId: over.subjectOrg ?? 'o1' }), delete: jest.fn() },
    group: { findFirst: jest.fn().mockResolvedValue({ id: 'g1' }) },
    teachingAssignment: { create: jest.fn().mockResolvedValue({ id: 'ta1' }), findUnique: jest.fn().mockResolvedValue({ id: 'ta1', organizationId: 'o1', groupId: 'g1', teacherId: 't1' }) },
    scheduleSlot: { findMany: jest.fn().mockResolvedValue(over.slots ?? []), create: jest.fn().mockResolvedValue({ id: 'sl1' }) },
    scheduleSession: { findFirst: jest.fn().mockResolvedValue(over.sessionClash ?? null), findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn().mockResolvedValue({ id: 'ss1', organizationId: 'o1' }), create: jest.fn().mockResolvedValue({ id: 'ss1' }), update: jest.fn().mockResolvedValue({ id: 'ss1', status: 'CANCELLED' }) },
  };
  return { prisma, svc: new TeachingService(prisma) };
}
const slot = (o: any = {}) => ({ weekday: 1, startTime: '09:00', endTime: '10:00', room: '101', ...o });
const other = (o: any = {}) => ({ startTime: '09:30', endTime: '10:30', room: null, assignment: { groupId: 'gX', teacherId: 'tX' }, ...o });

describe('TeachingService', () => {
  it("o'qituvchini fan va sinfga tayinlaydi (faqat o'z maktabi doirasida qidiradi)", async () => {
    const { svc, prisma } = mk();
    await svc.assign(admin, { teacherId: 't1', subjectId: 's1', groupId: 'g1' });
    expect(prisma.organizationMembership.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: 'o1', role: 'TEACHER', status: 'ACTIVE' }) }));
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
  it('haftalik slot sana oralig‘i bilan saqlanadi va turli davrlar kesishmasa konflikt bo‘lmaydi', async () => {
    const { svc, prisma } = mk({ slots: [other({ startsOn: new Date('2026-01-01'), endsOn: new Date('2026-03-01'), assignment: { groupId: 'g1', teacherId: 't1' } })] });
    await svc.addSlot(admin, 'ta1', slot({ startsOn: '2026-04-01', endsOn: '2026-06-30' }));
    expect(prisma.scheduleSlot.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ startsOn: new Date('2026-04-01T00:00:00.000Z'), endsOn: new Date('2026-06-30T00:00:00.000Z') }) }));
  });
  it('individual session: ishtirokchilar tekshiriladi va vaqt to‘qnashuvi rad etiladi', async () => {
    const { svc, prisma } = mk();
    await svc.createSession(admin, { title: 'Individual dars', teacherId: 't1', studentId: 's1', startsAt: '2026-10-05T04:00:00.000Z', endsAt: '2026-10-05T05:00:00.000Z' });
    expect(prisma.scheduleSession.create).toHaveBeenCalled();
    const conflict = mk({ sessionClash: { id: 'busy' } });
    await expect(conflict.svc.createSession(admin, { title: 'Yangi dars', teacherId: 't1', studentId: 's1', startsAt: '2026-10-05T04:00:00.000Z', endsAt: '2026-10-05T05:00:00.000Z' })).rejects.toBeInstanceOf(ConflictException);
  });
  it('individual session: noto‘g‘ri vaqt va ishtirokchi a’zoligi rad etiladi', async () => {
    await expect(mk().svc.createSession(admin, { title: 'Dars', teacherId: 't1', studentId: 's1', startsAt: '2026-10-05T05:00:00.000Z', endsAt: '2026-10-05T04:00:00.000Z' })).rejects.toBeInstanceOf(BadRequestException);
    const noTeacher = mk({ teacher: null });
    await expect(noTeacher.svc.createSession(admin, { title: 'Dars', teacherId: 't1', studentId: 's1', startsAt: '2026-10-05T04:00:00.000Z', endsAt: '2026-10-05T05:00:00.000Z' })).rejects.toBeInstanceOf(BadRequestException);
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
  it('jadval tanlangan sanaga mos amal qilish oralig‘idagi slotlarni so‘raydi', async () => {
    const { svc, prisma } = mk();
    await svc.timetable(admin, { date: '2026-05-15' });
    const where = prisma.scheduleSlot.findMany.mock.calls[0][0].where;
    expect(where.organizationId).toBe('o1');
    expect(where.AND).toEqual([
      { OR: [{ startsOn: null }, { startsOn: { lte: new Date('2026-05-15T00:00:00.000Z') } }] },
      { OR: [{ endsOn: null }, { endsOn: { gte: new Date('2026-05-15T00:00:00.000Z') } }] },
    ]);
  });
  it("o'qituvchi o'z jadvalini ko'radi; maktabsiz foydalanuvchi bo'sh ro'yxat oladi", async () => {
    const { svc } = mk();
    await expect(svc.mine({ ...teacherU, organizationId: null })).resolves.toEqual([]);
    await expect(svc.mine(admin)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
