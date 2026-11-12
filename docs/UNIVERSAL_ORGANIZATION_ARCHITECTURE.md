# EduGo Universal Organization & Education Model

## Maqsad

EduGo faqat maktablar uchun emas, ta'lim yoki o'quv jarayonini tashkil qiladigan turli muassasalar, markazlar, studiyalar, klublar, korxonalar, mustaqil mutaxassislar va onlayn akademiyalar uchun ishlashi kerak.

Tashkilot turi va uning o'quv jarayoni bir-biridan mustaqil bo'ladi. Tashkilot bir nechta yo'nalishga ega bo'lishi, o'z ta'lim modelini tanlashi va kerakli modullarni alohida yoqishi mumkin.

## 1. Mavjud arxitektura auditi (main branch)

Tekshirilgan asosiy fayllar:
- `backend/prisma/schema.prisma`
- `backend/src/modules/memberships/memberships.service.ts`
- `backend/src/modules/catalog/catalog.service.ts`
- `backend/src/modules/groups/groups.service.ts`
- `backend/src/common/membership-sync.ts`
- `backend/src/app.module.ts`

### Mavjud imkoniyatlar

- `Organization` modeli mavjud va katalog, reyting, filialga o'xshash profil ma'lumotlari, Telegram storage, billing hamda guruhlar bilan bog'langan.
- `OrganizationMembership` foydalanuvchining tashkilotga a'zoligini va tashkilot ichidagi rolini saqlaydi.
- O'quvchi bir nechta tashkilotga a'zo bo'lishi mumkin; `User.organizationId` hozirgi faol tashkilotni bildiruvchi eski/markaziy maydon sifatida ham ishlatiladi.
- Guruh, davomat, jadval va to'lovlar mavjud, ammo ayrim maydonlar maktab/oylik to'lov/haftalik jadval taxminlariga bog'langan.
- Katalog hozircha tashkilotlarni "maktab" sifatida nomlaydi va ko'rsatadi.

### Arxitektura xavflari

1. `Organization` izoh va API nomlarida maktabga qattiq bog'langan.
2. `User.organizationId` bilan `OrganizationMembership` parallel ravishda faol tashkilotni ifodalaydi. Bu qiymatlar nomuvofiq bo'lib qolishi mumkin.
3. Membership xizmati o'quvchi uchun ko'p tashkilotga ruxsat beradi, ammo o'qituvchi va administratorni bitta tashkilot bilan cheklaydi. Universal platformada o'qituvchi bir nechta tashkilotda ishlashi mumkin; administratorning vakolati esa tashkilot kesimida alohida belgilanadi.
4. Guruh jadvali `lessonDays + lessonStartTime + lessonEndTime` shaklida, ya'ni faqat haftalik takroriy jadvalga mos.
5. To'lov `monthlyFee` va `Payment.month` orqali oylik modelga moyil.
6. Test, davomat, baholash va sertifikatlar mavjud, lekin tashkilot konfiguratsiyasi orqali modullarni yoqish/o'chirishning yagona mexanizmi aniqlanmadi.
7. `SchoolSubject`, `TeachingAssignment`, `ScheduleSlot` kabi ayrim jadvallar maktab terminologiyasini saqlab qolgan.

## 2. Universal domen modeli

### Tashkilot va tasnif

