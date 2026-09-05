import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';

interface JwtPayload {
  sub: string;
  role: string;
}

/**
 * Har bir himoyalangan so'rovda access token'ni tekshiradi va
 * req.user'ga to'liq foydalanuvchi obyektini biriktiradi.
 * Shu tufayli keyingi guard/controller'lar userId/role'ga
 * req.user orqali murojaat qiladi — frontenddan kelgan hech qanday
 * id'ga ishonilmaydi.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || user.status === 'BLOCKED' || user.deletedAt) {
      throw new UnauthorizedException('Foydalanuvchi topilmadi yoki bloklangan');
    }

    // Bu obyekt @CurrentUser() decorator orqali controller'larda ishlatiladi
    return {
      id: user.id,
      telegramId: user.telegramId,
      role: user.role,
      status: user.status,
    };
  }
}
