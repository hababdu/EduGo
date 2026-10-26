import { useCallback, useEffect, useRef, useState } from 'react';
import { API_URL } from '../lib/config';
import { useAuthStore } from '../store/auth.store';
import { IslandBot } from '../components/ai/island/IslandBot';
import { playSound } from '../lib/sound';
import { useInstall } from '../lib/pwa';

type Phase = 'idle' | 'starting' | 'waiting' | 'error';

interface StartRes { id: string; secret: string; url: string; expiresIn: number }

async function post<T>(path: string, body?: unknown, timeoutMs = 25_000): Promise<{ status: number; data: T }> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctl.signal,
    });
  } finally {
    clearTimeout(t);
  }
  let data: any = null;
  try { data = await res.json(); } catch { /* bo'sh */ }
  return { status: res.status, data };
}

/** Telegram tashqarisida (PWA / Android ilova) kirish: bot orqali tasdiqlash. */
export function LoginPage() {
  const setSession = useAuthStore((s) => s.setSession);
  const [phase, setPhase] = useState<Phase>('idle');
  const [msg, setMsg] = useState('');
  const [link, setLink] = useState('');
  const { canInstall, ios, install } = useInstall();
  const timer = useRef<number | null>(null);
  const cur = useRef<StartRes | null>(null);

  const stop = () => { if (timer.current) { window.clearInterval(timer.current); timer.current = null; } };
  useEffect(() => stop, []);

  // Render bepul tarifda server uxlab qoladi — sahifa ochilishi bilan uyg'otamiz
  useEffect(() => { fetch(`${API_URL}/api/v1/auth/app-login/poll`, { method: 'POST' }).catch(() => {}); }, []);

  const poll = useCallback(async () => {
    const c = cur.current;
    if (!c) return;
    try {
      const { status, data } = await post<any>('/api/v1/auth/app-login/poll', { id: c.id, secret: c.secret });
      if (status === 404) {
        stop(); cur.current = null;
        setPhase('error'); setMsg("Kod eskirgan. Qaytadan urinib ko'ring.");
        return;
      }
      if (status >= 200 && status < 300 && data?.status === 'ok') {
        stop(); cur.current = null;
        playSound('success');
        setSession({ accessToken: data.accessToken, refreshToken: data.refreshToken, user: data.user });
      } else if (status === 401) {
        stop(); cur.current = null;
        setPhase('error'); setMsg(data?.message || 'Kirish rad etildi.');
      }
    } catch { /* tarmoq uzilishi — keyingi urinishda */ }
  }, [setSession]);

  const begin = async () => {
    playSound('tap');
    setPhase('starting'); setMsg('');
    let lastErr = '';
    // Server uxlab yotgan bo'lsa (Render) birinchi urinishlar o'tmaydi — bir necha marta qaytaramiz
    for (let i = 0; i < 4; i++) {
      try {
        const { status, data } = await post<StartRes>('/api/v1/auth/app-login/start');
        if (status >= 200 && status < 300 && data?.id) {
          cur.current = data;
          setLink(data.url);
          setPhase('waiting');
          try { window.open(data.url, '_blank', 'noopener'); } catch { /* bloklangan — tugma bor */ }
          stop();
          timer.current = window.setInterval(poll, 2000);
          return;
        }
        lastErr = `server javobi ${status}${(data as any)?.message ? ': ' + (data as any).message : ''}`;
        if (status >= 400 && status < 500 && status !== 429) break;
      } catch (e: any) {
        lastErr = e?.name === 'AbortError' ? 'server javob bermadi' : 'tarmoq xatosi';
      }
      if (i < 3) { setMsg('Server uyg‘onmoqda, biroz kuting…'); await new Promise((r) => setTimeout(r, 4000)); }
    }
    setPhase('error'); setMsg(`Serverga ulanib bo‘lmadi (${lastErr}). Internetni tekshirib, qayta urinib ko‘ring.`);
  };

  // Telegramdan qaytganda darrov tekshiramiz
  useEffect(() => {
    const on = () => { if (document.visibilityState === 'visible') void poll(); };
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, [poll]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center mb-4">
          <IslandBot mood={phase === 'waiting' ? 'thinking' : phase === 'error' ? 'sad' : 'happy'} outfit="none" size={96} />
        </div>
        <h1 className="font-display text-2xl mb-1">EduGo</h1>
        <p className="text-sm text-ink-muted mb-6">
          {phase === 'waiting'
            ? '“Telegramni ochish” tugmasini bosing, botda Start bosing, so‘ng shu ilovaga qayting. (Bot uxlab yotgan bo‘lsa 1 daqiqagacha kechikishi mumkin.)'
            : 'Hisobingiz Telegram orqali tasdiqlanadi. Parol kerak emas.'}
        </p>

        {phase !== 'waiting' && (
          <button
            onClick={begin}
            disabled={phase === 'starting'}
            className="w-full rounded-2xl bg-accent text-base font-semibold py-3.5 active:scale-[0.98] transition disabled:opacity-60"
          >
            {phase === 'starting' ? (msg || 'Tayyorlanmoqda…') : '✈️ Telegram orqali kirish'}
          </button>
        )}

        {phase === 'waiting' && (
          <div className="space-y-3">
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-2xl bg-accent text-base font-semibold py-3.5"
            >
              Telegramni ochish
            </a>
            <p className="text-xs text-ink-faint animate-pulse">Tasdiqlash kutilmoqda…</p>
            <button onClick={() => { stop(); cur.current = null; setPhase('idle'); }} className="text-xs text-ink-muted underline">
              Bekor qilish
            </button>
          </div>
        )}

        {phase !== 'waiting' && canInstall && (
          <button onClick={install} className="mt-3 w-full rounded-2xl border border-tint/20 py-3 text-sm">
            📲 Ilovani o‘rnatish
          </button>
        )}
        {phase !== 'waiting' && ios && !canInstall && (
          <p className="mt-4 text-xs text-ink-faint">
            iPhone: Safari’da “Ulashish” → “Bosh ekranga qo‘shish” orqali ilova sifatida o‘rnating.
          </p>
        )}

        {phase === 'error' && <p className="mt-4 text-sm text-coral">{msg}</p>}
      </div>
    </div>
  );
}
