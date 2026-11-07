/**
 * Eski yo'llar (rolni o'zgartirish, admin tayinlash/ko'chirish) `User.role/organizationId` ni o'zgartirganda
 * `OrganizationMembership` yozuvi ham mos bo'lib qolishi uchun. Xatosi asosiy amalni to'xtatmaydi.
 */
export async function syncMembership(
  prisma: any,
  userId: string,
  orgId: string | null | undefined,
  role: string,
  leftOrgId?: string | null,
): Promise<void> {
  try {
    const m = prisma?.organizationMembership;
    if (!m) return;
    if (leftOrgId && leftOrgId !== orgId) {
      await m.updateMany({ where: { userId, organizationId: leftOrgId, status: 'ACTIVE' }, data: { status: 'REMOVED', decidedAt: new Date() } });
    }
    if (!orgId || !['STUDENT', 'TEACHER', 'ADMIN'].includes(role)) return;
    await m.upsert({
      where: { userId_organizationId: { userId, organizationId: orgId } },
      create: { userId, organizationId: orgId, role, status: 'ACTIVE', decidedAt: new Date() },
      update: { role, status: 'ACTIVE', decidedAt: new Date() },
    });
  } catch {
    /* sinxronlash ixtiyoriy: backfill keyingi ishga tushishda to'ldiradi */
  }
}
