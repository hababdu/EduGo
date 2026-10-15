import { Injectable, NotFoundException, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { AuthService } from './auth.service';
import { AuthTokensResponse } from './dto/telegram-auth.dto';

export interface AppLoginTgUser {
  id: number | string;
  first_name: string;
  last_name?: string;
  username?: string;
}

interface Entry {
  secretHash: string;
  expiresAt: number;
  user?: AppLoginTgUser;
}

const TTL_MS = 5 * 60_000;
const MAX_ENTRIES = 5000;

/**
 * Telegram'siz muhit (PWA / APK) uchun kirish: ilova kod so'raydi → foydalanuvchi botda
 * `/start login_<id>` bosadi → bot tasdiqlaydi → ilova poll qilib token oladi.
 * Xotirada saqlanadi (TTL 5 daqiqa) — bitta backend instance uchun yetarli.
 */
@Injectable()
export class AppLoginService {
  private readonly store = new Map<string, Entry>();
  private botUsername: string | null = null;

  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  private hash(v: string) {
    return crypto.createHash('sha256').update(v).digest('hex');
  }

  private sweep() {
    const now = Date.now();
    for (const [k, v] of this.store) if (v.expiresAt < now) this.store.delete(k);
    if (this.store.size > MAX_ENTRIES) {
      const extra = this.store.size - MAX_ENTRIES;
      [...this.store.keys()].slice(0, extra).forEach((k) => this.store.delete(k));
    }
  }

  private async getBotUsername(): Promise<string> {
    const env = this.config.get<string>('BOT_USERNAME');
    if (env) return env.replace(/^@/, '');
    if (this.botUsername) return this.botUsername;
    const token = this.config.get<string>('BOT_TOKEN');
    if (!token) throw new ServiceUnavailableException('Bot sozlanmagan');
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
      const data: any = await res.json();
      if (!data?.ok || !data.result?.username) throw new Error('getMe');
      this.botUsername = data.result.username;
      return this.botUsername!;
    } catch {
      throw new ServiceUnavailableException('Bot username aniqlanmadi');
    }
  }

  async start() {
    this.sweep();
    const id = crypto.randomBytes(9).toString('base64url');
    const secret = crypto.randomBytes(24).toString('base64url');
    this.store.set(id, { secretHash: this.hash(secret), expiresAt: Date.now() + TTL_MS });
    // Bepul tarifda bot uxlab qoladi — Telegram xabari kelganda tez javob berishi uchun uyg'otamiz
    const wake = this.config.get<string>('BOT_WAKE_URL');
    if (wake) fetch(wake).catch(() => undefined);
    const username = await this.getBotUsername();
    return {
      id,
      secret,
      botUsername: username,
      url: `https://t.me/${username}?start=login_${id}`,
      deepLink: `tg://resolve?domain=${username}&start=login_${id}`,
      expiresIn: TTL_MS / 1000,
    };
  }

  /** Bot chaqiradi (InternalAuthGuard bilan himoyalangan). */
  confirm(id: string, user: AppLoginTgUser) {
    const e = this.store.get(id);
    if (!e || e.expiresAt < Date.now()) throw new NotFoundException('Kod eskirgan');
    if (!user?.id || !user.first_name) throw new BadRequestException('Foydalanuvchi ma\'lumoti yo\'q');
    e.user = user;
    return { ok: true };
  }

  async poll(id: string, secret: string): Promise<{ status: 'pending' } | ({ status: 'ok' } & AuthTokensResponse)> {
    const e = this.store.get(id);
    if (!e || e.expiresAt < Date.now()) {
      this.store.delete(id);
      throw new NotFoundException('Kod eskirgan, qaytadan urinib ko\'ring');
    }
    const a = Buffer.from(this.hash(secret));
    const b = Buffer.from(e.secretHash);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new NotFoundException('Kod eskirgan');
    if (!e.user) return { status: 'pending' };
    this.store.delete(id); // bir martalik
    const tokens = await this.auth.loginTelegramUser(e.user);
    return { status: 'ok', ...tokens };
  }
}
