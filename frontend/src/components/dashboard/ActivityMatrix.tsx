// Faollik matritsasi: har bir katak — bitta kun (Toshkent vaqti), rang — shu kuni olingan XP.
export interface ActivityDay {
  date: string; // YYYY-MM-DD
  xp: number;
  count: number;
}

interface ActivityMatrixProps {
  days: ActivityDay[];
  activeDays: number;
}

const WEEKDAYS = ['Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sha', 'Ya'];

/** 0..4 daraja: 0 — faollik yo'q */
export function activityLevel(day: Pick<ActivityDay, 'xp' | 'count'>): 0 | 1 | 2 | 3 | 4 {
  if (day.count <= 0) return 0;
  if (day.xp >= 60) return 4;
  if (day.xp >= 30) return 3;
  if (day.xp >= 10) return 2;
  return 1;
}

const LEVEL_CLASS = [
  'bg-white/[0.05]',
  'bg-gold/25',
  'bg-gold/45',
  'bg-gold/70',
  'bg-gold',
] as const;

/** 'YYYY-MM-DD' -> haftaning kuni, Dushanba = 0 */
function mondayIndex(date: string): number {
  const d = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = yakshanba
  return (d + 6) % 7;
}

export function ActivityMatrix({ days, activeDays }: ActivityMatrixProps) {
  if (days.length === 0) return null;

  // Ustunlar = haftalar. Birinchi haftani dushanbagacha bo'sh kataklar bilan to'ldiramiz.
  const lead = mondayIndex(days[0].date);
  const cells: (ActivityDay | null)[] = [...Array(lead).fill(null), ...days];
  const weeks: (ActivityDay | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <section
      className="bg-surface/20 p-4 rounded-3xl border border-white/5"
      aria-label={`Oxirgi ${days.length} kunda ${activeDays} kun faol bo'lgansiz`}
    >
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-semibold text-ink">Faollik</h2>
        <span className="text-xs text-ink-muted">
          <span className="text-gold font-semibold tabular-nums">{activeDays}</span> / {days.length} kun faol
        </span>
      </div>

      <div className="flex gap-1.5">
        <div className="flex flex-col gap-1.5 pt-0.5 text-[9px] text-ink-faint leading-none" aria-hidden="true">
          {WEEKDAYS.map((w, i) => (
            <span key={w} className="h-4 flex items-center" style={{ opacity: i % 2 === 0 ? 1 : 0 }}>
              {w}
            </span>
          ))}
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar" role="img" aria-hidden="true">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1.5">
              {Array.from({ length: 7 }, (_, di) => {
                const d = week[di] ?? null;
                if (!d) return <span key={di} className="h-4 w-4" />;
                return (
                  <span
                    key={d.date}
                    title={`${d.date}: ${d.xp} XP`}
                    className={`h-4 w-4 rounded-[3px] ${LEVEL_CLASS[activityLevel(d)]}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-1.5 mt-3 text-[10px] text-ink-faint" aria-hidden="true">
        <span>Kam</span>
        {LEVEL_CLASS.map((c) => (
          <span key={c} className={`h-2.5 w-2.5 rounded-[3px] ${c}`} />
        ))}
        <span>Ko'p</span>
      </div>
    </section>
  );
}
