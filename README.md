# PHASE 3 — AUTHENTICATION MODULE

## Nima yaratildi

| Fayl | Vazifasi |
|---|---|
| `utils/telegram-verify.util.ts` | Telegram `initData`'ni HMAC-SHA256 orqali tekshiradi (soxtalashtirib bo'lmaydi) |
| `auth.service.ts` | Find-or-create user, JWT access/refresh token chiqarish, rotation |
| `auth.controller.ts` | `POST /api/v1/auth/telegram`, `/refresh`, `/logout` |
| `strategies/jwt.strategy.ts` | Har bir himoyalangan so'rovda tokenni tekshiradi |
| `guards/jwt-auth.guard.ts` | Global guard — `@Public()` bo'lmagan hamma narsani yopadi |
| `common/decorators/current-user.decorator.ts` | Controller'larda xavfsiz `req.user`ga kirish |
| `prisma/prisma.service.ts` | Global Prisma client |
| schema.prisma'ga qo'shildi | `RefreshToken` modeli (hash holida saqlanadi) |

## O'rnatish

```bash
cd backend
npm install @nestjs/jwt @nestjs/passport @nestjs/config passport passport-jwt class-validator class-transformer
npm install -D @types/passport-jwt
npx prisma generate
npx prisma migrate dev --name add_refresh_token
```

`.env` faylini `.env.example` asosida to'ldiring (`BOT_TOKEN`ni @BotFather'dan oling, `JWT_SECRET`ni tasodifiy uzun satr qiling).

`app.module.example.ts` dagi tuzilmani haqiqiy `app.module.ts`ga ko'chiring.

## Frontend tomonida (Telegram Mini App)

```ts
// Mini App yuklanganda:
const initData = window.Telegram.WebApp.initData;

const res = await fetch(`${API_URL}/api/v1/auth/telegram`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ initData }),
});

const { accessToken, refreshToken, user } = await res.json();
// accessToken → memory'da saqlanadi (Zustand store)
// refreshToken → httpOnly cookie orqali yoki secure storage'da
```

Keyingi so'rovlarda:

```ts
fetch(`${API_URL}/api/v1/...`, {
  headers: { Authorization: `Bearer ${accessToken}` },
});
```

Access token muddati tugasa (`401` qaytsa), avtomatik `/api/v1/auth/refresh`ga
murojaat qilib yangi juftlikni oling — bu logikani frontendda axios interceptor
yoki fetch wrapper darajasida qilish tavsiya etiladi (Phase 6da yozamiz).

## Xavfsizlik nuqtalari (nega shunday qilindi)

1. **initData hech qachon frontendda parse qilinib backendga "ishonch bilan" yuborilmaydi** — backend uni HMAC orqali qayta hisoblab tekshiradi. Aks holda istalgan kishi o'zini boshqa Telegram foydalanuvchisi qilib ko'rsatishi mumkin edi.
2. **Refresh token DB'da xom holda saqlanmaydi**, faqat SHA-256 hash'i — DB oqib ketsa ham tokenlar ishlatib bo'lmaydi.
3. **Refresh rotation**: har safar refresh qilinganda eski token bekor qilinadi — o'g'irlangan eski token qayta ishlatilsa aniqlanadi.
4. **Global guard** — yangi endpoint yozganda uni himoyalashni "unutib qo'yish" mumkin emas, chunki default holda hammasi yopiq, faqat ataylab `@Public()` qilinganlar ochiq.
5. **Blocked user tekshiruvi** ham login'da, ham refresh'da, ham har bir so'rovda (`JwtStrategy.validate`) qayta tekshiriladi.

## Keyingi qadam

**Phase 4 — User roles va RBAC guards**: `@Roles('ADMIN', 'TEACHER')` decorator, `RolesGuard`, va Teacher/Admin uchun resource-ownership tekshiruvi (masalan, teacher faqat o'z guruhiga tegishli narsalarni ko'ra olishi).

---

# PHASE 4 — USER ROLES VA RBAC

