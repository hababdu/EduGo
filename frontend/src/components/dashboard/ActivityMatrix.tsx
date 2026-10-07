import { useMemo, useState } from 'react';

// Faollik kalendari: bir oy, har bir katakda kun raqami; rang — shu kuni olingan XP (Toshkent vaqti).
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
const MONTHS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
  'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr',
];

/** 0..4 daraja: 0 — faollik yo'q */
export function activityLevel(day: Pick<ActivityDay, 'xp' | 'count'>): 0 | 1 | 2 | 3 | 4 {
  if (day.count <= 0) return 0;
  if (day.xp >= 60) return 4;
  if (day.xp >= 30) return 3;
  if (day.xp >= 10) return 2;
  return 1;
}

const LEVEL_CLASS = [
  'bg-white/[0.05] text-ink-muted',
  'bg-gold/25 text-ink',
  'bg-gold/45 text-ink',
  'bg-gold/70 text-base font-bold',
  'bg-gold text-base font-bold',
] as const;

/** 'YYYY-MM-DD' -> haftaning kuni, Dushanba = 0 */
function mondayIndex(date: string): number {
  const d = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = yakshanba
  return (d + 6) % 7;
}

const pad = (n: number) => String(n).padStart(2, '0');
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // m: 1..12

export function ActivityMatrix({ days }: ActivityMatrixProps) {
  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);
  const first = days[0]?.date;
  const last = days[days.length - 1]?.date; // oxirgi kun = bugun (Toshkent)

  const [month, setMonth] = useState<string>(() => (last ?? '').slice(0, 7)); // 'YYYY-MM'
  const [picked, setPicked] = useState<string | null>(null);

  if (days.length === 0 || !first || !last) return null;

  const [y, m] = month.split('-').map(Number);
  const firstKey = first.slice(0, 7);
  const lastKey = last.slice(0, 7);
  const canPrev = month > firstKey;
  const canNext = month < lastKey;

  const shift = (delta: number) => {
    const total = y * 12 + (m - 1) + delta;
    setMonth(`${Math.floor(total / 12)}-${pad((total % 12) + 1)}`);
    setPicked(null);
  };

  const total = daysInMonth(y, m);
  const lead = mondayIndex(`${month}-01`);
  const cells: (string | null)[] = [
    ...Array(lead).fill(null),
    ...Array.from({ length: total }, (_, i) => `${month}-${pad(i + 1)}`),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  // Tanlangan oy bo'yicha statistika
  const monthDays = days.filter((d) => d.date.startsWith(month));
  const activeInMonth = monthDays.filter((d) => d.count > 0).length;
  const xpInMonth = monthDays.reduce((s, d) => s + d.xp, 0);
  const pickedDay = picked ? byDate.get(picked) : undefined;

  return (
    <section
      className="bg-surface/40 p-4 rounded-3xl border border-white/10"
      aria-label={`${MONTHS[m - 1]} ${y}: ${activeInMonth} kun faol`}
    >
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => shift(-1)}
          disabled={!canPrev}
          aria-label="Oldingi oy"
          className="h-8 w-8 rounded-xl bg-white/5 text-ink-muted disabled:opacity-25 active:scale-95 transition"
        >
          ‹
        </button>
        <div className="text-center">
          <h2 className="text-sm font-bold text-ink">
            {MONTHS[m - 1]} {y}
          </h2>
          <p className="text-[11px] text-ink-muted">
            <span className="text-gold font-semibold tabular-nums">{activeInMonth}</span> kun faol ·{' '}
            <span className="tabular-nums">{xpInMonth}</span> XP
          </p>
        </div>
        <button
          type="button"
          onClick={() => shift(1)}
          disabled={!canNext}
          aria-label="Keyingi oy"
          className="h-8 w-8 rounded-xl bg-white/5 text-ink-muted disabled:opacity-25 active:scale-95 transition"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 mb-1.5" aria-hidden="true">
        {WEEKDAYS.map((w) => (
          <span key={w} className="text-center text-[10px] font-semibold text-ink-faint">
            {w}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((date, i) => {
          if (!date) return <span key={`e${i}`} className="aspect-square" />;
          const d = byDate.get(date);
          const inRange = date >= first && date <= last;
          const level = d ? activityLevel(d) : 0;
          const isToday = date === last;
          const isPicked = date === picked;
          const dayNum = Number(date.slice(8));
          return (
            <button
              key={date}
              type="button"
              disabled={!inRange}
              onClick={() => setPicked(isPicked ? null : date)}
              aria-label={`${dayNum}-${MONTHS[m - 1]}: ${d?.xp ?? 0} XP`}
              aria-pressed={isPicked}
              className={`aspect-square rounded-xl flex items-center justify-center text-xs tabular-nums transition ${
                inRange ? LEVEL_CLASS[level] : 'bg-transparent text-ink-faint/40'
              } ${isToday ? 'ring-2 ring-teal' : ''} ${isPicked ? 'ring-2 ring-white' : ''}`}
            >
              {dayNum}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-[11px]">
        <p className="min-h-[1.25rem] text-ink-muted">
          {picked ? (
            <>
              <span className="text-ink font-semibold">{Number(picked.slice(8))}-{MONTHS[m - 1].toLowerCase()}</span>
              {': '}
              {pickedDay && pickedDay.count > 0 ? (
                <>
                  <span className="text-gold font-semibold">{pickedDay.xp} XP</span> · {pickedDay.count} ta amal
                </>
              ) : (
                'faollik yo\'q'
              )}
            </>
          ) : (
            "Kunni bosing — XP ko'rinadi"
          )}
        </p>
        <div className="flex items-center gap-1 text-ink-faint shrink-0" aria-hidden="true">
          <span>Kam</span>
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} className={`h-2.5 w-2.5 rounded-[3px] ${LEVEL_CLASS[l].split(' ')[0]}`} />
          ))}
          <span>Ko'p</span>
        </div>
      </div>
    </section>
  );
}
