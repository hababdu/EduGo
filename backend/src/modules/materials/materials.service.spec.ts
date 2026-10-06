import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MaterialsService } from './materials.service';

const teacher: any = { id: 't1', role: 'TEACHER' };
const otherTeacher: any = { id: 't2', role: 'TEACHER' };
const admin: any = { id: 'adm', role: 'ADMIN' };
const student: any = { id: 's1', role: 'STUDENT' };
const outsider: any = { id: 's9', role: 'STUDENT' };

const pdfBuf = Buffer.from('%PDF-1.7 hello');

function file(over: any = {}) {
  return {
    id: 'f1', uploaderId: 't1', assignmentId: 'a1', kind: 'PDF', fileName: 'x.pdf',
    mimeType: 'application/pdf', sizeBytes: 100, tgFileId: 'TG1', tgMessageId: 5,
    assignment: { id: 'a1', teacherId: 't1', groupId: 'g1', status: 'PUBLISHED', deletedAt: null },
    ...over,
  };
}

function build(f: any = file(), member = true) {
  const prisma: any = {
    materialFile: {
      findUnique: jest.fn().mockResolvedValue(f),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockImplementation(async ({ data }: any) => ({ id: 'new', order: 0, ...data })),
      delete: jest.fn().mockResolvedValue({}),
    },
    groupMember: { findFirst: jest.fn().mockResolvedValue(member ? { id: 'm' } : null) },
    user: { findUnique: jest.fn().mockResolvedValue({ telegramId: '777' }) },
  };
  const tg: any = {
    store: jest.fn().mockResolvedValue({ fileId: 'TGNEW', messageId: 9 }),
    download: jest.fn().mockResolvedValue(Buffer.from('data')),
    sendToChat: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
  };
  return { prisma, tg, svc: new MaterialsService(prisma, tg) };
}

describe('MaterialsService.upload', () => {
  it('faylni tekshirib, Telegramga yuklab, bazaga yozadi', async () => {
    const { svc, tg, prisma } = build();
    const dto = await svc.upload(teacher, { originalname: 'q.pdf', mimetype: 'application/pdf', buffer: pdfBuf });
    expect(tg.store).toHaveBeenCalled();
    expect(prisma.materialFile.create.mock.calls[0][0].data).toMatchObject({ uploaderId: 't1', kind: 'PDF', tgFileId: 'TGNEW' });
    expect(dto).toMatchObject({ kind: 'PDF', previewable: true });
    expect(dto).not.toHaveProperty('tgFileId'); // Telegram identifikatori mijozga chiqmaydi
  });

  it('noto\'g\'ri fayl Telegramga yetib bormaydi', async () => {
    const { svc, tg } = build();
    await expect(svc.upload(teacher, { originalname: 'x.exe', mimetype: 'x/x', buffer: pdfBuf })).rejects.toThrow(BadRequestException);
    expect(tg.store).not.toHaveBeenCalled();
  });

  it('yetim fayllar chegarasidan oshsa rad etadi', async () => {
    const { svc, prisma, tg } = build();
    prisma.materialFile.count.mockResolvedValue(30);
    await expect(svc.upload(teacher, { originalname: 'q.pdf', mimetype: 'application/pdf', buffer: pdfBuf })).rejects.toThrow(/ko'p/);
    expect(tg.store).not.toHaveBeenCalled();
  });

  it('20 MB dan katta fayl previewable=false', async () => {
    const { svc } = build();
    expect(svc.toDto({ id: 'x', kind: 'VIDEO', fileName: 'v.mp4', mimeType: 'video/mp4', sizeBytes: 30 * 1024 * 1024 }).previewable).toBe(false);
  });
});

describe('MaterialsService ruxsat', () => {
  it('egasi, admin va a\'zo o\'quvchi ko\'ra oladi', async () => {
    for (const actor of [teacher, admin, student]) {
      const { svc } = build();
      await expect(svc.content(actor, 'f1')).resolves.toMatchObject({ inline: true });
    }
  });

  it('boshqa o\'qituvchi va guruhga a\'zo bo\'lmagan o\'quvchi ko\'ra olmaydi', async () => {
    await expect(build().svc.content(otherTeacher, 'f1')).rejects.toThrow(ForbiddenException);
    await expect(build(file(), false).svc.content(outsider, 'f1')).rejects.toThrow(ForbiddenException);
  });

  it('qoralamadagi materialning faylini o\'quvchi ko\'ra olmaydi', async () => {
    const draft = file({ assignment: { id: 'a1', teacherId: 't1', groupId: 'g1', status: 'DRAFT', deletedAt: null } });
    await expect(build(draft).svc.content(student, 'f1')).rejects.toThrow(ForbiddenException);
    await expect(build(draft).svc.content(teacher, 'f1')).resolves.toBeDefined();
  });

  it('o\'chirilgan material fayli topilmadi', async () => {
    const del = file({ assignment: { id: 'a1', teacherId: 't1', groupId: 'g1', status: 'PUBLISHED', deletedAt: new Date() } });
    await expect(build(del).svc.content(student, 'f1')).rejects.toThrow(NotFoundException);
  });

  it('biriktirilmagan faylni faqat yuklagan kishi ko\'radi', async () => {
    const orphan = file({ assignmentId: null, assignment: null });
    await expect(build(orphan).svc.content(teacher, 'f1')).resolves.toBeDefined();
    await expect(build(orphan).svc.content(otherTeacher, 'f1')).rejects.toThrow(ForbiddenException);
  });

  it('mavjud bo\'lmagan fayl — 404', async () => {
    await expect(build(null).svc.content(teacher, 'zzz')).rejects.toThrow(NotFoundException);
  });

  it('inline xavfsiz bo\'lmagan tur (docx) attachment sifatida beriladi', async () => {
    const docx = file({ kind: 'FILE', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    await expect(build(docx).svc.content(teacher, 'f1')).resolves.toMatchObject({ inline: false });
  });
});

describe('MaterialsService.sendToChat / remove', () => {
  it('faylni faqat so\'rovchining O\'Z chatiga yuboradi', async () => {
    const { svc, tg } = build();
    await svc.sendToChat(student, 'f1');
    expect(tg.sendToChat).toHaveBeenCalledWith('777', 'TG1', 'x.pdf');
  });

  it('ruxsatsiz foydalanuvchiga yubormaydi', async () => {
    const { svc, tg } = build(file(), false);
    await expect(svc.sendToChat(outsider, 'f1')).rejects.toThrow(ForbiddenException);
    expect(tg.sendToChat).not.toHaveBeenCalled();
  });

  it('o\'chirish: faqat egasi/admin; boshqalar nusxa ishlatayotgan bo\'lsa Telegram xabari saqlanadi', async () => {
    await expect(build().svc.remove(otherTeacher, 'f1')).rejects.toThrow(ForbiddenException);
    await expect(build().svc.remove(student, 'f1')).rejects.toThrow(ForbiddenException);

    const a = build();
    await a.svc.remove(teacher, 'f1');
    expect(a.tg.remove).toHaveBeenCalledWith(5);

    const b = build();
    b.prisma.materialFile.count.mockResolvedValue(1); // boshqa guruh nusxasi bor
    await b.svc.remove(admin, 'f1');
    expect(b.tg.remove).not.toHaveBeenCalled();
  });
});