- Organization: yuridik/tashkiliy hisob birligi.
- OrganizationType: katalogdagi tashkilot turi (masalan, maktab, universitet, til markazi, sport klubi, studiya, korxona akademiyasi). Kengaytiriladigan katalog bo'ladi; Prisma enum bilan cheklanmaydi.
- EducationDirection: tashkilot o'qitadigan yo'nalishlar (IT, til, sport, san'at, fanlar va boshqalar). Bir tashkilotda ko'p yo'nalish bo'ladi.
- OrganizationBranch: filial yoki kampus.
- OrganizationMembership: foydalanuvchi, tashkilot, rol va a'zolik holati.
- OrganizationRole/Permission: tashkilot ichidagi vakolatlar; global User.role bilan aralashtirilmaydi.

### Ta'lim konfiguratsiyasi

- EducationModel: tashkilotning o'quv jarayoni (maktab yili, kurs oqimi, modul, individual mashg'ulot, klub/uchrashuv yoki aralash model).
- OrganizationFeature: tashkilot yoqadigan modullar va ularning sozlamalari.
- AcademicPeriod: yil, semestr, chorak, kurs muddati yoki erkin davr.
- Schedule: aniq dars/uchrashuv va takrorlanish qoidalari; haftalik, sanaga bog'liq, individual yoki davriy.
- AssessmentPolicy: baholash turi, shkala va baholash talab qilinadimi.
- AttendancePolicy: davomat yoqilganmi va qaysi mashg'ulotlarda yuritiladi.
- PaymentPolicy: bepul, obuna, oylik, kurs uchun, darsma-dars yoki individual to'lov.

### O'quv tuzilmasi

Organization -> Direction -> Course/Program -> Cohort/Group -> Session/Lesson.

Bu qat'iy yagona daraxt bo'lmaydi: tashkilot konfiguratsiyasiga qarab kurs guruhga, modulga yoki individual mashg'ulotlar ketma-ketligiga ega bo'lishi mumkin. Mavjud Group modeli birdaniga o'chirilmaydi; bosqichma-bosqich universal Cohort/Group sifatida ishlatiladi.

## 3. Yo'nalishlar katalogi

Boshlang'ich katalog quyidagi yuqori darajali toifalarni qamrab oladi:

1. Maktabgacha ta'lim.
2. Umumiy o'rta ta'lim.
3. Oliy ta'lim va akademik ta'lim.
4. Kasbiy, texnik va hunar ta'limi.
5. Til o'qitish.
6. Fanlar va imtihonlarga tayyorlov.
7. IT, raqamli texnologiyalar va muhandislik.
8. San'at, musiqa, dizayn va ijod.
9. Sport va jismoniy rivojlanish.
10. Biznes, moliya va boshqaruv.
11. Haydovchilik va litsenziyaga tayyorlov.
12. Tibbiyot va sog'liq bo'yicha kasbiy ta'lim.
13. Psixologiya va shaxsiy rivojlanish.
14. Inklyuziv va maxsus ta'lim.
15. Qishloq xo'jaligi va ekologiya.
16. Turizm va xizmat ko'rsatish.
17. Diniy ta'lim.
18. Korporativ va xodimlar ta'limi.
19. Onlayn akademiyalar va masofaviy ta'lim.
20. Repetitorlik, mentorlik, klublar, seminarlar va mustaqil treninglar.
21. Boshqa / maxsus yo'nalish (tashkilot o'zi nomlaydi).

Bu katalog boshlang'ich ma'lumotlar to'plami, yopiq ro'yxat emas. Super Admin yangi yo'nalish va tashkilot turini qo'sha oladi.

## 4. Feature konfiguratsiyasi

Modullar mustaqil yoqiladi:
- learners
- instructors
- programs
- groups
- sessions
- schedule
- attendance
- materials
- assignments
- assignment_review
- tests
- exams
- grading
- certificates
- payments
- parent_portal
- messaging
- analytics
- branches
- trials
- enrollment

Modulning UI'da yashirilishi yetarli emas: backend har bir endpointda tashkilotning feature konfiguratsiyasi va foydalanuvchi vakolatini tekshirishi shart. Bog'liq modullar uchun dependency qoidalari bo'ladi (masalan, assignment_review -> assignments).

## 5. Asosiy biznes qoidalari

1. Bir foydalanuvchi bir nechta tashkilotda o'qishi va ishlashi mumkin.
2. Faol tashkilot konteksti request/session darajasida aniq tanlanadi; `User.organizationId` asta-sekin legacy sifatida chiqariladi.
3. Har bir membership tashkilot ichidagi rol va ruxsatlarni saqlaydi.
4. Administrator vakolati faqat o'ziga biriktirilgan tashkilot/filial doirasida ishlaydi.
5. Super Admin tashkilotlarni global boshqaradi.
6. Tashkilotlar o'rtasidagi ma'lumotlar aralashmaydi.
7. Tashkilotning yo'nalishi uning feature to'plamini majburan belgilamaydi; boshlang'ich shablon beradi, administrator o'zgartira oladi.
8. Eski ma'lumotlar uchun migratsiya va backward compatibility bosqichma-bosqich amalga oshiriladi.

