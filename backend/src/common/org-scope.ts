import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CurrentUserPayload } from './decorators/current-user.decorator';

/** Mavjud bo'lmagan tashkilot id — tashkilotsiz admin/o'qituvchi hech narsa ko'rmasligi uchun */
const NO_ORG = '__no_org__';

export const isSuperAdmin = (u: Pick<CurrentUserPayload, 'role'> & Partial<Pick<CurrentUserPayload, 'realRole'>>) => u.role === 'SUPER_ADMIN' || u.realRole === 'SUPER_ADMIN';
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

/**
 * Kontent (Course) uchun ko'rinish: o'z tashkiloti xodimi yoki platforma (tashkilotsiz, masalan super admin)
 * yaratgan kontent. Boshqa maktab kontenti ko'rinmaydi. SUPER_ADMIN — hammasi.
 */
export function visibleCreatedBy(u: CurrentUserPayload): { createdBy?: { OR: { organizationId: string | null }[] } } {
  if (isSuperAdmin(u)) return {};
  return { createdBy: { OR: [{ organizationId: u.organizationId ?? NO_ORG }, { organizationId: null }] } };
}

/** O'zgartirish: faqat o'z tashkiloti kontenti (platforma kontentini maktab admini o'zgartira olmaydi). */
export function canEditCreatedBy(u: CurrentUserPayload, creatorOrgId: string | null | undefined): boolean {
  if (isSuperAdmin(u)) return true;
  return !!u.organizationId && u.organizationId === creatorOrgId;
}

/** Maktab admini — o'z maktabi; SUPER_ADMIN — so'ralgan maktab (majburiy). */
export function resolveOrgId(u: CurrentUserPayload, requested?: string): string {
  if (isSuperAdmin(u)) {
    if (!requested) throw new BadRequestException('Maktabni tanlang');
    return requested;
  }
  if (!u.organizationId) throw new ForbiddenException('Siz hech qaysi maktabga biriktirilmagansiz');
  if (requested && requested !== u.organizationId) throw new ForbiddenException('Bu boshqa maktab');
  return u.organizationId;
}
