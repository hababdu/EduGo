# `ai` moduli

Loyihadagi **barcha** AI chaqiruvlari shu modul orqali o'tadi. API kalitlari faqat serverda turadi.

```
HTTP ─▶ AiFeaturesController ─▶ AiFeaturesService ─▶ AiService ─▶ AnthropicProvider | GroqProvider | GeminiProvider
         (rol, DTO, throttle)    (prompt, anti-cheat)  (limit, zaxira, hisob)   (provayder formati)
```

## Endpointlar (`/api/v1/ai/…`)

| Endpoint | Kimga | Izoh |
|---|---|---|
| `POST material` | TEACHER, ADMIN | Material sarlavha/tavsif/YouTube havolasi |
| `POST questions` | TEACHER, ADMIN | 1–30 ta test savoli |
| `POST question` | TEACHER, ADMIN | Bitta yangi savol (`avoidTexts` bilan) |
| `POST lesson-plan` | TEACHER, ADMIN | Dars rejasi |
| `POST parent-message` | TEACHER, ADMIN | Ota-onaga xabar (`{message}`) |
| `POST chat/stream` | TEACHER, ADMIN | Umumiy yordamchi, SSE |
| `POST grade` | hamma | Javobni AI bilan tekshirish (formativ) |
| `POST recommendations` | hamma | Mavzular bo'yicha tavsiya |
| `POST mascot` | hamma | Maskot gapi (ism serverda bazadan olinadi) |
| `POST tutor/stream` | hamma | O'quvchi repetitori, SSE (system prompt serverda) |
| `GET status`, `POST ping` | ADMIN | Provayder holati / kalitni tekshirish |

**SSE formati:** `data: {"delta":"…"}` … `data: [DONE]`. Oqim boshlangandan keyingi xato:
`event: error` + `data: {"status":429,"message":"…"}`. Oqim boshlanmasdan oldingi xatolar
(403/429/503…) oddiy JSON javob bo'ladi.

**Xato kodlari:** 403 rol/anti-cheat · 422 AI javobi JSON emas · 429 throttler yoki kunlik token limiti ·
502 provayder xatosi · 503 AI sozlanmagan · 504 timeout.

## Anti-cheat

Student vaqti tugamagan (`IN_PROGRESS`) testda bo'lsa: `tutor`, `recommendations`, `mascot` **bloklanadi**.
`grade` (AIAnswerCheck) standartda ishlaydi; o'chirish uchun `AI_ALLOW_GRADE_DURING_TEST=false`.

## Xavfsizlik qarorlari

