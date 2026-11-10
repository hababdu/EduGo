# EduGo navigatsiya xaritasi

Qoida: har rolda pastki menyuda **4–5 ta** bo'lim. Bir-biriga yaqin sahifalar bitta bo'lim ichida **tab** bo'lib turadi
(`components/staff/SectionTabs.tsx` — yo'l-asosli tablar; `AdminSchool` — `?tab=` bilan). Atama: «O'quvchi» (Student/Talaba emas).

## O'quvchi (`BottomNav`)
| Bo'lim | Ichida | Funksiyalar |
|---|---|---|
| Bosh sahifa `/` | — | Bugungi darslar, vazifa va testlar, ball, reyting va bildirishnomalarga havola |
| Guruhlar `/groups` | Guruh sahifasi: Umumiy · Darslar · Testlar | Guruh a'zolari, davomat, shu guruhning darslari (uy vazifasi topshirish) va testlari |
| Maktab `/schools` | Maktablar · Jadvalim · Maktablarim | Katalog, a'zolik va sinov darsi so'rovi, sharh, haftalik jadval, faol maktabni almashtirish |
| Profil `/profile` | — | Ma'lumotlar, sertifikatlar, tema, til |
Boshqa yo'llar: `/ranking`, `/notifications`, `/tests/:id` (test topshirish), `/lessons/:id`.

## O'qituvchi (`TeacherNav`)
| Bo'lim | Tablar | Funksiyalar |
|---|---|---|
| Asosiy `/teacher` | — | Bugungi darslar, topshiriqlar, tekshirilmagan ishlar |
| Guruhlar `/teacher/groups` | Guruhlar · Dars jadvali | Guruhlar, davomat, o'quvchi tafsiloti, haftalik jadval |
| Materiallar `/teacher/content/*` | — | Kurs → fan → bo'lim → mavzu, topshiriqlar |
| Testlar `/teacher/tests` | Testlar · Savollar bazasi | Test yaratish/berish/natijalar, savollar bazasi |

## Maktab admini (`AdminNav`)
| Bo'lim | Tablar | Funksiyalar |
|---|---|---|
| Boshqaruv `/admin` | — | KPI, grafiklar, tezkor havolalar |
| O'quvchilar `/admin/students` | — | Qidirish, o'quvchi tafsiloti va natijalari |
| Maktab `/admin/school` | A'zolar · Guruhlar · Sinov · Jadval · Profil | So'rovlarni qabul qilish, rollar, guruhlar, sinov darslari va qabul, fan/o'qituvchi tayinlash, dars jadvali, katalog profili, obuna hisoblari |
| To'lovlar `/admin/payments` | — | Guruhlar bo'yicha to'lovlar, qarzdorlar |
| Lidlar `/admin/leads` | — | Qiziqqanlar bilan aloqa (CRM) |
Eski yo'llar (`/admin/groups`, `/admin/trials`, `/admin/users`) mos taba yo'naltiriladi.

## Super admin (`SuperNav`)
| Bo'lim | Tablar | Funksiyalar |
|---|---|---|
| Umumiy `/super` | — | Platforma ko'rsatkichlari |
| Maktablar `/super/orgs` | Maktablar · Obunalar | Maktab yaratish/boshqarish, kanal va zahira, obuna to'lovlari |
| Foydalanuvchilar `/super/admins` | — | Barcha foydalanuvchilar, rol o'zgartirish, bloklash, adminni ko'chirish |
| Tizim `/super/ai` | AI sozlamalari · Amallar jurnali | AI provayder tanlash, audit jurnali |
Super admin maktab ichida faqat o'qiydi (`SuperReadOnlyGuard`); yozish amallari maktab adminiga tegishli.

## Ota-ona
`pages/parent/ParentPages.tsx` — farzandlar, davomat, to'lovlar (alohida oqim, bu xaritaga kirmaydi).
