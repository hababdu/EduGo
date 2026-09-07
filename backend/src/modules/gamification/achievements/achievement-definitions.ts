export interface AchievementDefinition {
  code: string;
  title: string;
  description: string;
  icon: string;
}

/**
 * 38-band — ACHIEVEMENT / BADGE.
 * Bu ro'yxat "seed" sifatida ishlatiladi — server ishga tushganda
 * Achievement jadvaliga upsert qilinadi (kod bo'yicha).
 */
export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  { code: 'FIRST_TEST', title: 'Birinchi test', description: 'Birinchi testingizni tugatdingiz', icon: '🏅' },
  { code: 'PERFECT_SCORE', title: 'Mukammal natija', description: 'Testni 100% bilan tugatdingiz', icon: '💯' },
  { code: 'STREAK_7', title: '7 kunlik streak', description: '7 kun ketma-ket faol bo\'ldingiz', icon: '🔥' },
  { code: 'TESTS_10', title: '10 ta test', description: '10 ta testni tugatdingiz', icon: '⚡' },
  { code: 'POINTS_1000', title: '1000 ball', description: '1000 ballga yetdingiz', icon: '🏆' },
  { code: 'TOP_STUDENT', title: 'Eng yaxshi student', description: 'Global reytingda 1-o\'rinni egallandingiz', icon: '👑' },
];
