import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { TeacherService } from './teacher.service';

function build(over: { groups?: any[]; files?: any[] } = {}) {
  const groups = over.groups ?? [
    { id: 'g1', teacherId: 't1' },
    { id: 'g2', teacherId: 't1' },
  ];
  const files = over.files ?? [];
  let n = 0;
  const tx: any = {
    teacherAssignment: {
      create: jest.fn().mockImplementation(async ({ data }: any) => ({ id: `a${++n}`, ...data })),
    },
    assignmentTest: { createMany: jest.fn() },
    materialFile: { update: jest.fn(), createMany: jest.fn() },
  };
  const prisma: any = {
    group: { findMany: jest.fn().mockImplementation(async ({ where }: any) => groups.filter((g) => where.id.in.includes(g.id))) },
    materialFile: { findMany: jest.fn().mockResolvedValue(files) },
    teacherAssignment: { findMany: jest.fn().mockResolvedValue([]) },
    groupMember: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn().mockImplementation(async (fn: any) => fn(tx)),
  };
  const audit: any = { log: jest.fn() };
  const notifications: any = { notifyMany: jest.fn() };
  const svc = new TeacherService(prisma, {} as any, audit, notifications);
  return { svc, prisma, tx, audit, notifications };
}

const base: any = { title: ' Dars ', type: 'TEXT', category: 'LESSON' };
const pdf = (id: string) => ({ id, kind: 'PDF', fileName: `${id}.pdf`, mimeType: 'application/pdf', sizeBytes: 10, tgFileId: `TG-${id}`, tgMessageId: 1 });

describe('TeacherService.createAssignment', () => {
  it('bir nechta guruhga alohida material yaratadi', async () => {
    const { svc, tx } = build();
    await svc.createAssignment('t1', { ...base, groupIds: ['g1', 'g2'] });
    expect(tx.teacherAssignment.create).toHaveBeenCalledTimes(2);
    const groupsUsed = tx.teacherAssignment.create.mock.calls.map((c: any) => c[0].data.groupId);
    expect(groupsUsed).toEqual(['g1', 'g2']);
  });

  it('o\'ziniki bo\'lmagan guruh bo\'lsa — hech narsa yaratilmaydi', async () => {
    const { svc, tx } = build({ groups: [{ id: 'g1', teacherId: 't1' }, { id: 'g2', teacherId: 'BOSHQA' }] });
    await expect(svc.createAssignment('t1', { ...base, groupIds: ['g1', 'g2'] })).rejects.toThrow(ForbiddenException);
    expect(tx.teacherAssignment.create).not.toHaveBeenCalled();
  });

  it('guruh tanlanmasa rad etadi', async () => {
    await expect(build().svc.createAssignment('t1', { ...base })).rejects.toThrow(BadRequestException);
  });

  it('fayllar: birinchi guruhga asl, qolganlarga nusxa (qayta yuklash yo\'q); turi faylning turidan', async () => {
    const { svc, tx } = build({ files: [pdf('f1'), pdf('f2')] });
    await svc.createAssignment('t1', { ...base, groupIds: ['g1', 'g2'], fileIds: ['f2', 'f1'] });
    expect(tx.teacherAssignment.create.mock.calls[0][0].data.type).toBe('PDF');
    // asl fayllar tanlangan tartibda biriktiriladi
    expect(tx.materialFile.update.mock.calls.map((c: any) => [c[0].where.id, c[0].data.order])).toEqual([['f2', 0], ['f1', 1]]);
    // ikkinchi guruh — nusxa
    const copies = tx.materialFile.createMany.mock.calls[0][0].data;
    expect(copies).toHaveLength(2);
    expect(copies[0]).toMatchObject({ assignmentId: 'a2', tgFileId: 'TG-f2' });
  });

  it('boshqa o\'qituvchining yoki biriktirilgan faylni ishlatib bo\'lmaydi', async () => {
    const { svc, prisma } = build({ files: [] }); // so'rov faqat o'ziniki + biriktirilmaganlarni topadi
    await expect(svc.createAssignment('t1', { ...base, groupId: 'g1', fileIds: ['x'] })).rejects.toThrow(/Fayl topilmadi/);
    expect(prisma.materialFile.findMany.mock.calls[0][0].where).toMatchObject({ uploaderId: 't1', assignmentId: null });
  });

  it('e\'lon uchun media talab qilinadi, qoralama uchun yo\'q', async () => {
    await expect(build().svc.createAssignment('t1', { ...base, type: 'VIDEO', groupId: 'g1' })).rejects.toThrow(BadRequestException);
    const d = build();
    await d.svc.createAssignment('t1', { ...base, type: 'VIDEO', groupId: 'g1', status: 'DRAFT' });
    expect(d.tx.teacherAssignment.create.mock.calls[0][0].data).toMatchObject({ status: 'DRAFT', publishedAt: null });
    expect(d.notifications.notifyMany).not.toHaveBeenCalled();
  });

  it('havola faqat http(s) bo\'lishi kerak (javascript: rad etiladi)', async () => {
    await expect(
      build().svc.createAssignment('t1', { ...base, type: 'VIDEO', groupId: 'g1', mediaUrl: 'javascript:alert(1)' }),
    ).rejects.toThrow(/http/);
  });

  it('noto\'g\'ri muddatni rad etadi, to\'g\'risini saqlaydi', async () => {
    await expect(build().svc.createAssignment('t1', { ...base, groupId: 'g1', dueAt: 'ertaga' })).rejects.toThrow(BadRequestException);
    const ok = build();
    await ok.svc.createAssignment('t1', { ...base, groupId: 'g1', dueAt: '2026-10-20T10:00:00Z' });
    expect(ok.tx.teacherAssignment.create.mock.calls[0][0].data.dueAt).toEqual(new Date('2026-10-20T10:00:00Z'));
  });

  it('e\'lon qilinganda o\'quvchilarga bildirishnoma yuboriladi', async () => {
    const { svc, prisma, notifications } = build();
    prisma.groupMember.findMany.mockResolvedValue([{ studentId: 's1' }, { studentId: 's2' }]);
    await svc.createAssignment('t1', { ...base, groupId: 'g1' });
    await new Promise((r) => setImmediate(r));
    expect(notifications.notifyMany).toHaveBeenCalledWith(['s1', 's2'], 'NEW_LESSON', 'Yangi material', expect.stringContaining('Dars'));
  });
});
