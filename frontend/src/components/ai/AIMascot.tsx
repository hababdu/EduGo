import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { type MascotMood } from './MascotSVG';
import { StudentChatHub } from '../assistant/StudentChatHub';
import { AssistantSheet } from '../assistant/AssistantSheet';
import { useAssistant } from '../../hooks/useAssistant';
import { safePage } from '../../lib/assistant-client';
import { ChatFileError, readChatFile } from '../../lib/chat-file';
import { haptic } from '../../lib/telegram';
import { isSoundEnabled, playSound, setSoundEnabled } from '../../lib/sound';
import { useAuthStore } from '../../store/auth.store';
import { toast } from '../ui/Toast';
import { THEME_ICON, THEME_LABEL, cycleTheme, useTheme } from '../../lib/theme';
import { IslandBot } from './island/IslandBot';
import { MOOD, MOOD_SOUND, toIslandMood, type IslandMood } from './island/moods';
import { OUTFITS, setOutfitPref, useOutfitPref } from './island/outfits';
import {
  MascotContext,
  useMascot,
  type AttachedFile,
  type MascotContextValue,
  type MascotReaction,
  type OpenChatContext,
} from './mascot-context';

export { useMascot };

/* ============================================================
   AI OROL — ekranning yuqori markazida "dinamik orol"dek turuvchi robot.
   • iPhone oroli va Telegram sarlavhasi ostida turadi (--island-top, index.css)
   • hissiyatlar: o'ylaydi, ishlaydi, xato, bayram, uyqu, jahli chiqadi, boshi aylanadi...
   • bosilsa chat ochiladi; ushlab tursangiz menyu (kiyim, ovoz, o'chirish)
   • fayl tashlansa robot qutiga aylanib, uni "yutadi" va savol berishga tayyor bo'ladi
   ============================================================ */

const STORAGE_KEY = 'ai-mascot-enabled';
const SLEEP_AFTER_MS = 120_000;

