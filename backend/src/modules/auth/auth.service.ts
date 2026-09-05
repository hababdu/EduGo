import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { verifyTelegramInitData } from './utils/telegram-verify.util';
import { AuthTokensResponse } from './dto/telegram-auth.dto';

interface AccessTokenPayload {
  sub: string; // userId
  role: string;
}

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_DAYS = 30;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Telegram WebApp initData orqali login/register.
   * Bu SISTEMADAGI YAGONA kirish nuqtasi — login/parol yo'q.
   */
  async loginWithTelegram(initData: string): Promise<AuthTokensResponse> {
    const botToken = this.configService.get<string>('BOT_TOKEN');
    if (!botToken) {
      throw new InternalServerErrorException('BOT_TOKEN sozlanmagan');
    }

    let verified;
    try {
      verified = verifyTelegramInitData(initData, botToken);
    } catch (err) {
      throw new UnauthorizedException(err.message);
    }

    const { user: tgUser } = verified;
    const telegramId = String(tgUser.id);

    // find-or-create — Telegram ID unique
    let user = await this.prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          telegramId,
          firstName: tgUser.first_name,
          lastName: tgUser.last_name,
          username: tgUser.username,
          profilePhotoUrl: tgUser.photo_url,
          role: 'STUDENT', // yangi userlar har doim STUDENT sifatida boshlanadi
          studentProfile: { create: {} },
        },
      });
    } else {
      if (user.status === 'BLOCKED') {
        throw new UnauthorizedException(
          'Sizning akkauntingiz bloklangan. Administrator bilan bog\'laning.',
        );
      }
      // profil ma'lumotlarini yangilab boramiz (Telegramda o'zgargan bo'lishi mumkin)
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          firstName: tgUser.first_name,
          lastName: tgUser.last_name,
          username: tgUser.username,
          profilePhotoUrl: tgUser.photo_url,
          lastActiveAt: new Date(),
        },
      });
    }

    const tokens = await this.issueTokens(user.id, user.role);

    return {
      ...tokens,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName ?? undefined,
        username: user.username ?? undefined,
        role: user.role,
        profilePhotoUrl: user.profilePhotoUrl ?? undefined,
      },
    };
  }

  /**
   * Refresh token orqali yangi access token olish (rotation bilan —
   * eski refresh token darhol bekor qilinadi, yangisi qaytariladi).
   */
  async refresh(rawRefreshToken: string): Promise<AuthTokensResponse> {
    const tokenHash = this.hashToken(rawRefreshToken);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token yaroqsiz, qayta login qiling');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: stored.userId },
    });
    if (!user || user.status === 'BLOCKED') {
      throw new UnauthorizedException('Akkaunt topilmadi yoki bloklangan');
    }

    // eski tokenni bekor qilamiz (rotation — takroriy ishlatishning oldini oladi)
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.issueTokens(user.id, user.role);

    return {
      ...tokens,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName ?? undefined,
        username: user.username ?? undefined,
        role: user.role,
        profilePhotoUrl: user.profilePhotoUrl ?? undefined,
      },
    };
  }

  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawRefreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // ----------------------------------------------------------

  private async issueTokens(userId: string, role: string) {
    const payload: AccessTokenPayload = { sub: userId, role };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: ACCESS_TOKEN_TTL,
    });

    const rawRefreshToken = crypto.randomBytes(48).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date(
      Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }

  private hashToken(raw: string): string {
    // Refresh token DB'da hech qachon xom holda saqlanmaydi
    return crypto.createHash('sha256').update(raw).digest('hex');
  }
}
