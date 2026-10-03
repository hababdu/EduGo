import { useEffect, useState } from 'react';
import type { ActionCard } from '../../lib/assistant-client';
import { haptic } from '../../lib/telegram';
import type { CardStatus } from './assistant-state';

/* ============================================================
   ConfirmationCard — yozuvchi amalni tasdiqlash kartochkasi.
   Matn SERVERdan keladi (model yozmagan), shuning uchun nima
   bajarilishi aniq va yashirib bo'lmaydi.
   - XAVFLI amal (ball, bloklash): ikki bosqichli tasdiq
   - 10 daqiqalik muddat hisoblagichi; tugagach tugmalar o'chadi
   ============================================================ */

interface Props {
  card: ActionCard;
  status: CardStatus;
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ARM_MS = 5000;
const pad = (n: number) => String(n).padStart(2, '0');

export function formatRemaining(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
}

export function ConfirmationCard({ card, status, message, onConfirm, onCancel }: Props) {
  const high = card.risk === 'HIGH';
  const [armed, setArmed] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const active = status === 'idle';

  // Muddat hisoblagichi faqat tasdiq kutilayotganda ishlaydi
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);

  // "Aniq bajar" holati bir necha soniyadan keyin o'zi qaytadi (tasodifiy bosishdan himoya)
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), ARM_MS);
    return () => clearTimeout(t);
  }, [armed]);

  const remaining = new Date(card.expiresAt).getTime() - now;
  const eff: CardStatus = active && remaining <= 0 ? 'expired' : status;

  const tone = high
    ? { box: 'border-coral/40 bg-coral/10', badge: 'text-coral', btn: 'bg-coral text-white' }
    : { box: 'border-gold/30 bg-gold/10', badge: 'text-gold', btn: 'bg-gold text-base' };

  const handleConfirm = () => {
    if (high && !armed) {
      haptic('medium');
      setArmed(true);
      return;
    }
    setArmed(false);
    onConfirm();
  };

  return (
    <div role="group" aria-label={`Tasdiqlash: ${card.summary}`} className={`rounded-2xl border p-3.5 ${tone.box}`}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className={`text-[11px] font-semibold uppercase tracking-wide ${tone.badge}`}>
          {high ? '⚠️ Xavfli amal' : '📝 Tasdiq kerak'}
        </span>
        {eff === 'idle' && (
          <span className="text-[11px] text-ink-muted tabular-nums" aria-label="Qolgan vaqt">
            {formatRemaining(remaining)}
          </span>
        )}
      </div>

      <p className="text-sm font-semibold text-ink leading-snug">{card.summary}</p>

      {card.details.length > 0 && (
        <dl className="mt-2.5 space-y-1">
          {card.details.map((d, i) => (
            <div key={i} className="flex gap-2 text-xs">
              <dt className="w-[38%] shrink-0 text-ink-muted">{d.label}</dt>
              <dd className="text-ink break-words min-w-0">{d.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-3" aria-live="polite">
        {eff === 'idle' && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleConfirm}
              className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold active:scale-95 transition ${tone.btn}`}
            >
              {high && armed ? 'Ha, aniq bajar' : 'Tasdiqlash'}
            </button>
            <button
              type="button"
              onClick={() => {
                setArmed(false);
                onCancel();
              }}
              className="rounded-xl px-4 py-2.5 text-sm font-medium bg-white/5 text-ink-muted active:scale-95 transition"
            >
              Bekor qilish
            </button>
          </div>
        )}
        {eff === 'working' && (
          <p className="flex items-center gap-2 text-xs text-ink-muted">
            <span className="w-3.5 h-3.5 border-2 border-ink-faint border-t-gold rounded-full animate-spin motion-reduce:animate-none" />
            Bajarilmoqda…
          </p>
        )}
        {eff === 'executed' && <p className="text-xs font-medium text-teal">✓ {message || 'Bajarildi'}</p>}
        {eff === 'failed' && <p className="text-xs font-medium text-coral">✕ {message || 'Bajarilmadi'}</p>}
        {eff === 'cancelled' && <p className="text-xs text-ink-muted">Bekor qilindi</p>}
        {eff === 'expired' && <p className="text-xs text-ink-muted">Muddati tugagan. Amalni qaytadan so'rang.</p>}
        {eff === 'idle' && message && <p className="mt-2 text-xs text-coral">{message}</p>}
      </div>
    </div>
  );
}
