import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAssistant } from '../../hooks/useAssistant';
import { safePage } from '../../lib/assistant-client';
import { haptic } from '../../lib/telegram';
import { useAuthStore } from '../../store/auth.store';
import { AssistantSheet } from './AssistantSheet';

/* ============================================================
   AssistantLauncher — o'qituvchi va admin uchun suzuvchi tugma.
   Komponent marshrutlar tashqarisida turadi, shuning uchun sahifalar
   orasida o'tganda suhbat saqlanadi. Joriy sahifa yo'li modelga
   kontekst sifatida yuboriladi ("shu test", "bu guruh").
   ============================================================ */
export function AssistantLauncher() {
  const { pathname } = useLocation();
  const role = useAuthStore((s) => s.user?.role);
  const [open, setOpen] = useState(false);
  const assistant = useAssistant({ page: safePage(pathname) });

  return (
    <>
      <button
        type="button"
        aria-label={
          assistant.pendingCount > 0
            ? `AI yordamchini ochish. Tasdiq kutayotgan amallar: ${assistant.pendingCount}`
            : 'AI yordamchini ochish'
        }
        onClick={() => {
          haptic('light');
          setOpen(true);
        }}
        className="fixed right-4 bottom-24 z-40 w-14 h-14 rounded-full bg-gold text-base shadow-lg shadow-black/30 flex items-center justify-center active:scale-95 transition-transform"
      >
        <span className="text-2xl leading-none" aria-hidden="true">
          ✨
        </span>
        {assistant.pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-coral text-white text-[11px] font-bold flex items-center justify-center">
            {assistant.pendingCount}
          </span>
        )}
      </button>

      <AssistantSheet isOpen={open} onClose={() => setOpen(false)} role={role} assistant={assistant} />
    </>
  );
}
