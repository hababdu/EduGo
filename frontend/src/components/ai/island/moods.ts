/* Robot hissiyotlari: har biri ko'z shakli, nur rangi va belgiga ega.
   Eski MascotMood qiymatlari (serverdan keladigan 'happy' | 'sad' | 'idle' ham) shu yerga o'tkaziladi. */

export type EyeShape =
  | 'pill' | 'wide' | 'dot' | 'line' | 'happy' | 'closed'
  | 'spiral' | 'heart' | 'star' | 'tired' | 'wink';

export type IslandMood =
  | 'idle' | 'working' | 'thinking' | 'searching' | 'approval' | 'question'
  | 'error' | 'finished' | 'sleeping' | 'dizzy'
  | 'love' | 'surprised' | 'proud' | 'wink' | 'yawn' | 'happy' | 'annoyed' | 'sad' | 'box';

export type Badge = 'dots' | 'bang' | 'question';

export interface MoodCfg {
  eye: EyeShape;
  glow: string;
  glowOpacity: number;
  badge?: Badge;
  /** Qimirlamay turmasdan sakraydimi */
  bounce?: boolean;
  /** Boshi qiyshayadimi (daraja) */
  tilt?: number;
}

const CALM = '#E8B84A';

export const MOOD: Record<IslandMood, MoodCfg> = {
  idle: { eye: 'pill', glow: CALM, glowOpacity: 0.18 },
  working: { eye: 'wide', glow: '#3B9EFF', glowOpacity: 0.7, bounce: true },
  thinking: { eye: 'line', glow: '#A78BFA', glowOpacity: 0.7, badge: 'dots', tilt: -6 },
  searching: { eye: 'dot', glow: '#6366F1', glowOpacity: 0.7 },
  approval: { eye: 'wide', glow: '#F5A524', glowOpacity: 0.75, badge: 'bang', bounce: true },
  question: { eye: 'wide', glow: '#F5A524', glowOpacity: 0.75, badge: 'question', tilt: 6 },
  error: { eye: 'tired', glow: '#F4505E', glowOpacity: 0.7, badge: 'bang' },
  finished: { eye: 'happy', glow: '#34D399', glowOpacity: 0.7, bounce: true },
  sleeping: { eye: 'closed', glow: CALM, glowOpacity: 0.1 },
  dizzy: { eye: 'spiral', glow: CALM, glowOpacity: 0, tilt: 8 },
  love: { eye: 'heart', glow: '#FF6B8B', glowOpacity: 0.6 },
  surprised: { eye: 'wide', glow: CALM, glowOpacity: 0.4, badge: 'bang' },
  proud: { eye: 'star', glow: '#FFD54A', glowOpacity: 0.6 },
  wink: { eye: 'wink', glow: CALM, glowOpacity: 0.3 },
  yawn: { eye: 'tired', glow: CALM, glowOpacity: 0.12 },
  happy: { eye: 'happy', glow: '#34D399', glowOpacity: 0.5 },
  annoyed: { eye: 'line', glow: '#F4505E', glowOpacity: 0.35, tilt: -4 },
  sad: { eye: 'tired', glow: '#60A5FA', glowOpacity: 0.35 },
  box: { eye: 'pill', glow: '#C99A5B', glowOpacity: 0.5, bounce: true },
};

/** Eski MascotMood (va serverdan kelgan) qiymatlarini yangi hissiyotga o'tkazadi */
const LEGACY: Record<string, IslandMood> = {
  idle: 'idle', happy: 'happy', sad: 'sad', wave: 'wink', run: 'surprised',
  thinking: 'thinking', sleep: 'sleeping', loading: 'working', success: 'finished', error: 'error',
};

export function toIslandMood(m: string | undefined): IslandMood {
  if (!m) return 'idle';
  if (m in MOOD) return m as IslandMood;
  return LEGACY[m] ?? 'idle';
}

/** Qaysi hissiyotda qaysi ovoz chalinadi (yo'q bo'lsa — jim) */
export const MOOD_SOUND: Partial<Record<IslandMood, 'think' | 'love' | 'annoyed' | 'dizzy' | 'yawn' | 'greet' | 'complete' | 'error' | 'notify' | 'wink' | 'gulp' | 'success'>> = {
  thinking: 'think',
  love: 'love',
  annoyed: 'annoyed',
  dizzy: 'dizzy',
  yawn: 'yawn',
  finished: 'complete',
  proud: 'success',
  error: 'error',
  approval: 'notify',
  question: 'notify',
  wink: 'wink',
  box: 'gulp',
};
