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
   AI MASCOT — Professional AI Yordamchi Ko'rinishi
   ============================================================ */

const STORAGE_KEY = 'ai-mascot-enabled';

const IDLE_JOKES = [
  "Salom! Bugun qaysi mavzuni muhokama qilamiz? 🤖",
  "Yangi bilimlarni o'rganishga tayyormisiz? 🚀",
  "Savolingiz bo'lsa, ustimga bosing — yordam beraman! 💡",
  "Kichik tanaffusdan keyin yana davom etamiz 😉",
  "Har kuni 1% oldinga intilamiz! 📈",
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

  const handleTap = () => {
    if (wasLongPress.current) {
      wasLongPress.current = false;
      return;
    }
    setMood('wave');
    setTimeout(() => setMood((m) => (m === 'wave' ? 'idle' : m)), 1000);
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

      {enabled && (
        <div
          className={`fixed bottom-24 sm:bottom-6 ${cornerClass} z-40 select-none flex flex-col items-end`}
        >
          {/* Professional Chat Bubble */}
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

          {/* Settings Menu Popup */}
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

          {/* Mascot Trigger Button */}
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

      <AITutorChat
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