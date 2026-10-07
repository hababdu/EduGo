interface Props {
  data: { label: string; value: number; title?: string }[];
  color?: 'gold' | 'teal' | 'sky';
  height?: string;
}
const BAR = { gold: 'bg-gold/70 hover:bg-gold', teal: 'bg-teal/70 hover:bg-teal', sky: 'bg-sky/70 hover:bg-sky' };

/** Ustunli mini diagramma (kutubxonasiz). */
export function MiniBars({ data, color = 'teal', height = 'h-28' }: Props) {
  const max = Math.max(...data.map((d) => d.value), 1);
  if (data.length === 0) return <p className="py-8 text-center text-xs text-ink-muted">Ma'lumot yo'q</p>;
  return (
    <div className={`flex items-end gap-2 ${height}`}>
      {data.map((d, i) => (
        <div key={`${d.label}-${i}`} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
          <span className="text-[10px] font-semibold text-ink-muted tabular-nums">{d.value > 0 ? d.value : ''}</span>
          <div
            className={`w-full rounded-t-md transition-colors ${BAR[color]}`}
            style={{ height: `${Math.max(6, (d.value / max) * 78)}%` }}
            title={d.title ?? `${d.label}: ${d.value}`}
          />
          <span className="text-[10px] text-ink-faint">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
