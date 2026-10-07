import { ChevronLeft, ChevronRight } from 'lucide-react';
import { currentMonth, monthLabel, shiftMonth } from '../../hooks/usePayments';

const MAX_BACK = 24;

/** Oy tanlagich: ‹ Oktabr 2026 › (kelajakka va 24 oydan eskiga o'tkazmaydi). */
export function MonthSwitcher({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const cur = currentMonth();
  const canNext = month < cur;
  const canPrev = month > shiftMonth(cur, -MAX_BACK);
  const btn = 'flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-ink-muted transition hover:text-ink active:scale-95 disabled:opacity-30';
  return (
    <div className="inline-flex items-center gap-2">
      <button type="button" className={btn} onClick={() => onChange(shiftMonth(month, -1))} disabled={!canPrev} aria-label="Oldingi oy">
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
      </button>
      <span className="min-w-[120px] text-center text-sm font-semibold text-ink tabular-nums">{monthLabel(month)}</span>
      <button type="button" className={btn} onClick={() => onChange(shiftMonth(month, 1))} disabled={!canNext} aria-label="Keyingi oy">
        <ChevronRight className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}
