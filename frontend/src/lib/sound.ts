// Ovoz effektlari: tashqi fayl yo'q — WebAudio bilan sintez qilinadi (yengil, offline ishlaydi).
export type SoundName = 'tap' | 'success' | 'error' | 'notify' | 'nav' | 'complete';

const KEY = 'edugo.sound';
let ctx: AudioContext | null = null;
let enabled: boolean | null = null;
const listeners = new Set<() => void>();

export function isSoundEnabled(): boolean {
  if (enabled === null) {
    try { enabled = localStorage.getItem(KEY) !== 'off'; } catch { enabled = true; }
  }
  return enabled;
}

export function setSoundEnabled(v: boolean) {
  enabled = v;
  try { localStorage.setItem(KEY, v ? 'on' : 'off'); } catch { /* ruxsat yo'q */ }
  listeners.forEach((l) => l());
  if (v) playSound('tap');
}

export function subscribeSound(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

function audio(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch { return null; }
}

function tone(c: AudioContext, freq: number, start: number, dur: number, vol: number, type: OscillatorType = 'sine', slideTo?: number) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  const t0 = c.currentTime + start;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

const last: Partial<Record<SoundName, number>> = {};

export function playSound(name: SoundName) {
  if (!isSoundEnabled()) return;
  const now = Date.now();
  if (now - (last[name] ?? 0) < (name === 'tap' ? 40 : 120)) return;
  last[name] = now;
  const c = audio();
  if (!c) return;
  switch (name) {
    case 'tap':
      tone(c, 520, 0, 0.06, 0.07, 'triangle', 380);
      break;
    case 'nav':
      tone(c, 300, 0, 0.14, 0.035, 'sine', 560);
      break;
    case 'success':
      tone(c, 660, 0, 0.12, 0.09, 'sine');
      tone(c, 880, 0.09, 0.18, 0.09, 'sine');
      break;
    case 'error':
      tone(c, 220, 0, 0.16, 0.09, 'sawtooth', 160);
      tone(c, 180, 0.12, 0.2, 0.08, 'sawtooth', 120);
      break;
    case 'notify':
      tone(c, 988, 0, 0.14, 0.09, 'sine');
      tone(c, 1318, 0.12, 0.26, 0.08, 'sine');
      break;
    case 'complete':
      [523, 659, 784, 1047].forEach((f, i) => tone(c, f, i * 0.1, 0.22, 0.09, 'triangle'));
      break;
  }
}
