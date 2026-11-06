/** SUPER_ADMIN_TELEGRAM_IDS="123,456" — super admin bo'la oladigan yagona Telegram ID'lar. */
export function superAdminIds(raw: string | undefined = process.env.SUPER_ADMIN_TELEGRAM_IDS): string[] {
  return (raw ?? '').split(',').map((s) => s.trim()).filter((s) => /^\d{3,20}$/.test(s));
}

/** Super admin botdan tanlashi mumkin bo'lgan "ko'rish" rollari. */
export const SWITCHABLE_ROLES = ['STUDENT', 'TEACHER', 'ADMIN', 'SUPER_ADMIN'] as const;

/**
 * Amaldagi rol: faqat haqiqiy SUPER_ADMIN uchun `activeRole` hisobga olinadi.
 * (SUPER_ADMIN_TELEGRAM_IDS dan chiqarilgan odam avtomatik o'z roliga qaytadi.)
 */
export function effectiveRole(realRole: string, activeRole?: string | null): string {
  return realRole === 'SUPER_ADMIN' && activeRole && activeRole !== 'SUPER_ADMIN' ? activeRole : realRole;
}
