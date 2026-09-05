import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, AppRole } from '../decorators/roles.decorator';

/**
 * JwtAuthGuard'dan KEYIN ishlaydi (JwtAuthGuard req.user'ni to'ldiradi,
 * bu guard esa shu user.role'ni @Roles() bilan solishtiradi).
 *
 * SUPER_ADMIN har doim hamma narsaga ruxsatga ega —
 * @Roles() qatorida alohida ko'rsatilmasa ham.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // @Roles() qo'yilmagan bo'lsa — faqat autentifikatsiya yetarli
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('Autentifikatsiyadan o\'tilmagan');
    }

    if (user.role === 'SUPER_ADMIN') {
      return true;
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException(
        `Bu amal uchun quyidagi rollardan biri kerak: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
