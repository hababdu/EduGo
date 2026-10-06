# DEPLOYMENT CHECKLIST (Render.com)

Bu hujjat loyihani birinchi marta deploy qilishda haqiqatda uchragan
muammolar asosida yozildi — har bir band aslida yechilgan real xatolik.

> ⚠️ **ENG MUHIM QOIDA**: Barcha `npx prisma ...` buyruqlari FAQAT
> `backend/` papkasi ICHIDA ishga tushirilishi kerak (`schema.prisma`
> aynan shu yerda: `backend/prisma/schema.prisma`). Agar loyihaning tashqi
> (ildiz) papkasidan ishga tushirsangiz — "Could not find Prisma Schema"
> xatosi chiqadi. To'g'ri: `cd backend && npx prisma generate` (yoki Render
> build command'ida buyruq avtomatik `backend/` papkasida ishlaydi, chunki
> Render "Root Directory" sozlamasi shunga ko'rsatilgan bo'lishi kerak).

## 1. Uchta alohida servis

| Servis | Turi | Nega |
|---|---|---|
| `backend` | Web Service | HTTP API, doim port tinglaydi |
| `bot` | Web Service (Background Worker EMAS) | Bepul tarifda Background Worker yo'q; webhook rejimida ishlaydi |
| `frontend` | Static Site | Vite build natijasi |

## 2. Ketma-ketlik (tartib muhim)

1. **PostgreSQL database** yarating (Render → New → PostgreSQL, Free tarif)
2. **Backend**ni deploy qiling:
   - Build: `npm install && npx prisma generate && npx prisma db push && npm run build`
   - Start: `node dist/main.js`
   - Environment: `DATABASE_URL`, `JWT_SECRET`, `BOT_TOKEN`, `BOT_INTERNAL_SECRET`, `WEBAPP_URL` (frontend deploy qilingandan keyin to'ldiriladi — vaqtincha bo'sh qoldirish mumkin)
