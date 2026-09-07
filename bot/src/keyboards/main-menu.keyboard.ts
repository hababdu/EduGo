import { Keyboard } from 'grammy';

export const WEBAPP_URL = process.env.WEBAPP_URL ?? 'https://example.com';

/**
 * MUHIM: "Darsni boshlash" ATAYLAB oddiy matn tugma (.text), webApp EMAS.
 *
 * Sabab — Telegram'ning rasmiy hujjati: "WebAppInitData is empty if the
 * Mini App was launched from a keyboard button or from inline mode."
 * Ya'ni pastki klaviatura (ReplyKeyboard) orqali ochilgan Mini App'da
 * initData HAR DOIM bo'sh keladi — bu bag emas, Telegram'ning ataylab
 * qilingan xatti-harakati (ehtimol, oddiy o'yin/vidjet holatlari uchun,
 * autentifikatsiya kerak bo'lmagan holatlar uchun mo'ljallangan).
 *
 * Shuning uchun haqiqiy Mini App (initData bilan) faqat quyidagilar orqali
 * ochiladi:
 *   1. Persistent Menu Button (bot.ts'da setChatMenuButton orqali o'rnatiladi)
 *   2. Inline keyboard tugmasi (handlers/menu.handler.ts'da START_LESSON
 *      bosilganda yuboriladi)
 */
export const mainMenuKeyboard = new Keyboard()
  .text('📚 Darsni boshlash')
  .row()
  .text('👤 Profilim')
  .text('🏆 Ballarim')
  .row()
  .text('📊 Natijalarim')
  .text('🏅 Yutuqlarim')
  .row()
  .text('🏆 Reyting')
  .text('📢 E\'lonlar')
  .row()
  .text('ℹ️ Yordam')
  .resized();

export const MENU_LABELS = {
  START_LESSON: '📚 Darsni boshlash',
  PROFILE: '👤 Profilim',
  SCORES: '🏆 Ballarim',
  RESULTS: '📊 Natijalarim',
  ACHIEVEMENTS: '🏅 Yutuqlarim',
  RANKING: '🏆 Reyting',
  ANNOUNCEMENTS: '📢 E\'lonlar',
  HELP: 'ℹ️ Yordam',
} as const;
