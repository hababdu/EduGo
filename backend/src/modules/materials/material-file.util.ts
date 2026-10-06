import { BadRequestException } from '@nestjs/common';
import { extname } from 'path';

/** Telegram Bot API: yuklash chegarasi 50 MB (so'rov tanasi bilan); xavfsiz zaxira bilan. */
export const MAX_UPLOAD_BYTES = 45 * 1024 * 1024;
/** Telegram Bot API: getFile orqali yuklab olish chegarasi 20 MB. */
export const MAX_INLINE_BYTES = 20 * 1024 * 1024;

export type FileKind = 'IMAGE' | 'PDF' | 'VIDEO' | 'FILE';

interface Rule {
  kind: FileKind;
  mimes: string[];
  /** Brauzerda ko'rsatish (inline) xavfsizmi */
  inline: boolean;
}

/**
 * Oq ro'yxat. SVG/HTML/JS/EXE ataylab yo'q — ular skript bajarishi yoki zararli bo'lishi mumkin.
 */
const RULES: Record<string, Rule> = {
  '.jpg': { kind: 'IMAGE', mimes: ['image/jpeg'], inline: true },
  '.jpeg': { kind: 'IMAGE', mimes: ['image/jpeg'], inline: true },
  '.png': { kind: 'IMAGE', mimes: ['image/png'], inline: true },
  '.webp': { kind: 'IMAGE', mimes: ['image/webp'], inline: true },
  '.gif': { kind: 'IMAGE', mimes: ['image/gif'], inline: true },
  '.pdf': { kind: 'PDF', mimes: ['application/pdf'], inline: true },
  '.mp4': { kind: 'VIDEO', mimes: ['video/mp4'], inline: true },
  '.mov': { kind: 'VIDEO', mimes: ['video/quicktime'], inline: true },
  '.webm': { kind: 'VIDEO', mimes: ['video/webm'], inline: true },
  '.doc': { kind: 'FILE', mimes: ['application/msword'], inline: false },
  '.docx': {
    kind: 'FILE',
    mimes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    inline: false,
  },
  '.ppt': { kind: 'FILE', mimes: ['application/vnd.ms-powerpoint'], inline: false },
  '.pptx': {
    kind: 'FILE',
    mimes: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    inline: false,
  },
  '.xls': { kind: 'FILE', mimes: ['application/vnd.ms-excel'], inline: false },
  '.xlsx': {
    kind: 'FILE',
    mimes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    inline: false,
  },
  '.txt': { kind: 'FILE', mimes: ['text/plain'], inline: false },
  '.zip': { kind: 'FILE', mimes: ['application/zip', 'application/x-zip-compressed'], inline: false },
};

export const ALLOWED_EXTENSIONS = Object.keys(RULES);

/** Fayl boshidagi "magic bytes" — kengaytma/MIME yolg'on bo'lsa, ushlaydi. */
function matchesSignature(ext: string, buf: Buffer): boolean {
  const startsWith = (...bytes: number[]) => bytes.every((b, i) => buf[i] === b);
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return startsWith(0xff, 0xd8, 0xff);
    case '.png':
      return startsWith(0x89, 0x50, 0x4e, 0x47);
    case '.gif':
      return startsWith(0x47, 0x49, 0x46, 0x38);
    case '.webp':
      return buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP';
    case '.pdf':
      return buf.subarray(0, 5).toString('latin1') === '%PDF-';
    case '.mp4':
    case '.mov':
      return buf.subarray(4, 8).toString('latin1') === 'ftyp';
    case '.webm':
      return startsWith(0x1a, 0x45, 0xdf, 0xa3);
    case '.docx':
    case '.pptx':
    case '.xlsx':
    case '.zip':
      return startsWith(0x50, 0x4b);
    case '.doc':
    case '.ppt':
    case '.xls':
      return startsWith(0xd0, 0xcf, 0x11, 0xe0);
    default:
      return true; // .txt — imzo yo'q
  }
}

export interface ValidatedFile {
  kind: FileKind;
  mimeType: string;
  inline: boolean;
  fileName: string;
}

/** Fayl nomini tozalaydi: yo'l ajratgichlari, boshqaruv belgilari olib tashlanadi, uzunligi cheklanadi. */
export function sanitizeFileName(name: string): string {
  const base = (name || 'fayl').replace(/\\/g, '/').split('/').pop() ?? 'fayl';
  // eslint-disable-next-line no-control-regex
  const cleaned = base.replace(/[\u0000-\u001f\u007f"<>|?*]/g, '').trim();
  const ext = extname(cleaned);
  const stem = cleaned.slice(0, cleaned.length - ext.length).slice(0, 120) || 'fayl';
  return `${stem}${ext}`;
}

export function validateUpload(originalName: string, claimedMime: string, buf: Buffer): ValidatedFile {
  if (!buf || buf.length === 0) throw new BadRequestException("Fayl bo'sh");
  if (buf.length > MAX_UPLOAD_BYTES) {
    throw new BadRequestException(`Fayl juda katta (${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB gacha)`);
  }
  const fileName = sanitizeFileName(originalName);
  const ext = extname(fileName).toLowerCase();
  const rule = RULES[ext];
  if (!rule) {
    throw new BadRequestException(`Bu fayl turi qo'llab-quvvatlanmaydi (${ext || 'kengaytmasiz'})`);
  }
  // Ba'zi brauzerlar MIME'ni noto'g'ri yuboradi (masalan .mov → video/mp4); faqat kengaytma bilan bir xil KATEGORIYA talab qilinadi
  const mime = (claimedMime || '').toLowerCase();
  const sameCategory =
    (rule.kind === 'IMAGE' && mime.startsWith('image/')) ||
    (rule.kind === 'VIDEO' && mime.startsWith('video/')) ||
    rule.kind === 'PDF' ||
    rule.kind === 'FILE' ||
    rule.mimes.includes(mime);
  if (!sameCategory) throw new BadRequestException('Fayl turi kengaytmaga mos kelmaydi');
  if (!matchesSignature(ext, buf)) {
    throw new BadRequestException('Fayl mazmuni kengaytmaga mos kelmaydi');
  }
  return { kind: rule.kind, mimeType: rule.mimes[0], inline: rule.inline, fileName };
}

export function isInlineSafe(mimeType: string): boolean {
  return Object.values(RULES).some((r) => r.inline && r.mimes.includes(mimeType));
}
