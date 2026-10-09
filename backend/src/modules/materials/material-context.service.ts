import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { MAX_INLINE_BYTES } from './material-file.util';
import { TelegramStorageService } from './telegram-storage.service';

/** AI ga beriladigan matnning umumiy chegarasi (belgi) — token xarajatini cheklaydi. */
export const MAX_CONTEXT_CHARS = 24_000;
const MAX_PER_FILE_CHARS = 12_000;

export interface MaterialContext {
  title: string;
  text: string;
  used: string[];
  skipped: { name: string; reason: string }[];
}

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** Materialning matni va biriktirilgan fayllaridan (PDF/DOCX/TXT) o'qiladigan kontekst yig'adi. */
@Injectable()
export class MaterialContextService {
  private readonly log = new Logger(MaterialContextService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tg: TelegramStorageService,
  ) {}

  async build(actor: CurrentUserPayload, assignmentId: string): Promise<MaterialContext> {
    const a = await this.prisma.teacherAssignment.findFirst({
      where: { id: assignmentId, deletedAt: null },
      include: { files: { orderBy: { order: 'asc' } } },
    });
    if (!a) throw new NotFoundException('Material topilmadi');
    const staff = actor.role === 'ADMIN' || actor.role === 'SUPER_ADMIN';
    if (!staff && a.teacherId !== actor.id) throw new ForbiddenException("Bu materialga ruxsat yo'q");

    const parts: string[] = [];
    if (a.description?.trim()) parts.push(a.description.trim());

    const used: string[] = [];
    const skipped: { name: string; reason: string }[] = [];

    for (const f of a.files) {
      let remaining = MAX_CONTEXT_CHARS - parts.join('\n\n').length;
      if (remaining < 500) {
        skipped.push({ name: f.fileName, reason: 'hajm chegarasi' });
        continue;
      }
      const kind = this.kindOf(f.mimeType, f.fileName);
      if (!kind) {
        skipped.push({ name: f.fileName, reason: "matn o'qib bo'lmaydigan format" });
        continue;
      }
      if (f.sizeBytes > MAX_INLINE_BYTES) {
        skipped.push({ name: f.fileName, reason: 'fayl 20 MB dan katta' });
        continue;
      }
      try {
        const buf = await this.tg.download(f.tgFileId, f.sizeBytes);
        const text = (await this.extract(kind, buf)).replace(/\s+\n/g, '\n').replace(/[ \t]{2,}/g, ' ').trim();
        if (text.length < 40) {
          skipped.push({ name: f.fileName, reason: "matn topilmadi (skan qilingan bo'lishi mumkin)" });
          continue;
        }
        remaining = Math.min(remaining, MAX_PER_FILE_CHARS);
        parts.push(`### Fayl: ${f.fileName}\n${text.slice(0, remaining)}`);
        used.push(f.fileName);
      } catch (e) {
        this.log.warn(`Fayl o'qilmadi (${f.id}): ${(e as Error).message}`);
        skipped.push({ name: f.fileName, reason: "o'qib bo'lmadi" });
      }
    }

    return { title: a.title, text: parts.join('\n\n').slice(0, MAX_CONTEXT_CHARS), used, skipped };
  }

  private kindOf(mime: string, name: string): 'pdf' | 'docx' | 'txt' | null {
    const n = name.toLowerCase();
    if (mime === 'application/pdf' || n.endsWith('.pdf')) return 'pdf';
    if (mime === DOCX || n.endsWith('.docx')) return 'docx';
    if (mime === 'text/plain' || n.endsWith('.txt')) return 'txt';
    return null;
  }

  private async extract(kind: 'pdf' | 'docx' | 'txt', buf: Buffer): Promise<string> {
    if (kind === 'txt') return buf.toString('utf8');
    if (kind === 'docx') {
      const mammoth = await import('mammoth');
      return (await mammoth.extractRawText({ buffer: buf })).value;
    }
    // index.js o'rniga to'g'ridan-to'g'ri lib: paket indeksi import paytida sinov faylini o'qiydi
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (b: Buffer) => Promise<{ text: string }>;
    return (await pdfParse(buf)).text;
  }
}
