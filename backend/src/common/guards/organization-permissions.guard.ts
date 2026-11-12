import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { ORGANIZATION_PERMISSIONS_KEY } from '../decorators/organization-permissions.decorator';
import { OrganizationPermission, membershipHasPermission } from '../organization-permissions';

@Injectable()
export class OrganizationPermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<OrganizationPermission[]>(ORGANIZATION_PERMISSIONS_KEY, [
      context.getHandler(), context.getClass(),
    ]);
    if (!required?.length) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) throw new ForbiddenException('Autentifikatsiyadan o‘tilmagan');
    if (user.role === 'SUPER_ADMIN' || user.realRole === 'SUPER_ADMIN') return true;
    const activeOrganizationId = user.activeOrganizationId ?? user.organizationId;
    if (!activeOrganizationId) throw new ForbiddenException('Faol tashkilot tanlanmagan');

    const membership = await this.prisma.organizationMembership.findFirst({
      where: { userId: user.id, organizationId: activeOrganizationId, status: 'ACTIVE' },
      select: { role: true, permissions: true },
    });
    if (!membership) throw new ForbiddenException('Faol tashkilot a’zoligi topilmadi');

    const denied = required.filter((permission) => !membershipHasPermission(membership.role, membership.permissions, permission));
    if (denied.length) throw new ForbiddenException('Tashkilot ruxsati yetarli emas: ' + denied.join(', '));
    return true;
  }
}
