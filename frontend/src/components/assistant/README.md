# AI yordamchi — frontend

| Fayl | Vazifa |
|---|---|
| `lib/sse.ts` | SSE bloklarini o'qish (oqim yopilsa server upstream so'rovni bekor qiladi) |
| `lib/assistant-client.ts` | `streamAssistant`, `confirmAction`, `cancelAction`, `fetchPendingActions`, `safePage` |
| `components/assistant/assistant-state.ts` | Sof funksiyalar: hodisa → xabar bo'laklari, serverga tarix (`buildHistory`) |
| `hooks/useAssistant.ts` | Suhbat holati, oqim, to'xtatish, qayta urinish, tasdiq/bekor, kutayotgan kartochkalarni tiklash |
| `RichText.tsx` | Modelning markdown'ini XAVFSIZ ko'rsatadi (HTML/havola/rasm yaratilmaydi) |
| `ConfirmationCard.tsx` | Tasdiq kartochkasi: server matni, 10 daqiqalik hisoblagich, xavfli amalda ikki bosqichli tasdiq |
| `AssistantSheet.tsx` | Chat oynasi (`AIGenerateModal` qobig'ida) |
| `AssistantLauncher.tsx` | O'qituvchi/admin: suzuvchi tugma (App.tsx'da marshrutlar tashqarisida: suhbat sahifalar orasida saqlanadi) |
| `StudentChatHub.tsx` | O'quvchi: maskot chatida "Repetitor \| Murabbiy" bo'limlari (ikkinchi suzuvchi tugma yo'q) |

Tamoyillar: kartochka matnini model emas, **server** yozadi · tasdiq faqat tugma orqali (chatdagi "ha" yetmaydi) ·
`/tests/:id` sahifasida o'quvchi uchun yozish o'chiq (server ham 403 qaytaradi) · model natijani bilishi uchun bajarilgan/bekor qilingan
amallar keyingi so'rov tarixiga qisqa izoh sifatida qo'shiladi · modeldan kelgan matn hech qachon HTML sifatida qo'yilmaydi.