## Nima yaratildi

| Fayl | Vazifasi |
|---|---|
| `common/decorators/roles.decorator.ts` | `@Roles('ADMIN', 'TEACHER')` — endpointga rol talabini belgilaydi |
| `common/guards/roles.guard.ts` | Global guard — `req.user.role`ni `@Roles()` bilan solishtiradi |
| `modules/groups/*` | To'liq namuna: RBAC + resource-ownership birga ishlashi |
| `modules/users/*` | "Faqat o'zini ko'rish" qoidasi (80-band, 1-2-qoida) amaliyoti |
| `app.module.ts` | `RolesGuard` `JwtAuthGuard`dan KEYIN global qo'shildi |

## Ikki xil tekshiruv — farqini tushunish muhim

1. **Role-level (RolesGuard)** — "bu ENDPOINTni umuman kim chaqira oladi?"
   `@Roles('TEACHER', 'ADMIN')` — STUDENT bu endpointga umuman yaqinlasha olmaydi,
   controller kodi ishga tushmasdanoq 403 qaytadi.

2. **Resource-ownership (service ichida)** — "bu KONKRET yozuvni shu user ko'ra oladimi?"
   Masalan ikkita TEACHER ham `@Roles('TEACHER')`dan o'tadi, lekin Teacher-A
   Teacher-B'ning guruhini ko'rishga urinsa, `GroupsService.assertCanAccess`
   uni to'xtatadi. Bu tekshiruv rol darajasida emas, har bir yozuv darajasida
   bo'lgani uchun guard emas, service metodida amalga oshiriladi.

