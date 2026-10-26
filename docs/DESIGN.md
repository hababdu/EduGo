# EduGo dizayn tizimi: ranglar va harakat

Ranglar `frontend/src/styles/index.css` da `--c-*` (RGB kanallari) sifatida beriladi, Tailwind'da `bg-accent`, `text-teal` kabi ishlatiladi.
Rol `<html data-role="...">` orqali o'rnatiladi (`lib/theme.ts → applyRole`). O'quvchi uchun atribut yo'q (standart).

## Asosiy rang (accent) — rol bo'yicha

| Rol | Qorong'i accent | accent-soft | accent-2 | Yorug' accent | accent-2 | Ma'no |
|---|---|---|---|---|---|---|
| O'quvchi | 255 176 32 (#FFB020) | 74 58 26 | 52 208 160 | 200 124 0 | 14 146 110 | Oltin: rag'bat, ball |
| O'qituvchi | 45 212 140 (#2DD48C) | 20 62 48 | 56 189 248 | 5 150 105 | 8 128 186 | Zumrad: diqqat, tartib |
| Admin | 129 140 248 (#818CF8) | 40 44 92 | 255 176 32 | 79 70 229 | 200 124 0 | Indigo: ishonch, nazorat |
| Super admin | 192 132 252 (#C084FC) | 56 36 84 | 56 189 248 | 126 34 206 | 8 128 186 | Binafsha: yuqori daraja |
| Ota-ona | 34 211 238 (#22D3EE) | 16 60 70 | 255 176 32 | 8 145 178 | 200 124 0 | Moviy-yashil: kuzatuvchi |

## Element → rang

| Element | Token | Izoh |
|---|---|---|
| Asosiy tugma (matni `base` rangida) | `accent` | Har ekranda bitta asosiy amal |
| Faol nav / tab / chip, fokus halqasi, input fokus | `accent` | |
| Banner nuri, fon dog'lari (aurora, blob) | `accent`, `accent-2` | accent-2 tugmada ishlatilmaydi |
| Yumshoq fon (tanlangan qator) | `accent-soft` | |
| Ball, XP, kutilmoqda | `gold` | hamma rolda bir xil |
| Muvaffaqiyat: keldi, to'ladi, baholandi | `teal` | hamma rolda bir xil |
| Xavf: qarz, kelmadi, muddati o'tgan, o'chirish | `coral` | hamma rolda bir xil |
| Ma'lumot, havola | `sky` | hamma rolda bir xil |
| Fon / kartochka / matn / ikkinchi matn / o'chiq | `base` / `surface` / `ink` / `muted` / `faint` | |

Ma'noli ranglar (gold/teal/coral/sky) rolga bog'liq emas: foydalanuvchi bir xil belgini hamma panelda bir xil tushunadi.

## Harakat

| Effekt | Sinf | Davomiylik |
|---|---|---|
| Suzuvchi fon nuri | `AppBackground`, `.blob-a/.blob-b` | 22–28 s |
| Ro'yxat birin-ketin | `.stagger` | 0,55 s, 55 ms qadam |
| Raqam sanalishi | `useCountUp` (KpiCard) | 0,8 s |
| Progress to'lishi | `ProgressBar` | 0,9 s |
| Tugma "buloq" | `scale` transition | 0,08 s bosish / 0,42 s qaytish |
| Karta ko'tarilishi | `.lift` | 0,35 s |
| Sahifa almashishi | `.page-in` | 0,38 s |
| Skelet | `.shimmer` | 1,6 s |

Faqat `transform` va `opacity`. `prefers-reduced-motion` yoqilganda hammasi o'chadi.
