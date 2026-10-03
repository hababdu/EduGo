interface CapacityBarProps {
  count: number;
  max?: number | null;
  className?: string;
}

/** Guruh to'liqligi: sig'im belgilanmagan bo'lsa faqat a'zolar soni ko'rsatiladi. */
export function CapacityBar({ count, max, className = '' }: CapacityBarProps) {
  if (!max || max <= 0) {
    return <span className={`text-xs text-ink-muted tabular-nums ${className}`}>{count} ta a'zo</span>;
  }
  const pct = Math.min(100, Math.round((count / max) * 100));
  const full = count >= max;
  const tone = full ? 'bg-coral' : pct >= 80 ? 'bg-gold' : 'bg-teal';
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between text-xs mb-1">
        <span className="text-ink-muted">Sig'im</span>
        <span className={`tabular-nums font-semibold ${full ? 'text-coral' : 'text-ink'}`}>
          {count} / {max}
          {full && <span className="ml-1 font-normal">· to'lgan</span>}
        </span>
      </div>
      <div
        className="h-1.5 rounded-full bg-white/10 overflow-hidden"
        role="progressbar"
        aria-valuenow={count}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label="Guruh to'liqligi"
      >
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