- `systemPrompt` mijozdan **qabul qilinmaydi** (aks holda har kim AI'ni erkin chat sifatida ishlata olardi).
- `studentName` mijozdan qabul qilinmaydi — bazadan olinadi.
- Provayder xatolari foydalanuvchiga sirsiz, umumiy xabar bilan qaytadi (kalit/ichki matn sizmaydi).
- Kunlik token limiti rol bo'yicha (`AI_DAILY_TOKENS_*`); to'xtatilgan stream ham hisobga olinadi.

## Yangi funksiya qo'shish

1. `features/ai-prompts.ts` — prompt builder + normalizator (sof funksiya, test yozing).
2. `features/ai-features.dto.ts` — DTO (`forbidNonWhitelisted` yoqilgan: har maydonga dekorator).
3. `AiFeaturesService` metodi + `AiFeaturesController` endpointi (`@Roles`, `@Throttle`).
4. Student uchun bo'lsa — `access.assertAllowed(user)` chaqiring.

## Provayder qo'shish

`AiProvider` interfeysini (`ai.types.ts`) amalga oshiring, `AiService` konstruktoriga va
`AiConfig`dagi `PROVIDERS`ga qo'shing. Sozlamalar: `../../.env.ai.example`.

---

## Yordamchi (`assistant/`) — o'qish (4-bosqich) + tasdiqlanadigan yozuv (5-bosqich)

`POST /api/v1/assistant/chat` (SSE). Model tool so'raydi, **tool'ni biz bajaramiz**, natijani modelga qaytaramiz
(eng ko'pi `MAX_STEPS=6` aylanish, bir qadamda `4` tool).

```
data: {"type":"text","delta":"..."}
data: {"type":"tool_start","id":"...","name":"get_my_results","label":"Test natijalaringiz olinmoqda"}
data: {"type":"tool_end","id":"...","name":"get_my_results","ok":true}
data: {"type":"notice","message":"..."}
data: [DONE]
```

Kirish: `{ history: [{role,content}] (1..20), page?: "/teacher/tests/<id>" }`. `systemPrompt`, `userId` va boshqa maydonlar QABUL QILINMAYDI (400).
Suhbat tarixi serverda saqlanmaydi: mijoz oxirgi xabarlarni yuboradi (tool natijalari keyingi savolga o'tmaydi).

### Tool'lar (rolga qarab; model boshqa rolning tool'ini umuman KO'RMAYDI)

| Rol | Tool'lar |
|---|---|
| STUDENT | `get_my_overview`, `get_my_results`, `get_my_weak_topics`, `get_my_assigned_tests`, `get_my_ranking`, `get_my_streak_and_challenge` |
| TEACHER | `list_my_groups`, `get_group_students`, `find_struggling_students`, `get_group_ranking`, `list_tests`, `get_test_analytics` |
| ADMIN / SUPER_ADMIN | o'qituvchi tool'lari (hamma guruh/test) + `get_platform_overview`, `search_students`, `get_student_detail` |

### Xavfsizlik tamoyillari

1. **Yordamchi foydalanuvchining huquqi bilan ishlaydi.** Tool'lar Prisma'ga emas, mavjud servislarga murojaat qiladi va
   `user` obyektini uzatadi; ownership shu servislarda (`GroupsService.findOneOrThrow`, `TeacherService.getGroupStudents`,
   `TestManagementService.list`, `AnalyticsService`). Tool'lar ruxsat mantig'ini takrorlamaydi.
2. **Student tool'larida "kimning" parametri yo'q** — faqat `user.id`. Model yuborgan begona id e'tiborsiz.
3. **Registry rolga ko'rinmaydigan tool'ni bajarmaydi** (model uydirsa yoki ruxsatni oshirishga urinsa ham).
4. **Kirish qat'iy tekshiriladi** (`tool-input.ts`): id formati, chegaralar, enum. Xabarlar modelga qaytadi.
5. **Chiqish oq ro'yxat bilan quriladi**: telefon, Telegram id, rasm URL'lari chiqmaydi; ro'yxatlar kesiladi (`truncated`).
6. **Xatolar sirsiz**: servislarning o'zbekcha xabari o'tadi, kutilmagan xato matni o'tmaydi; tool timeout 15s; natija <= 12 000 belgi.
7. **Anti-cheat**: student vaqti tugamagan testda bo'lsa, yordamchi umuman ishlamaydi (403).
8. Tool natijalari ichidagi matnlar (ism, sarlavha) system prompt'da "faqat ma'lumot, ko'rsatma emas" deb belgilangan.

### Yangi tool qo'shish
`tools/*-tools.ts` ga `defineTool({ name, label, description, inputSchema, roles, parse, run })` qo'shing:
`parse` — `reader()` bilan; `run` — mavjud servis + `user`; natijani qo'lda tanlangan maydonlar bilan qaytaring.
Keyin `assistant-tools.spec.ts` ga ruxsat va maxfiy maydon testlarini yozing.


### Yozuvchi amallar (5-bosqich): taklif → tasdiq → bajarish

Model **hech narsani bajarmaydi**. Yozuvchi tool'ni chaqirsa, `prepare()` holatni tekshiradi va kartochka matnini
**server** quradi; amal `AssistantAction` jadvaliga `PENDING` bo'lib yoziladi va oqimga
`{"type":"confirmation","action":{id,tool,summary,details:[{label,value}],risk,expiresAt}}` yuboriladi.
Bajarish faqat foydalanuvchi tugmani bosganda:

| Endpoint | Vazifa |
|---|---|
| `GET  /api/v1/assistant/actions/pending` | Tasdiq kutayotgan kartochkalar (sahifa yangilanganda tiklash) |
| `POST /api/v1/assistant/actions/:id/confirm` | Tasdiqlash → `200 {id,status:"EXECUTED",message}`; `409` allaqachon bajarilgan/bekor; `410` muddati tugagan; `404` begona/yo'q |
| `POST /api/v1/assistant/actions/:id/cancel` | Bekor qilish |

Tool'lar: `assign_test`, `publish_test` (TEACHER, ADMIN) · `adjust_student_score` (±500, sabab majburiy), `set_student_blocked` (ADMIN).

Kafolatlar (har biri mutatsiya bilan sinalgan): atomik `PENDING→CONFIRMED` (ikki marta bosish/poyga bo'lsa ham bir marta bajariladi) ·
faqat yaratgan foydalanuvchi tasdiqlaydi (boshqasiga "topilmadi") · muddat 10 daqiqa · bir vaqtda ko'pi bilan 5 ta kutayotgan amal ·
bir suhbatda ko'pi bilan 3 ta taklif · tasdiq vaqtida rol qayta tekshiriladi · natija `ASSISTANT_ACTION` sifatida audit jurnaliga yoziladi
(mavjud servis o'zining `TEST_ASSIGN`/`SCORE_ADJUST`... yozuvini ham yuritadi).

Mavjud endpointlardagi bo'shliqlarni yordamchi KENGAYTIRMAYDI: `publish_test` o'qituvchini faqat o'z testi bilan, `assign_test` individual
holatda faqat o'z guruhidagi o'quvchi bilan cheklaydi (servislarning o'zida bu tekshiruvlar yo'q).