## 6. Amalga oshirish bosqichlari

### Phase 0 — Audit va domen kelishuvi
- Prisma munosabatlari, barcha organizationId ishlatilishlari, org scope helperlari va API DTOlarini inventarizatsiya qilish.
- Membership, active organization va admin scope nomuvofiqliklarini testlar bilan aniqlash.

### Phase 1 — Organization Core
- Kengaytiriladigan OrganizationType va EducationDirection kataloglari.
- OrganizationBranch.
- Membership asosidagi faol tashkilot konteksti.
- Tashkilotga bog'liq rol va ruxsatlar.
- Legacy User.organizationId uchun vaqtinchalik moslik qatlamini saqlash.

### Phase 2 — Education Configuration
- EducationModel va OrganizationFeature.
- Schedule, grading, attendance, payment va academic period sozlamalari.
- Default templates va feature dependency tekshiruvi.

### Phase 3 — Universal Learning Structure
- Course/Program, Group/Cohort va Session/lesson bog'lanishlarini tashkilotga qat'iy scope qilish.
- Haftalik, sana asosidagi, davriy va individual jadval.
- Oylikdan tashqari to'lov qoidalari.

### Phase 4 — Web va Kotlin
- Tashkilot yaratish wizard'i.
- Dinamik tashkilot admin paneli va navigatsiya.
- API orqali keladigan bir xil feature configuration asosida mobil UI.

### Phase 5 — Regression va rollout
- Eski maktab oqimlari uchun regression testlar.
- Cross-organization access testlar.
- Prisma migration, backend/frontend build va Kotlin build.
- Bosqichma-bosqich rollout.

## 7. Birinchi implementatsiyadan oldingi xavfsizlik cheklovi

Mavjud ma'lumotlarni o'chirish yoki barcha tashkilotlarni avtomatik yangi turga aylantirish mumkin emas. Avval schema va query audit tugaydi, keyin additive migration qilinadi. Hech qanday tashkilotga global fallback yoki boshqa tashkilot ma'lumotini ko'rsatish yo'li ochilmaydi.


## 8. Auditning chuqurroq natijalari (main branch)

### Membership va faol tashkilot

- `MembershipsService.activate()` faqat STUDENT uchun ishlaydi va faol tashkilotni `User.organizationId` ga yozadi. Faol tashkilot tanlovi membership/session kontekstida mustaqil saqlanmaydi.
- `requestJoin()` o'qituvchi va adminni boshqa tashkilotga qo'shilishdan cheklaydi. Bu universal multi-organization xodim modeli bilan mos emas.
- `applyActive()` global `User.role` va `User.organizationId` ni yangilaydi. Natijada foydalanuvchining bir tashkilotdagi roli boshqasidagi roliga ta'sir qilishi mumkin.
- `syncMembership()` xatolarni yutib yuboradi. Sinxronlash muvaffaqiyatsiz bo'lsa, `User.organizationId` va membership holati farqlanib qolishi mumkin.
- `mine()` faol a'zolikni `User.organizationId` bilan solishtiradi; bu bir nechta faol membership bo'lganda faqat bittasini faol deb ko'rsatadi.

### Organization scope va guruhlar

- `org-scope.ts` dagi `orgWhere`, `sameOrg`, `resolveOrgId` hamda `createdByOrg` deyarli to'liq `CurrentUserPayload.organizationId` ga tayanadi.
- `GroupsService.createGroup()` tashkilotni `user.organizationId` dan oladi. So'rovda tanlangan membership context yo'q.
- `GroupsService.findAllForUser()` teacher guruhlarini `teacherId` bo'yicha oladi, lekin har bir guruh uchun faol organization membership yoki alohida assignment scope tekshirilmaydi.
- `GroupsService.updateGroup()` va `assignTeacher()` o'qituvchini `User.organizationId` bilan tekshiradi. O'qituvchi bir nechta tashkilotda ishlashi uchun bu membership asosida tekshirilishi kerak.
- Guruhga o'quvchi qo'shish allaqachon membershipni ham tekshiradi; bu yangi model uchun foydali mavjud poydevor.

