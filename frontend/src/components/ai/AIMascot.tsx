import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import { MascotSVG, type MascotMood } from './MascotSVG';

/* ============================================================
   AI MASCOT — hazilkash mitti robot
   Ekranda suzib yuradi, vaqti-vaqti bilan hazil qiladi.
   Haqiqiy tugma/matnlarga tegmaydi (xavfsiz) — faqat o'zi
   harakatlanadi va gapiradigan pufakcha ko'rsatadi.
   ============================================================ */

const STORAGE_KEY = 'ai-mascot-enabled';

const IDLE_JOKES = [
  "Bugun ham bilim ovlaymizmi? 🎣",
  "Meni ko'rmaganga olsang ham, men baribir hazil qilaman 😄",
  "Miya mashqi vaqti keldimi? 🧠",
  "Ssst... men shunchaki suzib yuribman 🛸",
  "5 daqiqa dam ol, keyin davom et 😉",
  "Sen zo'rsan, shuni bilasanmi? ✨",
  "Robotlar ham charchaydi... deb o'ylaysanmi? 😅",
  "Test yechish vaqti keldimi, jamoat? 📝",
  "Bugungi maqsad: kamida 1% yaxshiroq bo'lish 🚀",
  "Meni bosib ko'r, hazil aytib beraman 🤖",
];

const TAP_JOKES = [
  "Voy, meni ushlab oldingmi! 😳",
  "Hazilim tugadi... hozircha 😄",
  "Yordam kerakmi? Men shunchaki robotman, lekin urinib ko'raman 🤔",
  "Bip-bop! Signal qabul qilindi 📡",
  "Meni ko'chirib qo'ysang, boshqa joyga qochib ketaman 🏃",
  "100% batareyam bor, sen-chi? 🔋",
  "Zerikkanmisan? Keyingi savolga o'tavermaysanmi? 😏",
];

const CELEBRATE_LINES = [
  "Zo'r! Aynan shunday! 🎉",
  "Ha! Sen bosh musan! 🌟",
  "Bunga qoyil qoldim! 👏",
];