3. **Frontend**ni deploy qiling:
   - Build: `npm install && npm run build`
   - Publish directory: `dist`
   - Environment: `VITE_API_URL` = backend URL (build vaqtida "quyiladi" — keyin o'zgartirsangiz QAYTA BUILD kerak)
4. **Backend**ga qaytib, `WEBAPP_URL`ni frontend'ning haqiqiy URL'iga o'rnating, qayta deploy qiling
5. **Bot**ni deploy qiling:
   - Build: `npm install && npm run build`
   - Start: `npm run start`
   - Environment: `BOT_TOKEN` (backenddagi bilan BIR XIL), `BOT_INTERNAL_SECRET` (backenddagi bilan BIR XIL), `BACKEND_API_URL` = backend URL, `WEBAPP_URL` = frontend URL, `WEBHOOK_URL` = **botning o'z URL'i** (boshqa hech qanday servisning emas!)

## 3. Eng ko'p uchraydigan xatolar (haqiqatda sodir bo'lgan)

| Xato | Sabab | Yechim |
|---|---|---|
| `setWebhook failed (404)` | `WEBHOOK_URL` formatida xato | To'g'ri domen, `/webhook` kodning o'zi qo'shadi |
| `setWebhook failed (401)` | `BOT_TOKEN` noto'g'ri | @BotFather'dan qayta nusxalang, qo'shtirnoqsiz joylashtiring |
| Mini App "Example Domain" ochadi | Bot servisida `WEBAPP_URL` yo'q/bo'sh | Muhit o'zgaruvchisini to'g'rilab, **botni qayta deploy qiling** |
| "Bu ilova Telegram ichida ochiladi" xatosi doim chiqadi | Eski `/start` xabaridagi klaviatura tugmasi eski URL'ni "qotirib" qolgan | Botga qaytadan `/start` yozib, YANGI xabardagi tugmani bosish kerak |
| "Kirishda xatolik", backend 500 | `BOT_TOKEN` **backend**da yo'q (faqat botda bor edi) | Backend va bot — ikkalasida ham BIR XIL `BOT_TOKEN` alohida-alohida sozlanishi kerak |
| "Not allowed to request resource" (faqat Safari/Telegram Desktop'da, Chrome'da ishlaydi) | Ba'zi WebView kontekstlarida CORS origin mos kelmasligi | `main.ts`dagi origin-validator funksiyasi buni hal qiladi (bir nechta origin qabul qiladi) |
| Backend loglarida jadval topilmadi xatosi | Migratsiya ishga tushirilmagan | Build command'ga `npx prisma db push` qo'shing |
| `xpTransaction` mavjud emas (TS xatosi) | Prisma model nomi `XPTransaction` → client property `xPTransaction` (katta P) bo'lib generatsiya qilingan | Model nomi `XpTransaction`ga o'zgartirildi (schema'da tuzatilgan) |
| `orderBy: { createdAt }` xatosi (`Question`, `Test`) | Bu modellarda `createdAt` maydoni umuman yo'q edi | Ikkalasiga ham `createdAt DateTime @default(now())` qo'shildi |
| `Challenge.test` — "Type ... not assignable to never" | `Challenge` modelida `testId` bor edi, lekin haqiqiy Prisma relation (`test Test? @relation(...)`) yo'q edi | Relation qo'shildi (ikkala tomonda ham — `Test.challenges` bilan birga) |
| "Could not find Prisma Schema" | Buyruq loyiha ildizidan ishga tushirilgan, `backend/` ichidan emas | Har doim `cd backend` qilib, keyin `npx prisma ...` ishlating |

**Muhim eslatma:** Yuqoridagi Prisma bilan bog'liq 3 ta xato (`xpTransaction`,
`createdAt`, `Challenge.test`) — bu sandbox muhitida haqiqiy `prisma generate`
ishlamagani sababli oldindan aniqlanmagan edi (loyihaning "Prisma-stub"
haqidagi ogohlantirishida aytilganidek). Bular endi **schema darajasida**
tuzatilgan — boshqa shunga o'xshash xato chiqmasligi kerak, lekin agar
chiqsa, xuddi shu tarzda (schema'ni to'g'rilab, keyin kodni emas) yechiladi.

## 4. Muhim: `db push` vs `migrate deploy`

Bu loyihada **haqiqiy Prisma migration fayllari yo'q** (ishlab chiqilgan
sandbox muhitida tarmoq cheklovi tufayli `prisma migrate dev` ishlamadi).
Shuning uchun:

- **Hozircha**: `npx prisma db push` ishlatiladi (schema'ni to'g'ridan-to'g'ri sinxronlaydi)
- **Tavsiya etiladi**: birinchi imkoniyatda, to'liq internet mavjud muhitda (o'z kompyuteringizda) `npx prisma migrate dev --name init` ishga tushirib, hosil bo'lgan `prisma/migrations/` papkasini Git'ga qo'shing. Shundan keyin Build command'ni `npx prisma migrate deploy`ga o'zgartiring — bu versiyalangan, orqaga qaytarish mumkin bo'lgan migratsiya tarixini beradi (production uchun to'g'ri yondashuv).

## 5. Bepul tarif cheklovlari (bilib qo'ying)

- Render'ning bepul Web Service'lari 15 daqiqa harakatsizlikdan keyin uxlaydi
- Birinchi so'rov 30-50 soniya kechikishi mumkin (servis "uyg'onadi")
- Buni yumshatish uchun: UptimeRobot kabi xizmat orqali har 10 daqiqada
  `/` endpointga ping yuborib turish (butunlay bartaraf etmaydi, lekin kamaytiradi)
- To'liq bartaraf etish uchun: pullik tarifga o'tish ($7/oy dan)

## 6. Deploy qilgandan keyin tekshirish tartibi

1. Backend logi: `Nest application successfully started` ko'rinishi kerak
2. Bot logi: `Bot webhook rejimida ishga tushdi: <URL>` ko'rinishi kerak
3. Telegram'da botga `/start` yozing — klaviatura chiqishi kerak
4. "📚 Darsni boshlash"ni bosing — Mini App ochilishi, "Yuklanmoqda..." dan keyin dashboard ko'rinishi kerak
5. Agar xato chiqsa — backend logini oching, aynan shu payt qaysi so'rov kelganini va qanday xato qaytganini ko'ring


## 4. AI sozlamalari (backend → Environment)

| O'zgaruvchi | Izoh |
|---|---|
| `AI_PROVIDER` | `anthropic` \| `groq` \| `gemini` |
| `AI_FALLBACK_PROVIDER` | ixtiyoriy zaxira (asosiydan farqli) |
| `ANTHROPIC_API_KEY` / `GROQ_API_KEY` / `GEMINI_API_KEY` | faqat tanlangan provayder(lar) uchun |

Kalitlar FAQAT backendda saqlanadi. `VITE_*` o'zgaruvchilariga hech qachon AI kaliti qo'ymang
(frontend bundle'i hammaga ochiq). Batafsil: `backend/.env.ai.example`.

## 5. Sirlar gigienasi

- `.env`, `node_modules/`, `dist/` gitga kirmaydi (`.gitignore`). Hujjatdagi qiymatlar uchun `*.env.example` ishlating.
- Git tarixida avval commit qilingan sirlar (`backend/.env`, `backend/set-admin.js`) tarixdan o'chmaydi —
  ularni **almashtiring (rotate)**: `BOT_TOKEN` (BotFather → /revoke), `JWT_SECRET`, `BOT_INTERNAL_SECRET`,
  Postgres paroli (Render → Database → Reset), eski Groq kaliti, chatga tashlangan Google kaliti.
- `BOT_TOKEN`/`BOT_INTERNAL_SECRET` backend va bot servislarida BIR XIL bo'lishi kerak — almashtirgach ikkalasini ham yangilang.
- `JWT_SECRET` almashsa, hamma foydalanuvchi qayta kirishi kerak (bu normal).
- Bir martalik admin tayinlash: `DATABASE_URL=... node backend/set-admin.js <telegramId>`.

## Material fayllari (Telegram orqali saqlash)

O'qituvchi yuklagan fayllar (PDF, rasm, video, hujjat) Telegram'dagi **maxfiy kanalda** saqlanadi.

1. Telegram'da yangi **private kanal** yarating (nomi ixtiyoriy, masalan "EduGo fayllar").
2. Botni kanalga **administrator** qilib qo'shing (xabar yuborish huquqi bilan).
3. Kanal ID'sini oling: kanalga biror xabar yozib, uni @JsonDumpBot'ga forward qiling → `forward_from_chat.id` (`-100…` bilan boshlanadi).
4. Backend servisiga env qo'shing: `TELEGRAM_STORAGE_CHAT_ID=-100xxxxxxxxxx` (`BOT_TOKEN` allaqachon bor).

Cheklovlar (Telegram Bot API): yuklash ≤ 45 MB; ilova ichida ko'rish ≤ 20 MB. 20 MB dan katta fayl o'quvchining Telegram chatiga bot orqali yuboriladi
(o'quvchi botga kamida bir marta /start yuborgan bo'lishi kerak). Uzun videolar uchun YouTube havolasi tavsiya etiladi.
Env berilmasa, fayl yuklash "sozlanmagan" xabarini beradi, havola (URL) bilan materiallar ishlayveradi.
