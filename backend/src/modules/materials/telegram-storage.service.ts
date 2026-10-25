import { BadRequestException, HttpException, HttpStatus, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MAX_INLINE_BYTES } from './material-file.util';

export interface StoredTelegramFile {
  fileId: string;
  messageId: number;
  /** Fayl yuklangan kanal */
  chatId: string;
}

/** Telegram kanal/supergroup ID'si: -100 + raqamlar */
export const CHANNEL_ID_RE = /^-100\d{5,}$/;

/**
 * Fayllarni Telegram'dagi MAXFIY kanalda saqlaydi (bot — kanal admini).
 * Har maktabning O'Z yopiq kanali bor (Organization.storageChatId); kanal berilmasa (maktabsiz foydalanuvchi,
 * platforma) umumiy TELEGRAM_STORAGE_CHAT_ID ishlatiladi. Kerak: BOT_TOKEN.
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

  /** Bot tokeni bor (maktab kanallari uchun umumiy kanal shart emas) */
  get hasBot(): boolean {
    return !!this.token;
  }

  /** Qaysi kanalga yozilishi: berilgan maktab kanali, bo'lmasa umumiy. */
  private target(chatId?: string | null): string {
    if (!this.token) {
      throw new ServiceUnavailableException('Fayl saqlash sozlanmagan (BOT_TOKEN kerak).');
    }
    const id = chatId || this.storageChatId;
    if (!id) {
      throw new ServiceUnavailableException(
        "Fayl saqlash sozlanmagan: maktabga yopiq kanal biriktirilmagan (TELEGRAM_STORAGE_CHAT_ID ham yo'q).",
      );
    }
    return id;
  }

  private api(method: string) {
    return `https://api.telegram.org/bot${this.token}/${method}`;
  }

  private requireConfigured() {
    if (!this.token) {
      throw new ServiceUnavailableException('Fayl saqlash sozlanmagan (BOT_TOKEN kerak). Hozircha havola (URL) bilan materiallar yarating.');
    }
  }

  private cachedBotUsername?: string;
  /** Bot @username'i (taklif havolalari uchun). BOT_USERNAME env yoki getMe; topilmasa null. */
  async botUsername(): Promise<string | null> {
    if (this.cachedBotUsername) return this.cachedBotUsername;
    const env = process.env.BOT_USERNAME?.replace(/^@/, '').trim();
    if (env) return (this.cachedBotUsername = env);
    if (!this.token) return null;
    try {
      const res = await fetch(this.api('getMe'));
      const json: any = await res.json();
      const u = json?.result?.username;
      if (typeof u === 'string' && u) return (this.cachedBotUsername = u);
    } catch { /* tarmoq xatosi — havolasiz davom etamiz */ }
    return null;
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

  async store(buf: Buffer, fileName: string, mimeType: string, chatId?: string | null): Promise<StoredTelegramFile> {
    const target = this.target(chatId);
    const form = new FormData();
    form.append('chat_id', target);
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
    return { fileId: doc.file_id, messageId: json.result.message_id, chatId: target };
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
  async remove(messageId?: number | null, chatId?: string | null): Promise<void> {
    const target = chatId || this.storageChatId;
    if (!this.token || !target || !messageId) return;
    try {
      await fetch(this.api('deleteMessage'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: target, message_id: messageId }),
      });
    } catch {
      /* e'tiborsiz */
    }
  }

  /**
   * Maktab kanalini tekshiradi: kanal bor, YOPIQ (ochiq @username yo'q) va bot unda xabar yubora oladigan admin.
   * Muvaffaqiyatda kanal nomini qaytaradi; aks holda tushunarli 400 xato.
   */
  async verifyChannel(chatId: string): Promise<{ title: string }> {
    if (!this.token) throw new ServiceUnavailableException('BOT_TOKEN sozlanmagan');
    if (!CHANNEL_ID_RE.test(chatId)) {
      throw new BadRequestException("Kanal ID noto'g'ri. U -100 bilan boshlanadi (masalan -1001234567890)");
    }
    const call = async (method: string, body: Record<string, unknown>) => {
      let res: Response;
      try {
        res = await fetch(this.api(method), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      } catch {
        throw new HttpException("Telegram bilan bog'lanib bo'lmadi", HttpStatus.BAD_GATEWAY);
      }
      let json: any = null;
      try { json = await res.json(); } catch { /* bo'sh */ }
      return { ok: res.ok && json?.ok !== false, json };
    };

    const chat = await call('getChat', { chat_id: chatId });
    if (!chat.ok) {
      throw new BadRequestException("Kanal topilmadi yoki bot unga qo'shilmagan. Botni kanalga ADMIN qilib qo'shing");
    }
    const info = chat.json?.result ?? {};
    if (info.type !== 'channel' && info.type !== 'supergroup') {
      throw new BadRequestException('Bu kanal emas. Yopiq (private) Telegram kanal kerak');
    }
    if (info.username) {
      throw new BadRequestException("Kanal OCHIQ (ommaviy havolasi bor). Maktab ma'lumoti uchun YOPIQ (private) kanal kerak");
    }

    const me = await call('getMe', {});
    const botId = me.json?.result?.id;
    const member = await call('getChatMember', { chat_id: chatId, user_id: botId });
    const m = member.json?.result;
    const isAdmin = member.ok && (m?.status === 'creator' || m?.status === 'administrator');
    if (!isAdmin) throw new BadRequestException('Bot kanalda admin emas. Botni admin qiling');
    if (m.status === 'administrator' && info.type === 'channel' && m.can_post_messages === false) {
      throw new BadRequestException("Botga kanalga xabar yuborish huquqini bering (Post messages)");
    }
    return { title: String(info.title ?? '') };
  }
}
