import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeaturesService } from './features.service';

export const FEATURE_KEY = 'requiredFeature';
/** Controller/metod faqat maktab shu funksiyani do'kondan yoqqan bo'lsa ishlaydi (FEATURE_STORE_ENFORCE=true bo'lganda). */
export const RequireFeature = (key: string) => SetMetadata(FEATURE_KEY, key);

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly features: FeaturesService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const key = this.reflector.getAllAndOverride<string | undefined>(FEATURE_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!key || !this.features.enforced) return true;
    const user = ctx.switchToHttp().getRequest().user as { role?: string; realRole?: string; organizationId?: string | null } | undefined;
    if (!user) return true;
    if ((user.realRole ?? user.role) === 'SUPER_ADMIN') return true;
    if (await this.features.isEnabled(user.organizationId, key)) return true;
    throw new ForbiddenException({ message: "Bu funksiya maktabingiz uchun yoqilmagan. «Do'kon» bo'limidan yoqing.", feature: key });
  }
}
