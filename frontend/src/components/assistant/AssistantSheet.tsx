import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AIGenerateModal } from '../ai/AIGenerateModal';
import type { AssistantApi } from '../../hooks/useAssistant';
import { haptic } from '../../lib/telegram';
import type { AssistantMessage, Part } from './assistant-state';
import { ConfirmationCard } from './ConfirmationCard';
import { RichText } from './RichText';

/* ============================================================
   AssistantSheet — AI yordamchi chat oynasi (AIGenerateModal qobig'ida).
   Holat tashqarida (useAssistant) saqlanadi: oyna yopilsa ham suhbat qoladi.
   ============================================================ */

const SUBTITLE: Record<string, string> = {
  STUDENT: "Natijalaring va progressing bo'yicha murabbiy",
  TEACHER: 'Guruh va testlar tahlili, amallar',
  ADMIN: 'Platforma tahlili va amallar',
};

const GREETING: Record<string, string> = {
  STUDENT: "Salom! Men sening shaxsiy murabbiyingman: natijalaringni tahlil qilaman va nimani takrorlash kerakligini aytaman.",
  TEACHER: "Salom! Guruhlaringiz va testlaringizni tahlil qilishda yordam beraman. Test biriktirish yoki e'lon qilishni ham taklif qila olaman (tasdiqlaganingizdan keyin bajariladi).",
  ADMIN: "Salom! Platforma ko'rsatkichlari va o'quvchilar bo'yicha tahlil qilaman. Ball o'zgartirish, bloklash kabi amallarni taklif qilaman, lekin faqat siz tasdiqlaganingizdan keyin bajariladi.",
};

export const SUGGESTIONS: Record<string, string[]> = {
  STUDENT: ['Qanday ketyapman?', 'Qaysi mavzularda zaifman?', 'Qanday testlarim bor?', 'Reytingda nechanchiman?'],
  TEACHER: ['Qaysi o\'quvchilarga yordam kerak?', 'Mening testlarim', 'Guruhlarim holati'],
  ADMIN: ['Platforma ko\'rsatkichlari', 'Faol o\'quvchilar kimlar?', 'Mening testlarim'],
};

export function roleKey(role: string | undefined): 'STUDENT' | 'TEACHER' | 'ADMIN' {
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') return 'ADMIN';
  if (role === 'TEACHER') return 'TEACHER';
  return 'STUDENT';
}

function ToolChip({ part }: { part: Extract<Part, { kind: 'tool' }> }) {
  const icon =
    part.status === 'running' ? (
      <span className="w-3 h-3 border-2 border-ink-faint border-t-gold rounded-full animate-spin motion-reduce:animate-none" />
    ) : part.status === 'ok' ? (
      <span className="text-teal">✓</span>
    ) : (
      <span className="text-coral">✕</span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-muted bg-white/5 rounded-full px-2.5 py-1">
      {icon}
      {part.label}
      {part.status === 'running' ? '…' : ''}
    </span>
  );
}

