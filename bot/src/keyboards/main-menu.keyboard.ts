import { Keyboard } from 'grammy';

const WEBAPP_URL = process.env.WEBAPP_URL ?? 'https://example.com';

/**
 * Spetsifikatsiyaning 2-bandidagi asosiy menyu.
 * "Darsni boshlash" — webApp() orqali to'g'ridan-to'g'ri Telegram Mini App'ni ochadi
 * (Bot API 6.1+, KeyboardButton.web_app). Qolganlari oddiy matn — ularga
 * javob backend'dan olib, shu yerda (chatda) ko'rsatiladi.
 */
export const mainMenuKeyboard = new Keyboard()
  .webApp('📚 Darsni boshlash', WEBAPP_URL)
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
