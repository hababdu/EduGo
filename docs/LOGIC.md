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

## Funksiyalar do'koni
- Katalog (`FeatureCatalog`): har funksiyaning oylik narxi; narxni super admin belgilaydi («Tizim → Do'kon narxlari»).
- Maktab admini «Maktab → Do'kon» da yoqadi/o'chiradi (`OrgFeature`). Yoqilgan paytdagi narx saqlanadi (keyin katalog narxi o'zgarsa ham o'zgarmaydi).
- Oylik hisob = maktab tarifi (`monthlyPlanFee`) + yoqilgan funksiyalar narxi. Shu jami do'konda, obuna sahifasida va hisob-fakturada ko'rinadi.
- O'chirilgan funksiya keyingi hisobdan chiqadi; yaratilgan hisoblar o'zgarmaydi.
- Cheklov: `FEATURE_STORE_ENFORCE=true` bo'lsa, admin endpointlari (`trials`, `leads`, `timetable`) yoqilmagan maktabga 403 qaytaradi. Default o'chiq — mavjud maktablar uzilmaydi.
