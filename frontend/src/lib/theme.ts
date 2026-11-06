import { useSyncExternalStore } from 'react';

/* Rang rejimi va vizual presetlar mustaqil boshqariladi. */
export type ThemePref = 'auto' | 'dark' | 'light';
export type Theme = 'dark' | 'light';
export type DesignPreset =
  | 'modern-minimal'
  | 'premium-dark'
  | 'gamified'
  | 'apple'
  | 'saas'
  | 'futuristic-glass';

export const DESIGN_PRESETS: { id: DesignPreset; label: string; description: string }[] = [
  { id: 'modern-minimal', label: 'Modern Minimal', description: 'Sodda, toza va muvozanatli' },
  { id: 'premium-dark', label: 'Premium Dark', description: 'To‘q ranglar va nafis aksentlar' },
  { id: 'gamified', label: 'Gamified Education', description: 'Jonli va rag‘batlantiruvchi' },
  { id: 'apple', label: 'Apple Inspired', description: 'Yengil, sokin va ravon' },
  { id: 'saas', label: 'Professional SaaS', description: 'Aniq va ishchan interfeys' },
  { id: 'futuristic-glass', label: 'Futuristic Glass', description: 'Shisha effektlari va yorug‘lik' },
];

const THEME_KEY = 'edugo.theme';
const PRESET_KEY = 'edugo.design-preset';
const BG: Record<Theme, string> = { dark: '#0B0D19', light: '#F6F4EE' };
const listeners = new Set<() => void>();
let pref: ThemePref | null = null;
let preset: DesignPreset | null = null;

function tg(): any {
  return (window as any).Telegram?.WebApp;
}

export function getThemePref(): ThemePref {
  if (pref === null) {
    let v: string | null = null;
    try { v = localStorage.getItem(THEME_KEY); } catch { /* ruxsat yo‘q */ }
    pref = v === 'dark' || v === 'light' ? v : 'auto';
  }
  return pref;
}

export function getDesignPreset(): DesignPreset {
  if (preset === null) {
    let v: string | null = null;
    try { v = localStorage.getItem(PRESET_KEY); } catch { /* ruxsat yo‘q */ }
    preset = DESIGN_PRESETS.some((item) => item.id === v) ? (v as DesignPreset) : 'modern-minimal';
  }
  return preset;
}

function system(): Theme {
  const scheme = tg()?.colorScheme;
  if (scheme === 'light' || scheme === 'dark') return scheme;
  try {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function resolveTheme(p: ThemePref = getThemePref()): Theme {
  return p === 'auto' ? system() : p;
}

export function applyTheme(animate = false) {
  const t = resolveTheme();
  const root = document.documentElement;
  if (animate) {
    root.classList.add('theme-fade');
    setTimeout(() => root.classList.remove('theme-fade'), 350);
  }
  root.dataset.theme = t;
  root.dataset.preset = getDesignPreset();
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', BG[t]);
  try {
    tg()?.setHeaderColor?.(BG[t]);
    tg()?.setBackgroundColor?.(BG[t]);
  } catch { /* eski Telegram versiyasi */ }
}

export function setThemePref(p: ThemePref) {
  pref = p;
  try { localStorage.setItem(THEME_KEY, p); } catch { /* ruxsat yo‘q */ }
  applyTheme(true);
  listeners.forEach((l) => l());
}

export function setDesignPreset(p: DesignPreset) {
  preset = p;
  try { localStorage.setItem(PRESET_KEY, p); } catch { /* ruxsat yo‘q */ }
  applyTheme(true);
  listeners.forEach((l) => l());
}

export function cycleTheme() {
  const order: ThemePref[] = ['auto', 'dark', 'light'];
  setThemePref(order[(order.indexOf(getThemePref()) + 1) % order.length]);
}

export function initTheme() {
  applyTheme();
  const refresh = () => {
    if (getThemePref() === 'auto') {
      applyTheme(true);
      listeners.forEach((l) => l());
    }
  };
  try { window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', refresh); } catch { /* eski brauzer */ }
  try { tg()?.onEvent?.('themeChanged', refresh); } catch { /* ixtiyoriy */ }
}

export function useTheme(): { pref: ThemePref; theme: Theme; preset: DesignPreset } {
  const p = useSyncExternalStore(
    (l) => { listeners.add(l); return () => { listeners.delete(l); }; },
    getThemePref,
    () => 'auto' as ThemePref,
  );
  const selectedPreset = useSyncExternalStore(
    (l) => { listeners.add(l); return () => { listeners.delete(l); }; },
    getDesignPreset,
    () => 'modern-minimal' as DesignPreset,
  );
  return { pref: p, theme: resolveTheme(p), preset: selectedPreset };
}

export const THEME_LABEL: Record<ThemePref, string> = { auto: 'Avto', dark: "Qorong'i", light: "Yorug'" };
export const THEME_ICON: Record<ThemePref, string> = { auto: '🌓', dark: '🌙', light: '☀️' };

export function applyRole(role?: string | null) {
  const map: Record<string, string> = { TEACHER: 'teacher', ADMIN: 'admin', SUPER_ADMIN: 'super', PARENT: 'parent' };
  const v = role ? map[role] : undefined;
  const root = document.documentElement;
  if (v) root.dataset.role = v;
  else delete root.dataset.role;
}
