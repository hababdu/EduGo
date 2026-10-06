import { HttpException, HttpStatus, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MAX_INLINE_BYTES } from './material-file.util';

export interface StoredTelegramFile {
  fileId: string;
  messageId: number;
}

/**
 * Fayllarni Telegram'dagi MAXFIY kanalda saqlaydi (bot — kanal admini).
 * Kerak: BOT_TOKEN va TELEGRAM_STORAGE_CHAT_ID (masalan -1001234567890).
 */
@Injectable()
export class TelegramStorageService {
  private readonly logger = new Logger(TelegramStorageService.name);
  private readonly token?: string;
  private readonly storageChatId?: string;

  constructor(config: ConfigService) {
    this.token = config.get<string>('BOT_TOKEN');
    this.storageChatId = config.get<string>('TELEGRAM_STORAGE_CHAT_ID');
  }

  get configured(): boolean {
    return !!this.token && !!this.storageChatId;
  }

  private api(method: string) {
    return `https://api.telegram.org/bot${this.token}/${method}`;
  }

  private requireConfigured() {
    if (!this.configured) {
      throw new ServiceUnavailableException(
        'Fayl saqlash sozlanmagan (TELEGRAM_STORAGE_CHAT_ID kerak). Hozircha havola (URL) bilan materiallar yarating.',
      );
    }
  }

  /** Xato matnidan token sizib chiqmasligi uchun faqat Telegram "description" qaytariladi. */
  private async fail(res: Response, what: string): Promise<never> {
    let desc = '';
    try {
      desc = ((await res.json()) as any)?.description ?? '';
    } catch {
      /* ignore */
    }
    this.logger.warn(`Telegram ${what} xatosi: HTTP ${res.status} ${desc}`);
    throw new HttpException(`Telegram bilan bog'lanishda xatolik (${what})`, HttpStatus.BAD_GATEWAY);
  }

  async store(buf: Buffer, fileName: string, mimeType: string): Promise<StoredTelegramFile> {
    this.requireConfigured();
    const form = new FormData();
    form.append('chat_id', this.storageChatId!);
    form.append('disable_notification', 'true');
    form.append('document', new Blob([new Uint8Array(buf)], { type: mimeType }), fileName);

    let res: Response;
    try {
      res = await fetch(this.api('sendDocument'), { method: 'POST', body: form });
    } catch (e) {
      this.logger.warn(`Telegram'ga yuklashda tarmoq xatosi: ${(e as Error).message}`);
      throw new HttpException("Telegram'ga yuklab bo'lmadi", HttpStatus.BAD_GATEWAY);
    }
    if (!res.ok) await this.fail(res, 'yuklash');
    const json: any = await res.json();
    const doc = json?.result?.document;
    if (!doc?.file_id) throw new HttpException("Telegram javobi noto'g'ri", HttpStatus.BAD_GATEWAY);
    return { fileId: doc.file_id, messageId: json.result.message_id };
  }

  /** Faylni oladi (≤ 20 MB). Katta bo'lsa 413 — mijoz "Telegramga yuborish"ni taklif qiladi. */
  async download(fileId: string, knownSize?: number): Promise<Buffer> {
    this.requireConfigured();
    if (knownSize && knownSize > MAX_INLINE_BYTES) {
      throw new HttpException('Fayl 20 MB dan katta — Telegramga yuborish orqali oching', HttpStatus.PAYLOAD_TOO_LARGE);
    }
    const info = await fetch(this.api(`getFile?file_id=${encodeURIComponent(fileId)}`));
    if (!info.ok) {
      if (info.status === 400) {
        throw new HttpException('Fayl 20 MB dan katta — Telegramga yuborish orqali oching', HttpStatus.PAYLOAD_TOO_LARGE);
      }
      await this.fail(info, 'getFile');
    }
    const path = ((await info.json()) as any)?.result?.file_path as string | undefined;
    if (!path) throw new HttpException('Fayl topilmadi', HttpStatus.BAD_GATEWAY);
    const res = await fetch(`https://api.telegram.org/file/bot${this.token}/${path}`);
    if (!res.ok) await this.fail(res, 'yuklab olish');
    return Buffer.from(await res.arrayBuffer());
  }

  /** Mavjud file_id'ni foydalanuvchi chatiga yuboradi (hajm cheklovisiz — qayta yuklash yo'q). */
  async sendToChat(chatId: string, fileId: string, caption?: string): Promise<void> {
    this.requireConfigured();
    const res = await fetch(this.api('sendDocument'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, document: fileId, caption: caption?.slice(0, 1000) }),
    });
    if (!res.ok) {
      this.logger.warn(`sendDocument(chat) HTTP ${res.status}`);
      throw new HttpException(
        "Botdan fayl yuborib bo'lmadi. Avval botga /start yuboring va qayta urinib ko'ring.",
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /** Best-effort: kanal xabarini o'chiradi (xatolik e'tiborsiz). */
  async remove(messageId?: number | null): Promise<void> {
    if (!this.configured || !messageId) return;
    try {
      await fetch(this.api('deleteMessage'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: this.storageChatId, message_id: messageId }),
      });
    } catch {
      /* e'tiborsiz */
    }
  }
}
