# EduGo — domen mantig'i (qisqa xarita)

## Yagona manba: a'zolik (OrganizationMembership)
- Foydalanuvchi maktabga **a'zolik** orqali bog'lanadi: status PENDING → ACTIVE (yoki REJECTED / REMOVED), roli maktab bo'yicha.
- `User.organizationId` = "joriy maktab". Faqat o'quvchi bir nechta maktabga a'zo bo'lishi mumkin (`activate` joriy maktabni almashtiradi). O'qituvchi/admin — bitta maktab.
- Eski joylarda (guruhga qo'shish, super-admin rol o'zgartirish) `syncMembership` a'zolikni avtomatik to'g'rilaydi.

## Oqim
1. **Qo'shilish**: o'quvchi/o'qituvchi so'rov yuboradi → maktab adminlariga xabar → admin tasdiqlaydi/rad etadi → foydalanuvchiga xabar.
2. **Sinov darsi**: ariza (o'quvchi yoki ota-ona) → admin tasdiqlaydi (vaqt) → keldi → qabul qilish (a'zolik + guruh, sig'im tekshiriladi). Har bosqichda arizachiga xabar.
3. **Guruh → jadval**: o'qituvchi biriktirish → dars slotlari (to'qnashuv tekshiriladi) → o'quvchi/o'qituvchi "Jadval".
4. **To'lov**: maktab hisobi (OrgInvoice) → imzolangan webhook → PAID.

## Xabarlar
Hammasi `NotificationsService.notify` orqali (ilova + Telegram). Xabar xatosi asosiy amalni to'xtatmaydi.

## Ruxsatlar
JwtAuthGuard → RolesGuard (SUPER_ADMIN har doim) → SuperReadOnlyGuard (super admin `/admin/*` ga yozmaydi) → ParentScopeGuard (ota-ona uchun oq ro'yxat). Maktab doirasi: `resolveOrgId`.
