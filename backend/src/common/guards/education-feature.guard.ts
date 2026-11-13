import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { EDUCATION_FEATURE_KEY, EducationFeatureKey } from '../decorators/education-feature.decorator';

@Injectable()
export class EducationFeatureGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride<EducationFeatureKey>(EDUCATION_FEATURE_KEY, [
      context.getHandler(), context.getClass(),
    ]);
    if (!feature) return true;
    const user = context.switchToHttp().getRequest().user;
    if (!user || user.role === 'SUPER_ADMIN' || user.realRole === 'SUPER_ADMIN') return true;
    const organizationId = user.activeOrganizationId ?? user.organizationId;
    // Global/public learning content and legacy organizations without a selected context retain current behavior.
    if (!organizationId) return true;
    const config = await this.prisma.organizationModuleConfig.findUnique({
      where: { organizationId_featureKey: { organizationId, featureKey: feature } },
      select: { enabled: true },
    });
    // Missing config is backward-compatible: only an explicit disabled switch blocks a module.
    if (config && !config.enabled) throw new ForbiddenException('Bu modul tashkilot sozlamalarida o‘chirilgan');
    return true;
  }
}