### Katalog va domen nomlari

- Public catalog `Organization` ni `schools` deb ataydi, shaharlar hisoblagichida ham `schools` nomi ishlatiladi.
- `SchoolSubject`, `SchoolReview`, `SchoolMediaAsset` kabi modellar maktabga xos nomda, lekin ularning ayrimlari universal organization scope'da ishlatilishi mumkin.
- Katalogda tashkilot turi va yo'nalish bo'yicha filtrlash mavjud emas.
- Mavjud tashkilot yaratish/sozlash oqimi to'liq universal organization wizard sifatida ko'rinmaydi.

### Birinchi navbatda tuzatilishi kerak bo'lgan xavflar

1. Global `User.role` ni tashkilot ichidagi rol sifatida ishlatishni to'xtatish.
2. Faol organization context va authorization scope'ni yagona xizmatga yig'ish.
3. Barcha organization-scoped querylarda aynan shu kontekstni ishlatish.
4. Teacher ko'p tashkilot a'zoligi va bir tashkilotdagi bir nechta role/permission holatini test bilan qoplash.
5. Membership sync xatolarini yashirmaslik; transaction yoki qayta tiklanadigan audit mexanizmi qo'llash.
6. Maktabga oid API/UI nomlarini birdaniga o'chirmasdan, universal endpoint va aliaslar orqali bosqichma-bosqich ko'chirish.

## 9. Phase 1 uchun aniq implementatsiya tartibi

1. `OrganizationType`, `EducationDirection` va organization-direction join modellari (kengaytiriladigan DB katalogi).
2. `OrganizationFeature` konfiguratsiyasi va xavfsiz defaultlar.
3. `OrganizationContextService`: foydalanuvchi membershiplari, tanlangan organization va role/permissionni bitta joyda aniqlash.
4. Request contextni controller/service qatlamiga yetkazish; legacy JWT payload va `User.organizationId` bilan moslik.
5. Membership service'ni o'quvchi va xodimlar uchun ko'p tashkilotli holatga tayyorlash.
6. Admin uchun tashkilot/filial scope'ni alohida saqlash; Super Admin global scope bo'lib qoladi.
7. Cross-organization access testlari yozilmaguncha mavjud scope helperlarini ommaviy almashtirmaslik.



## 10. Phase 1 — Organization Core (implementation started)

Branch: `feature/organization-core`

Implemented in this branch:
- Additive Prisma models: `OrganizationType`, `EducationDirection`, `OrganizationDirection`, `OrganizationBranch`.
- Optional `Organization.typeId` relation; existing organizations are not force-classified.
- SQL migration creates the catalog and relationship tables without deleting or rewriting existing organization data.
- Initial editable catalog seed: 15 organization types and 21 education directions. The catalog is intentionally open-ended.
- Public read endpoints:
  - `GET /api/v1/education-catalog/organization-types`
  - `GET /api/v1/education-catalog/directions?category=technology`
- Super Admin classification endpoint:
  - `PATCH /api/v1/super/organizations/:id/classification`
  - Body: `{ "typeId": "...", "directionIds": ["...", "..."] }`
- Classification validates the organization, active type, and every active direction, deduplicates direction IDs, and updates type + directions in one database transaction.
- Unit tests added for catalog ordering/filtering, classification, deduplication, and invalid IDs.

Not yet implemented in this phase:
- CRUD management for organization types and directions.
- Branch management endpoints and branch-level membership/permission scopes.
- Active organization context replacing `User.organizationId`.
- Multi-organization teacher/admin membership policy changes.
- Dynamic feature configuration.

Validation status: repository connector was used to commit source files, but no local dependency install, Prisma generate/validate, backend test run, or build has been executed in this environment. Do not treat this branch as production-ready until CI/build and database migration validation pass.
