import { effectiveRole, superAdminIds } from '../../../common/super-admin.util';
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
      include: {
        organization: { select: { status: true } },
        activeOrganizationContext: { include: { organization: { select: { status: true } } } },
      },
    });

    if (!user || user.status === 'BLOCKED' || user.deletedAt) {
      throw new UnauthorizedException('Foydalanuvchi topilmadi yoki bloklangan');
    }

    // Super admin faqat env ro'yxatidagi Telegram ID'lar (ro'yxat bo'lmasa — bazadagi rol saqlanadi)
    const saIds = superAdminIds(this.configService.get<string>('SUPER_ADMIN_TELEGRAM_IDS'));
    let role = user.role as string;
    if (saIds.length) {
      if (saIds.includes(user.telegramId)) role = 'SUPER_ADMIN';
      else if (role === 'SUPER_ADMIN') role = 'ADMIN';
    }

    // Tashkilot ichidagi rol membership'dan olinadi; User.role faqat global/legacy rol.
    let organizationId: string | null = null;
    if (role !== 'SUPER_ADMIN') {
      const selectedId = user.activeOrganizationContext?.organizationId ?? user.organizationId;
      if (selectedId) {
        const membership = await this.prisma.organizationMembership.findFirst({
          where: { userId: user.id, organizationId: selectedId, status: 'ACTIVE' },
          select: { role: true, organization: { select: { status: true } } },
        });
        if (membership && membership.organization.status === 'SUSPENDED') {
          throw new UnauthorizedException("Tashkilot faoliyati to'xtatilgan. Administratorga murojaat qiling.");
        }
        if (membership) {
          organizationId = selectedId;
          role = membership.role;
        } else if (user.activeOrganizationContext) {
          // Eskirgan yoki bekor qilingan kontekstni ishlatmaymiz.
          await this.prisma.userActiveOrganization.deleteMany({ where: { userId: user.id, organizationId: selectedId } });
        }
      }
    }

    // Super admin botdan boshqa rolni tanlagan bo'lsa — faqat super admin uchun.
    const realRole = role;
    role = effectiveRole(role, realRole === 'SUPER_ADMIN' ? user.activeRole as string | null : null);

    // Bu obyekt @CurrentUser() decorator orqali controller'larda ishlatiladi
    return {
      id: user.id,
      telegramId: user.telegramId,
      role,
      realRole,
      status: user.status,
      organizationId,
      activeOrganizationId: organizationId,
    };
  }
}