function Bubble({
  message,
  api,
  isLast,
}: {
  message: AssistantMessage;
  api: AssistantApi;
  isLast: boolean;
}) {
  if (message.role === 'user') {
    const text = message.parts.map((p) => (p.kind === 'text' ? p.text : '')).join('');
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-3xl rounded-br-lg bg-gold text-base px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words">
          {text}
        </div>
      </div>
    );
  }

  const empty = message.parts.length === 0;
  if (empty && !message.streaming && !message.error) return null;

  return (
    <div className="flex justify-start">
      <div className="max-w-[92%] min-w-0 space-y-2">
        {message.parts.map((p, i) => {
          switch (p.kind) {
            case 'text':
              return (
                <div key={i} className="rounded-3xl rounded-bl-lg bg-surface/60 border border-white/10 text-ink px-4 py-2.5 text-sm leading-relaxed">
                  <RichText text={p.text} />
                </div>
              );
            case 'tool':
              return (
                <div key={i}>
                  <ToolChip part={p} />
                </div>
              );
            case 'card':
              return (
                <ConfirmationCard
                  key={p.card.id}
                  card={p.card}
                  status={p.status}
                  message={p.message}
                  onConfirm={() => void api.confirm(p.card.id)}
                  onCancel={() => void api.cancel(p.card.id)}
                />
              );
            case 'notice':
              return (
                <p key={i} className="text-xs text-ink-muted italic px-1">
                  {p.text}
                </p>
              );
          }
        })}

        {message.streaming && (
          <span className="inline-flex gap-1 py-1 px-1" aria-label="Javob yozilmoqda">
            {[0, 150, 300].map((d) => (
              <span
                key={d}
                className="w-1.5 h-1.5 bg-ink-muted rounded-full animate-bounce motion-reduce:animate-none"
                style={{ animationDelay: `${d}ms` }}
              />
            ))}
          </span>
        )}

        {message.error && (
          <div role="alert" className="rounded-2xl border border-coral/30 bg-coral/10 px-3.5 py-2.5 text-xs text-ink">
            <p>{message.error}</p>
            {isLast && !api.busy && (
              <button type="button" onClick={api.retry} className="mt-1.5 font-semibold text-coral underline underline-offset-2">
                Qayta urinish
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  role: string | undefined;
  assistant: AssistantApi;
  /** Masalan, o'quvchida "Repetitor | Murabbiy" bo'limlari */
  headerSlot?: ReactNode;
  /** Berilsa — yozish o'chiriladi va sabab ko'rsatiladi (masalan, test paytida) */
  disabledReason?: string;
}

export function AssistantSheet({ isOpen, onClose, role, assistant, headerSlot, disabledReason }: Props) {
  const key = roleKey(role);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const { messages, busy, send, stop, reset, restorePending } = assistant;

  // Ochilganda: tasdiq kutayotgan kartochkalarni tiklash
  useEffect(() => {
    if (isOpen && !disabledReason) void restorePending();
  }, [isOpen, disabledReason, restorePending]);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
  }, [messages, isOpen]);

  const submit = (text: string) => {
    if (!text.trim() || busy || disabledReason) return;
    haptic('light');
    send(text);
    setInput('');
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit(input);
    }
  };

  const lastId = messages[messages.length - 1]?.id;

  return (
    <AIGenerateModal
      isOpen={isOpen}
      onClose={onClose}
      title="AI Yordamchi"
      icon="✨"
      subtitle={SUBTITLE[key]}
      headerSlot={headerSlot}
      footer={
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={disabledReason ? 'Hozir foydalanib bo\'lmaydi' : 'Savol yoki buyruq yozing...'}
            aria-label="Yordamchiga xabar"
            rows={1}
            maxLength={2000}
            disabled={!!disabledReason}
            className="flex-1 bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink placeholder:text-ink-muted resize-none max-h-[100px] disabled:opacity-50"
          />
          {busy ? (
            <button
              type="button"
              onClick={stop}
              aria-label="To'xtatish"
              className="shrink-0 w-11 h-11 rounded-2xl bg-white/10 text-ink flex items-center justify-center active:scale-95 transition"
            >
              <span className="w-3.5 h-3.5 rounded-[3px] bg-ink" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => submit(input)}
              disabled={!input.trim() || !!disabledReason}
              aria-label="Yuborish"
              className="shrink-0 w-11 h-11 rounded-2xl bg-gold text-base flex items-center justify-center active:scale-95 transition disabled:opacity-40"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
                <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
              </svg>
            </button>
          )}
        </div>
      }
    >
      {disabledReason && (
        <div role="status" className="mb-3 rounded-2xl border border-gold/30 bg-gold/10 px-3.5 py-2.5 text-xs text-ink">
          {disabledReason}
        </div>
      )}

      {messages.length === 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-ink-muted leading-relaxed">{GREETING[key]}</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS[key].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => submit(s)}
                disabled={!!disabledReason}
                className="text-xs text-ink bg-surface border border-white/10 rounded-full px-3.5 py-2 active:scale-95 transition disabled:opacity-40"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3" aria-live="polite">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={reset}
              disabled={busy}
              className="text-[11px] text-ink-faint hover:text-ink-muted disabled:opacity-40"
            >
              Suhbatni tozalash
            </button>
          </div>
          {messages.map((m) => (
            <Bubble key={m.id} message={m} api={assistant} isLast={m.id === lastId} />
          ))}
        </div>
      )}
      <div ref={endRef} />
    </AIGenerateModal>
  );
}