**Ikkalasi ham SHART** — faqat RolesGuard yetarli emas (chunki bir xil roldagi
ikki kishi bir-birining ma'lumotini ko'rmasligi kerak), faqat ownership tekshiruvi
ham yetarli emas (chunki u har bir controllerda qo'lda yozilishi kerak bo'lgani
uchun unutilib qolishi mumkin — shuning uchun `@Roles()` birinchi qatlam bo'lib,
keraksiz so'rovlarni servicega yetmasdan kesib tashlaydi).

## GroupsService.findAllForUser — muhim naqsh

Ro'yxat (list) endpointlarida ownershipni **query darajasida** filtrlash kerak,
"hammasini olib keyin filtrlash" emas:

```ts
// TO'G'RI — DB o'zi faqat tegishlilarini qaytaradi
this.prisma.group.findMany({ where: { teacherId: user.id } });

// NOTO'G'RI — barcha guruhlarni xotiraga oladi, keyin filtrlaydi
// (performance muammosi + xato qilish ehtimoli yuqori)
const all = await this.prisma.group.findMany();
return all.filter(g => g.teacherId === user.id);
```

## Tekshirildi

`npx tsc --noEmit` — xatosiz o'tdi (Prisma Client generatsiyasisiz ham).

## Keyingi qadam

**Phase 5 — Telegram bot**: asosiy menyu (📚 Darsni boshlash, 👤 Profilim va h.k.),
WebApp tugmasi orqali frontendni ochish, `BOT_TOKEN` bilan webhook/polling sozlash.

---

# PHASE 5 — TELEGRAM BOT

## Nima yaratildi

**Backend tomonida** (`backend/src/modules/internal/`):

| Fayl | Vazifasi |
|---|---|
| `internal.controller.ts` | Bot uchun maxsus endpointlar: `/api/v1/internal/...` |
| `internal.service.ts` | Profil, ball, natijalar, reyting, e'lonlar — telegramId orqali |
| `guards/internal-auth.guard.ts` | `x-internal-secret` header orqali himoya (JWT emas — bot uchun alohida oqim) |

**Bot tomonida** (`bot/`) — yangi, alohida kichik loyiha:

| Fayl | Vazifasi |
|---|---|
| `src/bot.ts` | Entry point, `/start`, polling |
| `src/keyboards/main-menu.keyboard.ts` | Spetsifikatsiyadagi 8 ta menyu tugmasi |
| `src/handlers/menu.handler.ts` | Har bir tugma uchun backend'dan ma'lumot olib ko'rsatish |
| `src/services/api-client.ts` | `/api/v1/internal/*`ga so'rov yuboruvchi client |

## Nega bot va backend ORASIDA alohida auth kanali (BOT_INTERNAL_SECRET)?

Foydalanuvchi WebApp orqali kirganda `initData` bo'ladi (Phase 3). Lekin bot
oddiy chat xabarlarini qayta ishlaganda `initData` YO'Q — Telegram bunday
ma'lumotni oddiy xabarlar bilan bermaydi. Shuning uchun ikkita alohida yo'l:

- **User → Frontend → Backend**: `initData` orqali (JWT beriladi)
- **Bot → Backend**: sirli kalit orqali (`x-internal-secret`), bot esa
  `ctx.from.id` (Telegram bergan, soxtalashtirib bo'lmaydigan) orqali
  qaysi student ekanini backendga aytadi

**Muhim:** `/api/v1/internal/*` endpointlar HECH QACHON internetga to'g'ridan-to'g'ri
ochiq bo'lmasligi kerak — production'da bularni faqat bot serveridan kelgan
so'rovlarga (masalan, VPC/firewall orqali) cheklash tavsiya etiladi. `BOT_INTERNAL_SECRET`
yolg'iz o'zi yetarli himoya emas, qo'shimcha tarmoq darajasidagi cheklov ham qo'ying.

## Ishga tushirish

```bash
cd bot
npm install
cp .env.example .env
# BOT_TOKEN — @BotFather'dan
# BOT_INTERNAL_SECRET — backend/.env dagi bilan BIR XIL bo'lishi shart
# WEBAPP_URL — frontend deploy qilingandan keyin to'ldiriladi (Phase 6/9)
npm run start:dev
```

Backend ham parallel ishlab turishi kerak (`cd backend && npm run start:dev`).

## "Darsni boshlash" qanday ishlaydi

`Keyboard.webApp('📚 Darsni boshlash', WEBAPP_URL)` — bu tugma bosilganda
Telegram **Mini App**ni to'g'ridan-to'g'ri ochadi (alohida browser emas,
Telegram ichida). Frontend yuklanganda `window.Telegram.WebApp.initData`
mavjud bo'ladi — bu Phase 3'da yozilgan `/api/v1/auth/telegram`ga yuboriladi.

## Tekshirildi

- `backend`: `npx tsc --noEmit` — xatosiz
- `bot`: `npm install` + `npx tsc --noEmit` — xatosiz

## Keyingi qadam

**Phase 6 — Student Dashboard**: React frontend skeleti, Telegram WebApp
autentifikatsiya oqimini frontendda ulash, asosiy dashboard (ball, XP, level,
progress) UI'si va backend'dagi mos API endpointlar.

---

# PHASE 6 — STUDENT DASHBOARD

## Dizayn yo'nalishi

- **Fon:** chuqur indigo `#14162B` (sof qora emas)
- **Aksentlar:** oltin `#FFB020` — ball/hero uchun, teal `#34D0A0` — progress uchun
- **Shrift:** sarlavha/katta raqamlar uchun **Fraunces** (serif), UI matni uchun **Manrope**
- **Layout:** mobile-first, bitta ustun. Ball — karta ichida emas, sahifaning o'zi hero. Faqat "Davom eting" haqiqiy karta; fanlar ro'yxati va yutuqlar chegarasiz elementlar sifatida.

## Nima yaratildi

**Backend** (`backend/src/modules/dashboard/`):
- `GET /api/v1/dashboard/me` — bitta chaqiruvda: ball, XP, level, reyting o'rni, streak, fanlar bo'yicha progress, "davom eting" tavsiyasi, so'nggi natijalar, yutuqlar.

**Frontend** (`frontend/`) — yangi to'liq Vite + React + TS loyihasi:

| Fayl | Vazifasi |
|---|---|
| `lib/telegram.ts` | Telegram WebApp SDK wrapper (`initData`, `expand`, `haptic`) |
| `lib/api-client.ts` | Fetch wrapper — 401 kelsa avtomatik token refresh |
| `store/auth.store.ts` | Zustand — access/refresh token va user xotirada (localStorage'da EMAS) |
| `hooks/useAuth.ts` | Mini App ochilganda avtomatik Telegram login |
| `hooks/useDashboard.ts` | React Query orqali dashboard ma'lumotini olish |
| `pages/StudentDashboard.tsx` | Asosiy sahifa — loading/error/empty holatlar bilan |
| `components/dashboard/*` | ScoreHero, StatChips, ContinueLearningCard, SubjectScoreList, AchievementsRow |
| `components/layout/BottomNav.tsx` | 5 ta asosiy bo'lim |

## Nega access token localStorage'da emas?

XSS orqali o'g'irlanish xavfini kamaytirish uchun token faqat Zustand (xotira,
sahifa yangilansa yo'qoladi) da saqlanadi. Bu tufayli har safar Mini App qayta
ochilganda `useAuth` avtomatik qayta login qiladi — foydalanuvchi buni sezmaydi
ham, chunki Telegram `initData` doim mavjud.

## Ishga tushirish

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Telegram Mini App sifatida sinash uchun `ngrok`/`cloudflared` orqali tunnel oching
va shu URL'ni @BotFather'da bot uchun Web App URL sifatida, hamda `bot/.env`
ichidagi `WEBAPP_URL`ga qo'ying.

## Tekshirildi

- `npx tsc -b --noEmit` — xatosiz
- `npm run build` — muvaffaqiyatli production build (104 modul, ~70KB gzip)

## Keyingi qadam

**Phase 7 — Admin Dashboard**: Overview statistikasi, student/test/course
boshqaruvi uchun asosiy sahifalar, va shu bilan bog'liq backend endpointlar
(`/api/v1/admin/...`).

---

# PHASE 7 — ADMIN DASHBOARD

## Nima yaratildi

**Backend** (`backend/src/modules/admin/`):

| Fayl | Vazifasi |
|---|---|
| `overview/*` | `GET /api/v1/admin/overview` — 53-band statistikasi (studentlar, o'qituvchilar, testlar, 7 kunlik faollik grafigi) |
| `students/*` | `GET/PATCH /api/v1/admin/students` — qidiruv, filter, pagination, bloklash, **qo'lda ball berish** |
| `audit/audit.service.ts` | Har bir admin amalini `AdminActionLog`ga yozadigan markaziy servis |

**Frontend** (`frontend/src/pages/admin/`):

| Fayl | Vazifasi |
|---|---|
| `AdminOverview.tsx` | Statistika: hero raqam (jami studentlar) + ikkilamchi ko'rsatkichlar + kunlik faollik chart |
| `AdminStudents.tsx` | Qidiruv/filter/pagination bilan ro'yxat |
| `AdminStudentDetail.tsx` | Bloklash/blokdan chiqarish, qo'lda ball berish formasi, so'nggi natijalar |

`App.tsx`ga rol asosida yo'naltirish qo'shildi: `user.role === 'ADMIN'` bo'lsa
avtomatik admin interfeysi ko'rsatiladi, aks holda oddiy student dashboard.

## 56-band talabi qanday bajarildi (Manual Score Management)

> "Lekin har bir o'zgarish: ScoreTransaction + AdminActionLog ga yozilsin."

`AdminStudentsService.adjustScore()` ikkalasini ham **bitta DB transaction**da
bajaradi (`prisma.$transaction`) — yoki ikkalasi ham saqlanadi, yoki hech biri
(masalan server o'chib qolsa, yarim yozilgan holat bo'lmaydi). Bundan tashqari:

- `amount = 0` rad etiladi (mantiqsiz audit yozuvi yaratmaslik uchun)
- `reason` maydoni **majburiy** — sabab yozilmasa forma submit bo'lmaydi
- Frontendda xatolik interfeys ovozida ko'rsatiladi ("Sabab ko'rsatilishi shart", tushuntirish bilan, uzr so'ramasdan)

## Bilinadigan cheklov (keyingi fazada hal qilinadi)

Hozircha **barcha** foydalanuvchilar (admin ham) faqat Telegram orqali kiradi
(Phase 3dagi `initData` oqimi). Amalda adminlar odatda oddiy brauzerdan
kirishni xohlashadi. Bu — **Phase 16 (Security hardening)** yoki alohida
kichik bosqichda qo'shiladigan email/parol asosidagi admin login bilan
to'ldiriladi; hozirgi arxitektura buni to'sqinlik qilmaydi (`AuthModule`ga
yangi strategiya qo'shish kifoya).

## Tekshirildi

- Backend: `npx tsc --noEmit` — xatosiz
- Frontend: `npx tsc -b --noEmit` + `npm run build` — xatosiz, 109 modul

## Keyingi qadam

**Phase 8 — Teacher Dashboard**: Teacher faqat o'ziga biriktirilgan
guruh/fan/testlar bilan ishlaydigan interfeys (44-band), test yaratish va
natijalarni ko'rish sahifalari.

---

# ⚠️ MUHIM: PRISMA TYPE-CHECKING HAQIDA OGOHLANTIRISH

Ushbu loyiha shu chatning sandbox muhitida yaratildi, va bu muhit
`binaries.prisma.sh` domenига tarmoq orqali chiqa olmaydi (faqat npmjs.org
kabi cheklangan domenlarga ruxsat bor). Shu sabab **`npx prisma generate`
bu yerda hech qachon haqiqiy tip fayllarini yarata olmadi** — Prisma buning
o'rniga "stub" versiyasini (`PrismaClient = any`) qoldirdi.

**Bu nimani anglatadi:** Oldingi fazalarda aytilgan "`npx tsc --noEmit` —
xatosiz" degan tekshiruvlar **Prisma so'rovlarining o'zini (model/maydon
nomlari to'g'riligini) haqiqatda tekshirmagan** — chunki `any` tipida hech
qanday xato ko'rsatilmaydi. Faqat oddiy TypeScript kodi (controller'lar,
DTO'lar, servis mantiqi) haqiqiy tekshiruvdan o'tgan.

**Sizga zarur qadam:** Loyihani kompyuteringizga tushirgandan keyin (to'liq
internet bilan):

```bash
cd backend
npx prisma generate
npx tsc --noEmit
```

Agar shu yerda xatolar chiqsa (masalan, men yozgan kodda maydon nomida
kichik xato bo'lsa) — **bu normal holat**, menga xato matnini yuboring,
darhol tuzataman. Bu ehtimoli past (men schema.prisma'ga qarab yozganman),
lekin sizga rostini aytishim kerak edi.

---

# PHASE 8 — TEACHER DASHBOARD

## Nima yaratildi

**Backend** (`backend/src/modules/teacher/`):

| Fayl | Vazifasi |
|---|---|
| `teacher.service.ts` | `getOverview()` — teacherning guruhlari, studentlari, biriktirilgan testlari soni. `getGroupStudents()` — guruhdagi studentlar va ularning ball/progress statistikasi |
| `teacher.controller.ts` | `GET /api/v1/teacher/overview`, `GET /api/v1/teacher/groups/:groupId/students` |

**Muhim:** `getGroupStudents()` ichida `GroupsService.findOneOrThrow()` chaqiriladi
(Phase 4'da yozilgan) — shu orqali 44-band talabi ("Teacher faqat o'ziga
tegishli resurslarga kira olsin") avtomatik bajariladi: agar Teacher-A
Teacher-B'ning guruh ID'sini so'rasa, bu yerda 403 qaytadi.

**Frontend** (`frontend/src/pages/teacher/`):

| Fayl | Vazifasi |
|---|---|
| `TeacherOverview.tsx` | Guruhlar/studentlar/testlar soni + guruhlar ro'yxati + so'nggi biriktirishlar |
| `TeacherGroupDetail.tsx` | Tanlangan guruhdagi studentlar, ularning ball va o'rtacha natijasi |

`App.tsx`ga `role === 'TEACHER'` bo'lsa avtomatik Teacher interfeysiga
yo'naltirish qo'shildi (Admin/Teacher/Student — uch xil ko'rinish, bitta kod bazasi).

## Diqqat: Test yaratish hali yo'q

Spetsifikatsiyaning 44-bandida "test yaratish, savol qo'shish" ham bor —
bu ataylab **keyingi fazaga** (Phase 9-10: Course/Content + Test Engine)
qoldirildi, chunki bu Teacher'ga xos emas, butun Question Bank/Test
tizimining bir qismi va Admin ham xuddi shu componentlardan foydalanadi.
Hozircha Teacher Dashboard faqat "kuzatish" (guruh/student holatini
ko'rish) funksiyasini bajaradi.

## Tekshirildi

- Backend: `npx tsc --noEmit` — xatosiz (yuqoridagi ogohlantirishni hisobga oling)
- Frontend: `npx tsc -b --noEmit` + `npm run build` — xatosiz, 113 modul

## Keyingi qadam

**Phase 9-10 — Course/Content System + Test Engine**: Bu — loyihaning eng
katta va murakkab qismi. Course→Subject→Section→Topic→Lesson ierarxiyasi,
Question Bank, va server-authoritative Test Engine (timer, random questions,
auto-save, anti-cheat) — Phase 1 arxitektura hujjatida batafsil yozilgan mantiq.

---

# PHASE 9-10 — CONTENT SYSTEM + TEST ENGINE

## Nima yaratildi

**Content System** (`backend/src/modules/content/`):

| Modul | Bandlar | Vazifasi |
|---|---|---|
| `courses/` | 7, 86 | Course CRUD, faqat PUBLISHED studentga ko'rinadi |
| `subjects/` | 8 | Subject CRUD, courseId bo'yicha filtrlash |
| `sections/` (`sections.all.ts`) | 9 | Section CRUD |
| `topics/` (`topics.all.ts`) | 10, **14** | Topic CRUD + **SEQUENTIAL LEARNING** |
| `lessons/` (`lessons.all.ts`) | 11, 12 | Lesson + Video progress (0/25/50/75/100) |

**14-band (Sequential Learning)** qanday ishlaydi: `TopicsService.withLockStatus()`
har bir topic uchun oldingi topic'ning testidan `passed=true` bilan o'tilganmi
tekshiradi. Agar yo'q bo'lsa va `sequentialLocked=true` bo'lsa — topic
`isLocked: true` bilan qaytadi, va uni ochishga urinilsa **backend**
`ForbiddenException` qaytaradi (frontendda tugmani "kulrang qilish" kifoya
emas — bu faqat vizual, haqiqiy tekshiruv shu yerda).

**Question Bank** (`backend/src/modules/questions/`):
- `POST /api/v1/questions` — SINGLE_CHOICE uchun aniq 1ta, boshqalari uchun
  kamida 1ta to'g'ri javob majburiyligi tekshiriladi
- Studentga ko'rinadigan `list()` javobida `isCorrect` **hech qachon** qaytarilmaydi
  (Prisma `select` orqali butunlay chiqarib tashlangan — "frontendda yashirish" emas)

## TEST ENGINE — loyihaning yuragi (`backend/src/modules/tests/session/`)

Bu qism 15–27 va 62-bandlarning **barchasini** amalga oshiradi. Eng muhim fayl:
`test-session.service.ts`. Nima uchun har bir qoida aynan shunday yozilgani:

| Qoida | Qanday bajarilgan |
|---|---|
| **16-band**: timer serverda | `TestSession.startedAt` serverda `now()` bilan yoziladi; `computeRemainingSeconds()` doim `Date.now() - startedAt` orqali qayta hisoblanadi — frontend hech qachon o'z hisobiga ishonilmaydi |
| **17-band**: vaqt tugasa avto-submit | `getSession()` va `start()` ichida `remaining <= 0` bo'lsa avtomatik `gradeAndFinish(isAutoSubmit=true)` chaqiriladi |
| **18-band**: random questions | `start()`da `test.randomQuestions` bo'lsa `pickRandom()` orqali tanlanadi va **`TestSession.selectedQuestionIds`ga yoziladi** — shu orqali "davom ettirish"da bir xil savollar qoladi |
| **19-band**: random answer order | `seededShuffle()` — sessiya seed + questionId asosida **deterministik** aralashtirish (har safar bir xil tartib, lekin har bir student uchun boshqacha) |
| **23-band**: auto-save | `saveAnswer()` — har javobda darhol `TestAnswer.upsert()` |
| **24-band**: davom ettirish | `start()` mavjud `IN_PROGRESS` sessiyani topsa, o'shani qaytaradi (yangisini yaratmaydi) |
| **25-band**: bir marta ishlash | `TestAttempt` va `TestSession` jadvallaridagi `@@unique([testId, studentId])` — DB darajasidagi eng kuchli himoya |
| **26-band**: admin qayta ochish | `TestManagementService.reopenForStudent()` — FAQAT shu (testId, studentId), eski sessiya o'chiriladi, `AdminActionLog`ga yoziladi |
| **28-band**: ball backend hisoblaydi | `gradeAndFinish()` — to'g'ri javoblar to'plami bilan solishtirish, frontend hech narsa hisoblamaydi |
| **62-band**: anti-cheat | Yuqoridagilarning barchasi + `isCorrect` studentga hech qachon yuborilmaydi (`buildSessionResponse` ichida `select` bilan chiqarib tashlangan) |

## Frontend: Test topshirish sahifasi (`frontend/src/pages/tests/TestTaking.tsx`)

- `useTestSession` hook — lokal countdown FAQAT ko'rsatish uchun; har 20 soniyada
  serverdan haqiqiy vaqt qayta so'raladi (`GET /session`) — agar farq katta bo'lsa
  (masalan foydalanuvchi noutbukni yopib qo'ygan bo'lsa), server qiymati g'olib chiqadi
- Har javob tanlanganda darhol `POST /answer` (optimistic UI + background save)
- Vaqt tugaganda (`remaining === 0`) avtomatik `submit()` chaqiriladi
- Natija ekrani: ball, foiz, o'tdi/o'tmadi, va agar avtomatik yakunlangan bo'lsa shu haqda alohida xabar

## Bilinadigan cheklovlar (keyingi fazalarda to'ldiriladi)

- **TEXT_ANSWER turi** hozircha avtomatik baholanmaydi (`isCorrect: null`, 0 ball) —
  qo'lda tekshirish navbati kelajakda qo'shiladi
- **Real-time WebSocket eventlari** (`SCORE_UPDATED`, `RANKING_UPDATED`) bu fazada
  ULANMAGAN — `gradeAndFinish()` ScoreTransaction yaratadi, lekin ranking'ga
  real-time push qilinmaydi. Bu — **Phase 12 (Real-time ranking)**ning ishi
- Muddati o'tgan, lekin hech kim tegmagan sessiyalarni yakunlaydigan **cron job**
  hali yo'q — hozircha "lazy" tekshiruv (student keyingi so'rov yuborganda
  aniqlanadi). Cron — Phase 12/15 (jobs) qismida qo'shiladi

## Tekshirildi

- Backend: `npx tsc --noEmit` — xatosiz (yuqoridagi Prisma-stub ogohlantirishini eslang)
- Frontend: `npx tsc -b --noEmit` + `npm run build` — xatosiz, 115 modul

## Keyingi qadam

**Phase 11-12 — Score System + Real-time Ranking**: `ScoreTransaction`
ledgeridan reyting hisoblash, WebSocket gateway (`SCORE_UPDATED`,
`RANKING_UPDATED` eventlari), va frontendda real-time reyting sahifasi.