const IDLE_LINES: Record<'STUDENT' | 'STAFF', string[]> = {
  STUDENT: [
    'Savolingiz bo\'lsa, ustimga bosing 💡',
    'Yangi mavzuni o\'rganamizmi? 🚀',
    'Har kuni 1% oldinga 📈',
    'Faylni shu yerga tashlang — o\'qib beraman 📦',
  ],
  STAFF: [
    'Guruhlar tahlilini tayyorlab beraymi? 📊',
    'Test savollarini AI bilan yaratish mumkin ✨',
    'Qaysi o\'quvchilarga yordam kerakligini aytaman 🔎',
  ],
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const PILL_W = 96;
const PILL_H = 34;
const BUBBLE_W = 300;
const BUBBLE_H = 58;

export function AIMascotProvider({ children }: { children?: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const { pathname } = useLocation();
  const isStudent = !user || (user.role !== 'TEACHER' && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN');
  const staffAssistant = useAssistant({ page: safePage(pathname) });
  const { outfit, pref } = useOutfitPref();

  const [enabled, setEnabled] = useState(true);
  const [baseMood, setBaseMood] = useState<IslandMood>('idle');
  const [flash, setFlash] = useState<IslandMood | null>(null);
  const [bubble, setBubble] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatContext, setChatContext] = useState<OpenChatContext>({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [dragging, setDragging] = useState(false);

  const fileRef = useRef<AttachedFile | undefined>(undefined);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const petTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);
  const lastActive = useRef(Date.now());
  const pokes = useRef<number[]>([]);
  const enabledRef = useRef(true);
  enabledRef.current = enabled;

  const pending = !isStudent ? staffAssistant.pendingCount : 0;
  const mood: IslandMood = dragging
    ? 'box'
    : flash ?? (!enabled ? 'sleeping' : pending > 0 && !chatOpen ? 'approval' : baseMood);

  /* ---------- Ovoz: hissiyat o'zgarganda ---------- */
  const prevMood = useRef<IslandMood>(mood);
  useEffect(() => {
    if (prevMood.current !== mood && enabledRef.current) {
      const snd = MOOD_SOUND[mood];
      if (snd) playSound(snd);
    }
    prevMood.current = mood;
  }, [mood]);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === 'false') setEnabled(false);
    } catch { /* yoqilgan holat */ }
  }, []);

  const doFlash = useCallback((m: IslandMood, ms = 2500) => {
    if (!enabledRef.current) return;
    setFlash(m);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), ms);
  }, []);

  const showBubble = useCallback((text: string, ms = 4500) => {
    if (!enabledRef.current) return;
    setBubble(text);
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => setBubble(null), ms);
  }, []);

  /* ---------- Ommaviy API ---------- */
  const celebrate = useCallback(() => doFlash('proud', 3200), [doFlash]);
  const comfort = useCallback(() => doFlash('sad', 3400), [doFlash]);

  const speak = useCallback(
    (text: string, m?: MascotMood) => {
      showBubble(text);
      if (m) doFlash(toIslandMood(m), 3500);
    },
    [showBubble, doFlash],
  );

  const openChat = useCallback((ctx?: OpenChatContext) => {
    if (ctx) {
      setChatContext(ctx);
      fileRef.current = ctx.file;
    }
    setBubble(null);
    setMenuOpen(false);
    setFlash(null);
    setChatOpen(true);
    playSound('pop');
  }, []);

  const react = useCallback(
    (e: MascotReaction) => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
      switch (e) {
        case 'thinking': setFlash(null); setBaseMood('thinking'); break;
        case 'working': setFlash(null); setBaseMood('working'); break;
        case 'approval': setFlash(null); setBaseMood('approval'); break;
        case 'finished': setBaseMood('idle'); doFlash('finished', 2200); break;
        case 'error': setBaseMood('idle'); doFlash('error', 3000); break;
        default: setFlash(null); setBaseMood('idle');
      }
    },
    [doFlash],
  );

  const poke = useCallback(() => {
    const now = Date.now();
    pokes.current = [...pokes.current.filter((t) => now - t < 1400), now];
    if (pokes.current.length >= 3) {
      pokes.current = [];
      doFlash('dizzy', 2600);
    } else {
      doFlash('annoyed', 1100);
    }
  }, [doFlash]);

  const petStart = useCallback(() => {
    if (petTimer.current) clearTimeout(petTimer.current);
    petTimer.current = setTimeout(() => doFlash('love', 3200), 1500);
  }, [doFlash]);
  const petEnd = useCallback(() => {
    if (petTimer.current) clearTimeout(petTimer.current);
  }, []);

  const takeFile = useCallback(() => {
    const f = fileRef.current;
    fileRef.current = undefined;
    return f;
  }, []);

  /* ---------- Faollik: uyqu va uyg'onish ---------- */
  useEffect(() => {
    const touch = () => {
      lastActive.current = Date.now();
      setBaseMood((m) => {
        if (m === 'sleeping') {
          doFlash('surprised', 900);
          return 'idle';
        }
        return m;
      });
    };
    window.addEventListener('pointerdown', touch, { passive: true });
    window.addEventListener('keydown', touch);
    const iv = setInterval(() => {
      if (!enabledRef.current) return;
      if (Date.now() - lastActive.current > SLEEP_AFTER_MS) {
        setBaseMood((m) => {
          if (m !== 'idle') return m;
          doFlash('yawn', 1800);
          setTimeout(() => setBaseMood((x) => (x === 'idle' ? 'sleeping' : x)), 1800);
          return m;
        });
        lastActive.current = Date.now() - SLEEP_AFTER_MS + 8_000;
      }
    }, 10_000);
    return () => {
      window.removeEventListener('pointerdown', touch);
      window.removeEventListener('keydown', touch);
      clearInterval(iv);
    };
  }, [doFlash]);

  /* ---------- Birinchi salom (sessiyada bir marta) va tasodifiy gaplar ---------- */
  useEffect(() => {
    if (!user) return;
    let seen = false;
    try { seen = sessionStorage.getItem('edugo.island.greeted') === '1'; sessionStorage.setItem('edugo.island.greeted', '1'); } catch { /* ixtiyoriy */ }
    if (seen) return;
    const t = setTimeout(() => {
      doFlash('wink', 2200);
      playSound('greet');
      showBubble(`Salom, ${user.firstName}! 👋`, 3500);
    }, 1200);
    return () => clearTimeout(t);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!enabled || chatOpen) return;
    let t: ReturnType<typeof setTimeout>;
    const next = () => {
      t = setTimeout(() => {
        if (document.visibilityState === 'visible') showBubble(pick(IDLE_LINES[isStudent ? 'STUDENT' : 'STAFF']));
        next();
      }, 45_000 + Math.random() * 45_000);
    };
    next();
    return () => clearTimeout(t);
  }, [enabled, chatOpen, isStudent, showBubble]);

  /* ---------- Fayl tashlash (faqat o'quvchi: repetitor fayl asosida javob beradi) ---------- */
  useEffect(() => {
    if (!isStudent || !enabled) return;
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');
    const over = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      setDragging((d) => {
        if (!d) showBubble('Faylni tashlang 📦', 8000);
        return true;
      });
    };
    const leave = (e: DragEvent) => {
      if (e.relatedTarget === null) setDragging(false);
    };
    const drop = async (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer?.files?.[0];
      if (!f) return;
      try {
        const file = await readChatFile(f);
        playSound('gulp');
        openChat({ ...chatContext, file });
        doFlash('happy', 2000);
      } catch (err) {
        toast('error', err instanceof ChatFileError ? err.message : "Faylni o'qib bo'lmadi");
        doFlash('error', 2000);
      }
    };
    window.addEventListener('dragover', over);
    window.addEventListener('dragleave', leave);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragover', over);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('drop', drop);
    };
  }, [isStudent, enabled, chatContext, openChat, doFlash, showBubble]);

  /* ---------- Pill: bosish va ushlab turish ---------- */
  const onPressStart = () => {
    longPressed.current = false;
    pressTimer.current = setTimeout(() => {
      longPressed.current = true;
      haptic('medium');
      setMenuOpen(true);
    }, 600);
  };
  const onPressEnd = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };
  const onTap = () => {
    if (longPressed.current) { longPressed.current = false; return; }
    haptic('light');
    openChat();
  };

  const toggleEnabled = () => {
    const next = !enabled;
    setEnabled(next);
    try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* ixtiyoriy */ }
    setMenuOpen(false);
    setBubble(null);
    setFlash(null);
  };

  const ctxValue: MascotContextValue = {
    celebrate, comfort, speak, openChat, mood, react, poke, petStart, petEnd, takeFile, chatContext,
  };

  const cfg = MOOD[mood];
  const expanded = !!bubble && !chatOpen && enabled;
  const w = expanded ? BUBBLE_W : enabled ? PILL_W : 64;
  const h = expanded ? BUBBLE_H : enabled ? PILL_H : 28;
  const soundOn = isSoundEnabled();
  const { pref: themePref } = useTheme();

  return (
    <MascotContext.Provider value={ctxValue}>
      {children}

      {!chatOpen && (
        <div
          className="fixed left-1/2 z-50 -translate-x-1/2 select-none"
          style={{ top: 'var(--island-top)', maxWidth: 'calc(100vw - 16px)' }}
        >
          <button
            type="button"
            aria-label="AI yordamchini ochish"
            data-silent
            onClick={onTap}
            onPointerDown={onPressStart}
            onPointerUp={onPressEnd}
            onPointerLeave={onPressEnd}
            onPointerCancel={onPressEnd}
            onContextMenu={(e) => { e.preventDefault(); setMenuOpen(true); }}
            className="relative flex items-center overflow-hidden bg-[#05070F] shadow-xl"
            style={{
              color: '#F6F3EA',
              width: `min(${w}px, calc(100vw - 16px))`,
              height: h,
              borderRadius: expanded ? 29 : 999,
              padding: expanded ? '0 14px 0 8px' : 0,
              justifyContent: expanded ? 'flex-start' : 'center',
              gap: 8,
              touchAction: 'manipulation',
              transition:
                'width .42s cubic-bezier(.34,1.3,.64,1), height .42s cubic-bezier(.34,1.3,.64,1), border-radius .3s, box-shadow .4s',
              boxShadow: `0 0 0 1px rgba(255,255,255,.09), 0 8px 24px -8px ${cfg.glow}${Math.round(Math.max(cfg.glowOpacity, 0.15) * 255).toString(16).padStart(2, '0')}`,
            }}
          >
            <IslandBot mood={mood} outfit={enabled ? outfit : 'none'} size={expanded ? 52 : enabled ? 44 : 34} style={{ flexShrink: 0, transition: 'all .3s' }} />
            {expanded && (
              <span className="min-w-0 text-left text-[12px] leading-snug line-clamp-2" style={{ animation: 'island-fade .3s .12s backwards' }}>
                {bubble}
              </span>
            )}
            {pending > 0 && !expanded && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[16px] h-4 px-1 rounded-full bg-coral text-white text-[10px] font-bold flex items-center justify-center">
                {pending}
              </span>
            )}
          </button>

          {menuOpen && (
            <>
              <button type="button" aria-label="Yopish" className="fixed inset-0 z-[-1] cursor-default" onClick={() => setMenuOpen(false)} />
              <div className="island-open absolute left-1/2 top-full mt-2 w-[280px] -translate-x-1/2 rounded-3xl glass border border-tint/10 p-3 shadow-2xl text-xs">
                <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Garderob</p>
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setOutfitPref('auto')}
                    className={`rounded-xl py-2 text-center ${pref === 'auto' ? 'bg-gold text-base font-semibold' : 'bg-tint/5 text-ink-muted'}`}
                  >
                    <span className="block text-base">✨</span>Avto
                  </button>
                  {OUTFITS.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      title={o.label}
                      onClick={() => setOutfitPref(o.id)}
                      className={`rounded-xl py-2 text-center ${pref === o.id ? 'bg-gold text-base font-semibold' : 'bg-tint/5 text-ink-muted'}`}
                    >
                      <span className="block text-base">{o.emoji}</span>
                      <span className="block truncate px-0.5 text-[9px]">{o.label}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-2 space-y-1 border-t border-tint/5 pt-2">
                  <button
                    type="button"
                    onClick={cycleTheme}
                    className="w-full rounded-xl px-3 py-2.5 text-left text-ink-muted hover:bg-tint/5"
                  >
                    {THEME_ICON[themePref]} Mavzu: <span className="font-semibold text-ink">{THEME_LABEL[themePref]}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSoundEnabled(!soundOn); setMenuOpen(false); }}
                    className="w-full rounded-xl px-3 py-2.5 text-left text-ink-muted hover:bg-tint/5"
                  >
                    {soundOn ? '🔇 Ovozni o\'chirish' : '🔊 Ovozni yoqish'}
                  </button>
                  <button
                    type="button"
                    onClick={toggleEnabled}
                    className={`w-full rounded-xl px-3 py-2.5 text-left hover:bg-tint/5 ${enabled ? 'text-coral' : 'text-teal'}`}
                  >
                    {enabled ? '🔕 Robotni uxlatish' : '🤖 Robotni uyg\'otish'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {isStudent ? (
        <StudentChatHub
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
          studentName={chatContext.studentName ?? user?.firstName}
          weakTopics={chatContext.weakTopics}
        />
      ) : (
        <AssistantSheet
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
          role={user?.role}
          assistant={staffAssistant}
        />
      )}
    </MascotContext.Provider>
  );
}
