import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import { MascotSVG, type MascotMood } from './MascotSVG';
import { AITutorChat } from '../ai/AITutorChat';

/* ============================================================
   AI MASCOT — endi shunchaki dekorativ emas, haqiqiy AI
   yordamchining "yuzi". Bosilsa — haqiqiy repetitor-chat ochiladi.
   Real hodisalarga (test natijasi, streak, faollik) qarab AI o'zi
   nima deyishni — hazil, maqtov yoki jiddiy tanbeh — hal qiladi.
   ============================================================ */

const STORAGE_KEY = 'ai-mascot-enabled';

// Faqat bekorchi vaqtda ko'rsatiladigan, hech qanday API chaqirmaydigan
// arzon "jonlanish" hazillari — asosiy fikr-mulohaza har doim AI'dan keladi.
const IDLE_JOKES = [
  "Bugun ham bilim ovlaymizmi? 🎣",
  "Miya mashqi vaqti keldimi? 🧠",
  "Savolingiz bo'lsa — meni bosing, jonli gaplashamiz 🤖",
  "5 daqiqa dam ol, keyin davom et 😉",
  "Bugungi maqsad: kamida 1% yaxshiroq bo'lish 🚀",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ------------------------------------------------------------
   Context — boshqa komponentlar shu orqali maskotga signal beradi:
   celebrate/comfort — tezkor, statik reaksiya (AI javobini kutmasdan)
   speak — AI (yoki boshqa joy) generatsiya qilgan haqiqiy gapni aytadi
   openChat — haqiqiy repetitor-chatni ochadi, kontekst bilan
   ------------------------------------------------------------ */
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
    // Provider mavjud bo'lmasa ham ilova qulamasin — bo'sh funksiyalar
    return {
      celebrate: () => {},
      comfort: () => {},
      speak: () => {},
      openChat: () => {},
    };
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
  /** Ikkita bekorchi hazil orasidagi eng kam/eng ko'p kutish vaqti (ms) */
  minIntervalMs?: number;
  maxIntervalMs?: number;
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
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasLongPress = useRef(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'false') setEnabled(false);
  }, []);

  const showBubble = useCallback((text: string, duration = 4200) => {
    setBubble(text);
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => setBubble(null), duration);
  }, []);

  /* ---------- Tashqi komponentlar chaqiradigan funksiyalar ---------- */
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

  /* ---------- Bekorchi vaqtdagi arzon hazillar (API chaqirmaydi) ---------- */
  useEffect(() => {
    if (!enabled) return;

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
  }, [enabled, minIntervalMs, maxIntervalMs, showBubble, chatOpen]);

  /* ---------- Bosish = haqiqiy AI yordamchi bilan gaplashish ---------- */
  const handleTap = () => {
    if (wasLongPress.current) {
      wasLongPress.current = false;
      return;
    }
    setMood('wave');
    setTimeout(() => setMood((m) => (m === 'wave' ? 'idle' : m)), 900);
    openChat();
  };

  const handlePressStart = () => {
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
  };

  const cornerClass = corner === 'bottom-right' ? 'right-4' : 'left-4';

  const contextValue: MascotContextValue = {
    celebrate,
    comfort,
    speak,
    openChat,
  };

  return (
    <MascotContext.Provider value={contextValue}>
      {children}

      {enabled && (
        <div
          className={`fixed bottom-24 sm:bottom-6 ${cornerClass} z-40 select-none`}
        >
          {/* Gapiruvchi pufakcha — AI'ning haqiqiy fikr-mulohazasi shu yerda chiqadi */}
          {bubble && !chatOpen && (
            <button
              type="button"
              onClick={() => openChat()}
              className={`absolute bottom-full mb-2 ${
                corner === 'bottom-right' ? 'right-0' : 'left-0'
              } max-w-[230px] text-left bg-surface border border-white/10 text-ink text-xs rounded-2xl rounded-br-md px-3.5 py-2.5 shadow-xl animate-[mascotPop_0.25s_ease-out]`}
            >
              {bubble}
            </button>
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

          {/* Robot — bosilsa haqiqiy AI chat ochiladi */}
          <button
            type="button"
            aria-label="AI yordamchi bilan gaplashish"
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

      <AITutorChat
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        studentName={chatContext.studentName}
        weakTopics={chatContext.weakTopics}
      />

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