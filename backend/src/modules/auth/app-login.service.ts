import { Injectable, NotFoundException, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { AuthService } from './auth.service';
import { AuthTokensResponse } from './dto/telegram-auth.dto';
import { PrismaService } from '../../prisma/prisma.service';

export interface AppLoginTgUser {
  id: number | string;
  first_name: string;
  last_name?: string;
  username?: string;
}

const TTL_MS = 5 * 60_000;

/**
 * Telegram'siz muhit (PWA / APK) uchun kirish: ilova kod so'raydi → foydalanuvchi botda
 * `/start login_<id>` bosadi → bot tasdiqlaydi → ilova poll qilib token oladi.
 * Sessiyalar Postgres'da saqlanadi (TTL 5 daqiqa) — qayta ishga tushish va ko'p nusxada ham ishlaydi.
 */
@Injectable()
export class AppLoginService {
  private botUsername: string | null = null;

  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private hash(v: string) {
    return crypto.createHash('sha256').update(v).digest('hex');
  }

  private sweep() {
    this.prisma.appLoginSession.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => undefined);
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
    await this.prisma.appLoginSession.create({ data: { id, secretHash: this.hash(secret), expiresAt: new Date(Date.now() + TTL_MS) } });
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
  async confirm(id: string, user: AppLoginTgUser) {
    if (!user?.id || !user.first_name) throw new BadRequestException("Foydalanuvchi ma'lumoti yo'q");
    const r = await this.prisma.appLoginSession.updateMany({
      where: { id, expiresAt: { gt: new Date() } },
      data: { tgUser: user as any },
    });
    if (r.count === 0) throw new NotFoundException('Kod eskirgan');
    return { ok: true };
  }

  async poll(id: string, secret: string): Promise<{ status: 'pending' } | ({ status: 'ok' } & AuthTokensResponse)> {
    const e = await this.prisma.appLoginSession.findUnique({ where: { id } });
    if (!e || e.expiresAt < new Date()) {
      if (e) await this.prisma.appLoginSession.deleteMany({ where: { id } });
      throw new NotFoundException("Kod eskirgan, qaytadan urinib ko'ring");
    }
    const a = Buffer.from(this.hash(secret));
    const b = Buffer.from(e.secretHash);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new NotFoundException('Kod eskirgan');
    if (!e.tgUser) return { status: 'pending' };
    // Bir martalik: atomik o'chirish — parallel ikki poll ikki token olmaydi
    const del = await this.prisma.appLoginSession.deleteMany({ where: { id } });
    if (del.count === 0) throw new NotFoundException('Kod eskirgan');
    const tokens = await this.auth.loginTelegramUser(e.tgUser as unknown as AppLoginTgUser);
    return { status: 'ok', ...tokens };
  }
}
