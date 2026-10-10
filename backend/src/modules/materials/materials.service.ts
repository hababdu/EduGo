import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { MAX_INLINE_BYTES, isInlineSafe, validateUpload } from './material-file.util';
import { TelegramStorageService } from './telegram-storage.service';

const STAFF = ['ADMIN', 'SUPER_ADMIN'];
/** Biriktirilmagan (yetim) fayllar soni cheklovi — Telegram xotirasini suiiste'mol qilishdan saqlaydi */
const MAX_ORPHANS_PER_USER = 30;
const MAX_ORPHANS_PER_STUDENT = 8;

@Injectable()
export class MaterialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tg: TelegramStorageService,
  ) {}

  /* ---------------- yuklash ---------------- */
  async upload(actor: CurrentUserPayload, file: { originalname: string; mimetype: string; buffer: Buffer }) {
    if (!file) throw new BadRequestException('Fayl yuborilmadi');
    const v = validateUpload(file.originalname, file.mimetype, file.buffer);

    const isStudent = actor.role === 'STUDENT';
    if (isStudent) {
      // O'quvchi faqat vazifa javobi uchun yuklaydi: video yo'q, hajm kichikroq (AI ham o'qiy olishi uchun)
      if (v.kind === 'VIDEO') throw new BadRequestException("Vazifaga video yuklab bo'lmaydi");
      if (file.buffer.length > MAX_INLINE_BYTES) throw new BadRequestException('Fayl 20 MB dan oshmasin');
    }

    const orphans = await this.prisma.materialFile.count({
      where: { uploaderId: actor.id, assignmentId: null, submissionId: null },
    });
    if (orphans >= (isStudent ? MAX_ORPHANS_PER_STUDENT : MAX_ORPHANS_PER_USER)) {
      throw new BadRequestException("Biriktirilmagan fayllar ko'p. Avval materialni saqlang yoki keraksiz fayllarni o'chiring");
    }

    const stored = await this.tg.store(file.buffer, v.fileName, v.mimeType);
    const row = await this.prisma.materialFile.create({
      data: {
        uploaderId: actor.id,
        kind: v.kind,
        fileName: v.fileName,
        mimeType: v.mimeType,
        sizeBytes: file.buffer.length,
        tgFileId: stored.fileId,
        tgMessageId: stored.messageId,
      },
    });
    return this.toDto(row);
  }

  toDto(f: { id: string; kind: string; fileName: string; mimeType: string; sizeBytes: number; order?: number }) {
    return {
      id: f.id,
      kind: f.kind,
      fileName: f.fileName,
      mimeType: f.mimeType,
      sizeBytes: f.sizeBytes,
      order: f.order ?? 0,
      /** Ilova ichida ko'rsatsa bo'ladimi (≤ 20 MB) */
      previewable: f.sizeBytes <= MAX_INLINE_BYTES,
    };
  }

  /* ---------------- ruxsat ---------------- */
  private async loadAccessible(actor: CurrentUserPayload, fileId: string) {
    const file = await this.prisma.materialFile.findUnique({
      where: { id: fileId },
      include: {
        assignment: { select: { id: true, teacherId: true, groupId: true, status: true, deletedAt: true } },
        submission: { select: { studentId: true, assignment: { select: { teacherId: true } } } },
      },
    });
    if (!file) throw new NotFoundException('Fayl topilmadi');

    if (STAFF.includes(actor.role)) return file;

    // O'quvchi topshirig'idagi fayl: faqat o'zi, vazifa o'qituvchisi va admin ko'radi (boshqa o'quvchilar emas)
    if (file.submission) {
      if (file.submission.studentId === actor.id || file.submission.assignment.teacherId === actor.id) return file;
      throw new ForbiddenException("Bu faylga ruxsat yo'q");
    }

    const a = file.assignment;
    if (!a) {
      if (file.uploaderId !== actor.id) throw new ForbiddenException('Bu faylga ruxsat yo\'q');
      return file;
    }
    if (a.deletedAt) throw new NotFoundException('Fayl topilmadi');
    if (a.teacherId === actor.id) return file;

    if (actor.role === 'STUDENT' && a.status === 'PUBLISHED') {
      const member = await this.prisma.groupMember.findFirst({
        where: { studentId: actor.id, groupId: a.groupId },
        select: { id: true },
      });
      if (member) return file;
    }
    throw new ForbiddenException("Bu faylga ruxsat yo'q");
  }

  /* ---------------- ko'rish / yuklab olish ---------------- */
  async content(actor: CurrentUserPayload, fileId: string) {
    const file = await this.loadAccessible(actor, fileId);
    const buffer = await this.tg.download(file.tgFileId, file.sizeBytes);
    return { file, buffer, inline: isInlineSafe(file.mimeType) };
  }

  async sendToChat(actor: CurrentUserPayload, fileId: string) {
    const file = await this.loadAccessible(actor, fileId);
    const user = await this.prisma.user.findUnique({ where: { id: actor.id }, select: { telegramId: true } });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
    await this.tg.sendToChat(user.telegramId, file.tgFileId, file.fileName);
    return { ok: true };
  }

  /* ---------------- o'chirish ---------------- */
  async remove(actor: CurrentUserPayload, fileId: string) {
    const file = await this.prisma.materialFile.findUnique({
      where: { id: fileId },
      include: { assignment: { select: { teacherId: true } } },
    });
    if (!file) throw new NotFoundException('Fayl topilmadi');
    // O'quvchi faqat o'zining hali biriktirilmagan faylini o'chira oladi (topshiriqdagi fayl — qayta topshirish orqali)
    if (actor.role === 'STUDENT' && (file.submissionId || file.assignmentId || file.uploaderId !== actor.id)) {
      throw new ForbiddenException("Bu faylni o'chirishga ruxsat yo'q");
    }
    const owner = file.assignment ? file.assignment.teacherId : file.uploaderId;
    if (owner !== actor.id && !STAFF.includes(actor.role)) {
      throw new ForbiddenException("Bu faylni o'chirishga ruxsat yo'q");
    }
    await this.prisma.materialFile.delete({ where: { id: fileId } });

    // Boshqa material (ko'p guruhga nusxa) shu Telegram faylidan foydalanayotgan bo'lsa — kanal xabarini saqlab qolamiz
    if (file.tgMessageId) {
      const shared = await this.prisma.materialFile.count({ where: { tgFileId: file.tgFileId } });
      if (shared === 0) await this.tg.remove(file.tgMessageId);
    }
    return { ok: true };
  }
}
