// src/keyboards/main-menu.keyboard.ts
import { Keyboard } from 'grammy';

export const WEBAPP_URL =
  process.env.WEBAPP_URL ?? 'https://example.com';

/* ============================================================
   STUDENT MENYU
   ============================================================ */
export const studentMenuKeyboard = new Keyboard()
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

/* ============================================================
   TEACHER MENYU
   ============================================================ */
export const teacherMenuKeyboard = new Keyboard()
  .text('📚 Platformani ochish')
  .row()
  .text('📊 Dashboard')
  .text('👥 Guruhlarim')
  .row()
  .text('📝 Materiallar')
  .text('🧠 Testlar')
  .row()
  .text('📈 Statistika')
  .text('🏆 Reyting')
  .row()
  .text('ℹ️ Yordam')
  .resized();

/* ============================================================
   ADMIN MENYU
   ============================================================ */
export const adminMenuKeyboard = new Keyboard()
  .text('📚 Platformani ochish')
  .row()
  .text('📊 Overview')
  .text('👥 Foydalanuvchilar')
  .row()
  .text('📁 Guruhlar')
  .text('📝 Testlar')
  .row()
  .text('📈 Statistika')
  .text('🔧 Boshqaruv')
  .row()
  .text('ℹ️ Yordam')
  .resized();

/* ============================================================
   DEFAULT
   ============================================================ */
export const defaultMenuKeyboard = new Keyboard()
  .text('📚 Darsni boshlash')
  .row()
  .text('ℹ️ Yordam')
  .resized();

/* ============================================================
   LABELS
   ============================================================ */
export const MENU_LABELS = {
  // Common
  START_LESSON: '📚 Darsni boshlash',
  OPEN_PLATFORM: '📚 Platformani ochish',
  RANKING: '🏆 Reyting',
  ANNOUNCEMENTS: '📢 E\'lonlar',
  HELP: 'ℹ️ Yordam',

  // Student
  PROFILE: '👤 Profilim',
  SCORES: '🏆 Ballarim',
  RESULTS: '📊 Natijalarim',
  ACHIEVEMENTS: '🏅 Yutuqlarim',

  // Teacher
  DASHBOARD: '📊 Dashboard',
  MY_GROUPS: '👥 Guruhlarim',
  MATERIALS: '📝 Materiallar',
  TESTS: '🧠 Testlar',
  STATS: '📈 Statistika',

  // Admin
  OVERVIEW: '📊 Overview',
  USERS: '👥 Foydalanuvchilar',
  GROUPS: '📁 Guruhlar',
  ADMIN_TESTS: '📝 Testlar',
  ADMIN_STATS: '📈 Statistika',
  ADMIN_PANEL: '🔧 Boshqaruv',
} as const;

/* ============================================================
   ROLE → KEYBOARD
   ============================================================ */
export function getMenuForRole(role: string): Keyboard {
  switch (role) {
    case 'TEACHER':
      return teacherMenuKeyboard;
    case 'ADMIN':
    case 'SUPER_ADMIN':
      return adminMenuKeyboard;
    case 'STUDENT':
      return studentMenuKeyboard;
    default:
      return defaultMenuKeyboard;
  }
}