/** Do'kondagi boshlang'ich funksiyalar. Narxlar — boshlang'ich qiymat (so'm/oy); super admin o'zgartiradi. */
export interface FeatureDef { key: string; name: string; description: string; icon: string; price: number; sortOrder: number }

export const DEFAULT_FEATURES: FeatureDef[] = [
  { key: 'timetable', name: 'Dars jadvali', description: "O'qituvchi tayinlash, haftalik jadval va vaqt to'qnashuvi tekshiruvi", icon: '🗓️', price: 30_000, sortOrder: 10 },
  { key: 'trials', name: 'Sinov darslari', description: "Ota-ona va o'quvchi arizalari, tasdiqlash, maktabga qabul qilish", icon: '🎓', price: 40_000, sortOrder: 20 },
  { key: 'leads', name: 'Lidlar (CRM)', description: "Potensial o'quvchilar bilan ishlash va aloqa eslatmalari", icon: '📇', price: 40_000, sortOrder: 30 },
  { key: 'tests', name: 'Testlar va savollar bazasi', description: "Savollar bazasi, testlar, avtomatik tekshirish va natijalar", icon: '📝', price: 50_000, sortOrder: 40 },
  { key: 'ai_assistant', name: 'AI yordamchi', description: "Admin va o'qituvchi uchun AI yordamchi: tahlil, hisobot, topshiriq tayyorlash", icon: '🤖', price: 90_000, sortOrder: 50 },
  { key: 'parent_portal', name: 'Ota-ona paneli', description: "Ota-onalar farzand natijalari, to'lovlari va jadvalini ko'radi", icon: '👨‍👩‍👧', price: 30_000, sortOrder: 60 },
  { key: 'school_media', name: 'Maktab media xotirasi', description: "Fayl va rasmlar maktabning shaxsiy Telegram kanalida saqlanadi", icon: '🗂️', price: 25_000, sortOrder: 70 },
];
