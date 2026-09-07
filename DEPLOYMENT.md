# DEPLOYMENT CHECKLIST (Render.com)

Bu hujjat loyihani birinchi marta deploy qilishda haqiqatda uchragan
muammolar asosida yozildi — har bir band aslida yechilgan real xatolik.

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
