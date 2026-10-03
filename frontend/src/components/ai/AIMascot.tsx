import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import { MascotSVG, type MascotMood } from './MascotSVG';
import { StudentChatHub } from '../assistant/StudentChatHub';

/* ============================================================
   AI MASCOT — Professional AI Yordamchi Ko'rinishi
   + O'chirilganda qayta yoqish uchun kichik floating tugma
   ============================================================ */

const STORAGE_KEY = 'ai-mascot-enabled';

const IDLE_JOKES = [
  "Salom! Bugun qaysi mavzuni muhokama qilamiz? 🤖",
  "Yangi bilimlarni o'rganishga tayyormisiz? 🚀",
  "Savolingiz bo'lsa, ustimga bosing — yordam beraman! 💡",
  "Kichik tanaffusdan keyin yana davom etamiz 😉",
  "Har kuni 1% oldinga intilamiz! 📈",
];

const CATCH_LINES = [
  "Voy, ushlab oldingiz! 🎉",
  "Zo'r reflekslar! ✋",
  "Bu safar qochib bo'lmadi 😄",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface OpenChatContext {
  studentName?: string;
  weakTopics?: string[];
}

interface MascotContextValue {
  celebrate: () => void;
  comfort: () => void;
  speak: (text: string, mood?: MascotMood) => void;
  openChat: (ctx?: OpenChatContext) => void;
}

const MascotContext = createContext<MascotContextValue | null>(null);

export function useMascot() {
  const ctx = useContext(MascotContext);
  if (!ctx) {
    return {
      celebrate: () => {},
      comfort: () => {},
      speak: () => {},
      openChat: () => {},
    };
  }
  return ctx;
}

interface AIMascotProps {
  children?: React.ReactNode;
  corner?: 'bottom-right' | 'bottom-left';
  minIntervalMs?: number;
  maxIntervalMs?: number;
}

/* ---------- O'yin sozlamalari ---------- */
const MASCOT_SIZE = 58;
const DODGE_RADIUS = 120; // shuncha px yaqinlashsa qochadi
const DODGE_COOLDOWN_MS = 320;
const AUTO_ROAM_MS = 2200;

interface Point {
  x: number;
  y: number;
}

export function AIMascotProvider({
  children,
  corner = 'bottom-right',
  minIntervalMs = 40_000,
  maxIntervalMs = 90_000,
}: AIMascotProps) {
  const [enabled, setEnabled] = useState(true);
  const [bubble, setBubble] = useState<string | null>(null);
  const [mood, setMood] = useState<MascotMood>('idle');
  const [showSettings, setShowSettings] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatContext, setChatContext] = useState<OpenChatContext>({});

  /* ---------- Quvlashmachoq o'yini holati ---------- */
  const [gameActive, setGameActive] = useState(false);
  const [position, setPosition] = useState<Point | null>(null);
  const [catches, setCatches] = useState(0);
  const [caughtFlash, setCaughtFlash] = useState(false);

  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasLongPress = useRef(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const lastDodgeAt = useRef(0);
  const roamTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'false') setEnabled(false);
  }, []);

  const showBubble = useCallback((text: string, duration = 4500) => {
    setBubble(text);
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => setBubble(null), duration);
  }, []);

  const celebrate = useCallback(() => {
    if (!enabled) return;
    setMood('happy');
    setTimeout(() => setMood((m) => (m === 'happy' ? 'idle' : m)), 3000);
  }, [enabled]);

  const comfort = useCallback(() => {
    if (!enabled) return;
    setMood('sad');
    setTimeout(() => setMood((m) => (m === 'sad' ? 'idle' : m)), 3400);
  }, [enabled]);

  const speak = useCallback(
    (text: string, nextMood?: MascotMood) => {
      if (!enabled) return;
      showBubble(text);
      if (nextMood) {
        setMood(nextMood);
        setTimeout(() => setMood((m) => (m === nextMood ? 'idle' : m)), 4000);
      }
    },
    [enabled, showBubble],
  );

  const openChat = useCallback((ctx?: OpenChatContext) => {
    if (ctx) setChatContext(ctx);
    setChatOpen(true);
    setBubble(null);
  }, []);

  useEffect(() => {
    if (!enabled || gameActive) return;

    const scheduleNext = () => {
      const delay =
        minIntervalMs + Math.random() * (maxIntervalMs - minIntervalMs);
      idleTimer.current = setTimeout(() => {
        if (!chatOpen) showBubble(pick(IDLE_JOKES));
        scheduleNext();
      }, delay);
    };

    scheduleNext();
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [enabled, gameActive, minIntervalMs, maxIntervalMs, showBubble, chatOpen]);

  const randomPosition = useCallback((avoid?: Point): Point => {
    const padX = 24;
    const padTop = 84;
    const padBottom = 120;
    const maxX = Math.max(padX, window.innerWidth - MASCOT_SIZE - padX);
    const maxY = Math.max(
      padTop,
      window.innerHeight - MASCOT_SIZE - padBottom,
    );

    let best: Point = { x: padX, y: padTop };
    let bestDist = -1;

    for (let i = 0; i < 6; i++) {
      const candidate: Point = {
        x: padX + Math.random() * (maxX - padX),
        y: padTop + Math.random() * (maxY - padTop),
      };
      if (!avoid) {
        best = candidate;
        break;
      }
      const dist = Math.hypot(candidate.x - avoid.x, candidate.y - avoid.y);
      if (dist > bestDist) {
        bestDist = dist;
        best = candidate;
      }
    }
    return best;
  }, []);

  const startGame = useCallback(() => {
    setShowSettings(false);
    setBubble(null);
    setChatOpen(false);
    setCatches(0);
    setPosition(randomPosition());
    setMood('run');
    setGameActive(true);
  }, [randomPosition]);

  const stopGame = useCallback(() => {
    setGameActive(false);
    setPosition(null);
    setMood('idle');
  }, []);

  const dodge = useCallback(
    (from?: Point) => {
      const now = Date.now();
      if (now - lastDodgeAt.current < DODGE_COOLDOWN_MS) return;
      lastDodgeAt.current = now;
      setPosition(randomPosition(from));
      setMood('run');
    },
    [randomPosition],
  );

  const handleCatch = useCallback(() => {
    setCatches((c) => c + 1);
    setCaughtFlash(true);
    setMood('happy');
    setTimeout(() => setCaughtFlash(false), 900);
    setTimeout(() => {
      setPosition(randomPosition());
      setMood('run');
    }, 700);
  }, [randomPosition]);

  useEffect(() => {
    if (!gameActive) {
      if (roamTimer.current) clearInterval(roamTimer.current);
      return;
    }
    roamTimer.current = setInterval(() => {
      setPosition((prev) => randomPosition(prev ?? undefined));
    }, AUTO_ROAM_MS);
    return () => {
      if (roamTimer.current) clearInterval(roamTimer.current);
    };
  }, [gameActive, randomPosition]);

  useEffect(() => {
    if (!gameActive) return;

    const handlePointerMove = (e: PointerEvent) => {
      const el = buttonRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
      if (dist < DODGE_RADIUS) {
        dodge({ x: e.clientX, y: e.clientY });
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, [gameActive, dodge]);

  const handleTap = () => {
    if (gameActive) {
      handleCatch();
      return;
    }
    if (wasLongPress.current) {
      wasLongPress.current = false;
      return;
    }
    setMood('wave');
    setTimeout(() => setMood((m) => (m === 'wave' ? 'idle' : m)), 1000);
    openChat();
  };

  const handlePressStart = () => {
    if (gameActive) return;
    wasLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      wasLongPress.current = true;
      setShowSettings(true);
    }, 650);
  };

  const handlePressEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const toggleEnabled = () => {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem(STORAGE_KEY, String(next));
    setShowSettings(false);
    setBubble(null);
    if (gameActive) stopGame();
  };

  const cornerClass = corner === 'bottom-right' ? 'right-5' : 'left-5';

  const contextValue: MascotContextValue = {
    celebrate,
    comfort,
    speak,
    openChat,
  };

  return (
    <MascotContext.Provider value={contextValue}>
      {children}

      {/* Robot yoqilgan va o'yin holatida bo'lmagan vaqtda */}
      {enabled && !gameActive && (
        <div
          className={`fixed bottom-24 sm:bottom-6 ${cornerClass} z-40 select-none flex flex-col items-end`}
        >
          {bubble && !chatOpen && (
            <div
              className={`absolute bottom-full mb-3 ${
                corner === 'bottom-right' ? 'right-0' : 'left-0'
              } max-w-[260px] bg-slate-900/90 backdrop-blur-md border border-indigo-500/30 text-slate-100 text-xs rounded-2xl rounded-br-sm px-4 py-3 shadow-2xl shadow-indigo-500/10 animate-[mascotPop_0.25s_ease-out]`}
            >
              <div className="flex items-center gap-1.5 mb-1 text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                AI Yordamchi
              </div>
              <p className="leading-relaxed">{bubble}</p>
            </div>
          )}

          {showSettings && (
            <div
              className={`absolute bottom-full mb-3 ${
                corner === 'bottom-right' ? 'right-0' : 'left-0'
              } bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-xs z-50`}
            >
              <div className="px-3 py-2 bg-slate-800/60 font-medium text-slate-300 border-b border-slate-700/50">
                AI Sozlamalari
              </div>
              <button
                type="button"
                onClick={startGame}
                className="w-full text-left px-4 py-2.5 text-emerald-400 hover:bg-slate-800 transition-colors whitespace-nowrap flex items-center gap-2 border-b border-slate-800"
              >
                <span>🎮</span> Meni ushlab ko'ring! (o'yin)
              </button>
              <button
                type="button"
                onClick={toggleEnabled}
                className="w-full text-left px-4 py-2.5 text-rose-400 hover:bg-slate-800 transition-colors whitespace-nowrap flex items-center gap-2"
              >
                <span>🔕</span> Robotni o'chirish
              </button>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="w-full text-left px-4 py-2.5 text-slate-400 hover:bg-slate-800 transition-colors whitespace-nowrap border-t border-slate-800"
              >
                Bekor qilish
              </button>
            </div>
          )}

          <button
            type="button"
            aria-label="Professional AI yordamchi bilan chatni ochish"
            onClick={handleTap}
            onMouseDown={handlePressStart}
            onMouseUp={handlePressEnd}
            onMouseLeave={handlePressEnd}
            onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
            className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-600/20 to-purple-600/20 hover:from-indigo-600/30 hover:to-purple-600/30 flex items-center justify-center active:scale-95 transition-all duration-300 group cursor-pointer focus:outline-none"
          >
            <MascotSVG mood={mood} size={58} />
          </button>
        </div>
      )}

      {/* ============ ROBOT O'CHIRILGANDA PAYDO BO'LADIGAN QAYTA YOQISH TUGMASI ============ */}
      {!enabled && (
        <div className={`fixed bottom-24 sm:bottom-6 ${cornerClass} z-40 select-none`}>
          <button
            type="button"
            onClick={toggleEnabled}
            title="AI Robotni qayta yoqish"
            className="group flex items-center gap-2 bg-slate-900/90 hover:bg-slate-900 text-slate-200 text-xs font-medium px-3.5 py-2.5 rounded-full border border-indigo-500/30 shadow-xl backdrop-blur-md active:scale-95 transition-all duration-300"
          >
            <span className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
              🤖
            </span>
            <span>AI Yoqish</span>
          </button>
        </div>
      )}

      {/* ============ QUVLASHMACHOQ REJIMI ============ */}
      {enabled && gameActive && position && (
        <>
          <div className="fixed top-3 inset-x-3 z-50 flex items-center justify-between gap-2 bg-slate-900/90 backdrop-blur-md border border-indigo-500/30 rounded-2xl px-4 py-2.5 shadow-xl">
            <div className="flex items-center gap-2 text-xs text-slate-100">
              <span>🏃</span>
              <span className="font-semibold">Ushlab ko'ring!</span>
              <span className="text-slate-400">·</span>
              <span className="text-emerald-400 font-semibold tabular-nums">
                {catches} ta ushlandi
              </span>
            </div>
            <button
              type="button"
              onClick={stopGame}
              className="text-[11px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-xl active:scale-95 transition-transform"
            >
              ✕ To'xtatish
            </button>
          </div>

          {caughtFlash && (
            <div className="fixed top-16 inset-x-3 z-50 flex justify-center pointer-events-none">
              <div className="bg-emerald-500/90 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xl animate-[mascotPop_0.2s_ease-out]">
                {pick(CATCH_LINES)}
              </div>
            </div>
          )}

          <button
            ref={buttonRef}
            type="button"
            aria-label="Robotni ushlash"
            onClick={handleTap}
            style={{
              position: 'fixed',
              left: position.x,
              top: position.y,
              transition: 'left 0.3s ease-out, top 0.3s ease-out',
            }}
            className="z-40 w-16 h-16 flex items-center justify-center active:scale-90 transition-transform"
          >
            <MascotSVG mood={mood} size={MASCOT_SIZE} />
          </button>
        </>
      )}

      <StudentChatHub
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        studentName={chatContext.studentName}
        weakTopics={chatContext.weakTopics}
      />

      <style>{`
        @keyframes mascotPop {
          from { opacity: 0; transform: translateY(6px) scale(0.94); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </MascotContext.Provider>
  );
}

export default AIMascotProvider;