import { ForbiddenException } from '@nestjs/common';
import { CurrentUserPayload } from './decorators/current-user.decorator';

/** Mavjud bo'lmagan tashkilot id — tashkilotsiz admin/o'qituvchi hech narsa ko'rmasligi uchun */
const NO_ORG = '__no_org__';

export const isSuperAdmin = (u: Pick<CurrentUserPayload, 'role'>) => u.role === 'SUPER_ADMIN';
export const isAdminTier = (u: Pick<CurrentUserPayload, 'role'>) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN';

/** `organizationId` ustuniga ega modellar (User, Group) uchun filtr. SUPER_ADMIN — filtrsiz. */
export function orgWhere(u: CurrentUserPayload): { organizationId?: string } {
  if (isSuperAdmin(u)) return {};
  return { organizationId: u.organizationId ?? NO_ORG };
}

/** Yaratuvchisi (User) orqali tashkilotga bog'langan modellar uchun (Test, Question, Course, Announcement). */
export function createdByOrg(u: CurrentUserPayload): { createdBy?: { organizationId: string } } {
  if (isSuperAdmin(u)) return {};
  return { createdBy: { organizationId: u.organizationId ?? NO_ORG } };
}

/** Ob'ekt shu foydalanuvchi tashkilotiga tegishlimi (SUPER_ADMIN — har doim ha). */
export function sameOrg(u: CurrentUserPayload, orgId: string | null | undefined): boolean {
  if (isSuperAdmin(u)) return true;
  return !!u.organizationId && u.organizationId === orgId;
}

export function assertSameOrg(u: CurrentUserPayload, orgId: string | null | undefined, msg = "Bu ma'lumot sizning tashkilotingizga tegishli emas") {
  if (!sameOrg(u, orgId)) throw new ForbiddenException(msg);
}
