import { LucideIcon } from 'lucide-react';

type Accent = 'gold' | 'teal' | 'coral' | 'sky';
const ICON_CLS: Record<Accent, string> = {
  gold: 'bg-gold/10 text-gold',
  teal: 'bg-teal/10 text-teal',
  coral: 'bg-coral/10 text-coral',
  sky: 'bg-sky/10 text-sky',
};
const VALUE_CLS: Record<Accent, string> = { gold: 'text-gold', teal: 'text-teal', coral: 'text-coral', sky: 'text-sky' };

interface Props {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: Accent;
  /** Qiymat ostidagi kichik izoh */
  hint?: string;
  onClick?: () => void;
}

/** Ko'rsatkich kartasi: ikonli chip, katta raqam, izoh. */
export function KpiCard({ label, value, icon: Icon, accent = 'gold', hint, onClick }: Props) {
  const Wrapper: any = onClick ? 'button' : 'div';
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-surface/50 p-4 text-left ${
        onClick ? 'transition hover:border-white/20 hover:bg-surface/70 active:scale-[0.98]' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-semibold text-ink-muted leading-tight">{label}</span>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${ICON_CLS[accent]}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <div
        className={`mt-2 font-display font-bold tabular-nums ${
          String(value).length > 8 ? 'text-lg sm:text-2xl' : 'text-2xl sm:text-3xl'
        } ${VALUE_CLS[accent]}`}
      >
        {value}
      </div>
      {hint && <div className="mt-0.5 text-[11px] text-ink-muted">{hint}</div>}
    </Wrapper>
  );
}
