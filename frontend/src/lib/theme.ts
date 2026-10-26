import { useSyncExternalStore } from 'react';

/* Mavzu: 'auto' (Telegram yoki telefon sozlamasiga ergashadi) | 'dark' | 'light'. */
export type ThemePref = 'auto' | 'dark' | 'light';
export type Theme = 'dark' | 'light';

const KEY = 'edugo.theme';
const BG: Record<Theme, string> = { dark: '#0B0D19', light: '#F6F4EE' };
const listeners = new Set<() => void>();
let pref: ThemePref | null = null;

function tg(): any {
  return (window as any).Telegram?.WebApp;
}

export function getThemePref(): ThemePref {
  if (pref === null) {
    let v: string | null = null;
    try { v = localStorage.getItem(KEY); } catch { /* ruxsat yo'q */ }
    pref = v === 'dark' || v === 'light' ? v : 'auto';
  }
  return pref;
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

/** Hujjatga mavzuni qo'llaydi: data-theme, brauzer va Telegram sarlavha ranglari */
export function applyTheme(animate = false) {
  const t = resolveTheme();
  const root = document.documentElement;
  if (animate) {
    root.classList.add('theme-fade');
    setTimeout(() => root.classList.remove('theme-fade'), 350);
  }
  root.dataset.theme = t;
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
  try { localStorage.setItem(KEY, p); } catch { /* ruxsat yo'q */ }
  applyTheme(true);
  listeners.forEach((l) => l());
}

/** Avto → Qorong'i → Yorug' → Avto */
export function cycleTheme() {
  const order: ThemePref[] = ['auto', 'dark', 'light'];
  setThemePref(order[(order.indexOf(getThemePref()) + 1) % order.length]);
}

/** Ilova ochilganda bir marta chaqiriladi; tizim/Telegram mavzusi o'zgarsa 'avto'da yangilanadi */
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

export function useTheme(): { pref: ThemePref; theme: Theme } {
  const p = useSyncExternalStore(
    (l) => { listeners.add(l); return () => { listeners.delete(l); }; },
    getThemePref,
    () => 'auto' as ThemePref,
  );
  return { pref: p, theme: resolveTheme(p) };
}

export const THEME_LABEL: Record<ThemePref, string> = { auto: 'Avto', dark: "Qorong'i", light: "Yorug'" };
export const THEME_ICON: Record<ThemePref, string> = { auto: '🌓', dark: '🌙', light: '☀️' };

/** Rol aksentini qo'llaydi: <html data-role="teacher"> → CSS'dagi --c-accent almashadi. */
export function applyRole(role?: string | null) {
  const map: Record<string, string> = { TEACHER: 'teacher', ADMIN: 'admin', SUPER_ADMIN: 'super', PARENT: 'parent' };
  const v = role ? map[role] : undefined;
  const root = document.documentElement;
  if (v) root.dataset.role = v;
  else delete root.dataset.role; // o'quvchi (standart)
}