const COMFORT_LINES = [
  "Hechqisi yo'q, keyingisida chiqadi 💪",
  "Xato — bu o'rganishning bir qismi 🌱",
  "Yana urinib ko'r, sen uddalaysan! 🙂",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ------------------------------------------------------------
   Context — boshqa komponentlar (masalan test natijasi) shu
   orqali maskotga "xursand bo'l" yoki "yupat" deb signal beradi
   ------------------------------------------------------------ */
interface MascotContextValue {
  celebrate: () => void;
  comfort: () => void;
  say: (text: string) => void;
}

const MascotContext = createContext<MascotContextValue | null>(null);

export function useMascot() {
  const ctx = useContext(MascotContext);
  if (!ctx) {
    // Provider mavjud bo'lmasa ham ilova qulamasin — bo'sh funksiyalar
    return { celebrate: () => {}, comfort: () => {}, say: () => {} };
  }
  return ctx;
}

/* ------------------------------------------------------------
   Asosiy komponent
   ------------------------------------------------------------ */
interface AIMascotProps {
  children?: React.ReactNode;
  /** Ekranning qaysi burchagida turadi */
  corner?: 'bottom-right' | 'bottom-left';
  /** Ikkita hazil orasidagi eng kam/eng ko'p kutish vaqti (ms) */
  minIntervalMs?: number;
  maxIntervalMs?: number;
}

export function AIMascotProvider({
  children,
  corner = 'bottom-right',
  minIntervalMs = 25_000,
  maxIntervalMs = 55_000,
}: AIMascotProps) {
  const [enabled, setEnabled] = useState(true);
  const [bubble, setBubble] = useState<string | null>(null);
  const [mood, setMood] = useState<MascotMood>('idle');
  const [showSettings, setShowSettings] = useState(false);
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'false') setEnabled(false);
  }, []);

  const showBubble = useCallback((text: string, duration = 3800) => {
    setBubble(text);
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => setBubble(null), duration);
  }, []);

  /* ---------- Tashqi komponentlar chaqiradigan funksiyalar ---------- */
  const celebrate = useCallback(() => {
    if (!enabled) return;
    setMood('happy');
    showBubble(pick(CELEBRATE_LINES), 2600);
    setTimeout(() => setMood('idle'), 3000);
  }, [enabled, showBubble]);

  const comfort = useCallback(() => {
    if (!enabled) return;
    setMood('sad');
    showBubble(pick(COMFORT_LINES), 3200);
    setTimeout(() => setMood('idle'), 3400);
  }, [enabled, showBubble]);

  const say = useCallback(
    (text: string) => {
      if (!enabled) return;
      showBubble(text);
    },
    [enabled, showBubble],
  );

  /* ---------- Tasodifiy "bekorchi" hazillar ---------- */
  useEffect(() => {
    if (!enabled) return;

    const scheduleNext = () => {
      const delay =
        minIntervalMs + Math.random() * (maxIntervalMs - minIntervalMs);
      idleTimer.current = setTimeout(() => {
        showBubble(pick(IDLE_JOKES));
        scheduleNext();
      }, delay);
    };

    scheduleNext();
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [enabled, minIntervalMs, maxIntervalMs, showBubble]);

  const handleTap = () => {
    showBubble(pick(TAP_JOKES), 2600);
    setMood('wave');
    setTimeout(() => setMood('idle'), 1400);
  };

  const handlePressStart = () => {
    longPressTimer.current = setTimeout(() => setShowSettings(true), 650);
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
  };

  const cornerClass =
    corner === 'bottom-right' ? 'right-4' : 'left-4';

  const contextValue: MascotContextValue = { celebrate, comfort, say };

  return (
    <MascotContext.Provider value={contextValue}>
      {children}

      {enabled && (
        <div
          className={`fixed bottom-24 sm:bottom-6 ${cornerClass} z-40 select-none`}
        >
          {/* Gapiruvchi pufakcha */}
          {bubble && (
            <div
              className={`absolute bottom-full mb-2 ${
                corner === 'bottom-right' ? 'right-0' : 'left-0'
              } max-w-[220px] bg-surface border border-white/10 text-ink text-xs rounded-2xl rounded-br-md px-3.5 py-2.5 shadow-xl animate-[mascotPop_0.25s_ease-out]`}
            >
              {bubble}
            </div>
          )}

          {/* Sozlamalar mini-menyu (uzoq bosilganda) */}
          {showSettings && (
            <div
              className={`absolute bottom-full mb-2 ${
                corner === 'bottom-right' ? 'right-0' : 'left-0'
              } bg-surface border border-white/10 rounded-2xl shadow-xl overflow-hidden text-xs`}
            >
              <button
                type="button"
                onClick={toggleEnabled}
                className="block w-full text-left px-4 py-3 text-red-400 hover:bg-white/5 whitespace-nowrap"
              >
                🔕 Robotni o'chirish
              </button>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="block w-full text-left px-4 py-3 text-ink-muted hover:bg-white/5 whitespace-nowrap border-t border-white/5"
              >
                Bekor qilish
              </button>
            </div>
          )}

          {/* Robot */}
          <button
            type="button"
            aria-label="AI robot"
            onClick={handleTap}
            onMouseDown={handlePressStart}
            onMouseUp={handlePressEnd}
            onMouseLeave={handlePressEnd}
            onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
            className="w-16 h-16 flex items-center justify-center active:scale-90 transition-transform drop-shadow-lg"
          >
            <MascotSVG mood={mood} size={58} />
          </button>
        </div>
      )}

      <style>{`
        @keyframes mascotPop {
          from { opacity: 0; transform: translateY(4px) scale(0.92); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </MascotContext.Provider>
  );
}

export default AIMascotProvider;