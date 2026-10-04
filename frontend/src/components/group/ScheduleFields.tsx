import { WEEKDAYS } from '../../hooks/useSchedule';

export interface ScheduleValue {
  days: number[];
  start: string;
  end: string;
  room: string;
}

const inputCls =
  'w-full bg-surface/40 border border-white/5 rounded-xl px-3.5 py-2.5 text-sm text-ink outline-none focus:border-gold/50 min-h-[44px] placeholder:text-ink-muted';

/** Dars kunlari (chiplar), boshlanish/tugash vaqti va xona — boshqariladigan (controlled) maydonlar. */
export function ScheduleFields({ value, onChange }: { value: ScheduleValue; onChange: (v: ScheduleValue) => void }) {
  const toggle = (n: number) =>
    onChange({ ...value, days: value.days.includes(n) ? value.days.filter((d) => d !== n) : [...value.days, n].sort((a, b) => a - b) });

  return (
    <fieldset className="space-y-3">
      <legend className="text-xs text-ink-muted mb-1">Dars kunlari</legend>
      <div className="grid grid-cols-7 gap-1.5" role="group" aria-label="Dars kunlari">
        {WEEKDAYS.map((d) => {
          const on = value.days.includes(d.n);
          return (
            <button
              key={d.n}
              type="button"
              title={d.full}
              aria-pressed={on}
              onClick={() => toggle(d.n)}
              className={`min-h-[40px] rounded-xl px-0 text-xs font-semibold transition ${
                on ? 'bg-gold text-base' : 'bg-white/5 text-ink-muted hover:bg-white/10'
              }`}
            >
              {d.short}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs text-ink-muted space-y-1">
          Boshlanishi
          <input type="time" value={value.start} onChange={(e) => onChange({ ...value, start: e.target.value })} className={inputCls} />
        </label>
        <label className="block text-xs text-ink-muted space-y-1">
          Tugashi
          <input type="time" value={value.end} onChange={(e) => onChange({ ...value, end: e.target.value })} className={inputCls} />
        </label>
      </div>
      <label className="block text-xs text-ink-muted space-y-1">
        Xona (ixtiyoriy)
        <input
          value={value.room}
          maxLength={60}
          onChange={(e) => onChange({ ...value, room: e.target.value })}
          placeholder="Masalan, 3-xona"
          className={inputCls}
        />
      </label>
    </fieldset>
  );
}

/** Formadagi qiymatni tekshiradi; xato matni yoki null qaytaradi. */
export function validateSchedule(v: ScheduleValue): string | null {
  if (v.end && !v.start) return "Tugash vaqti uchun avval boshlanish vaqtini kiriting";
  if (v.start && v.end && v.end <= v.start) return "Tugash vaqti boshlanishdan keyin bo'lsin";
  if (v.days.length > 0 && !v.start) return "Dars kunlarini belgilagan bo'lsangiz, boshlanish vaqtini ham kiriting";
  return null;
}

/** Serverga yuboriladigan ko'rinish */
export function scheduleBody(v: ScheduleValue) {
  return {
    lessonDays: v.days,
    lessonStartTime: v.start || null,
    lessonEndTime: v.end || null,
    room: v.room.trim() || null,
  };
}

export function toScheduleValue(s: { lessonDays?: number[] | null; lessonStartTime?: string | null; lessonEndTime?: string | null; room?: string | null }): ScheduleValue {
  return { days: s.lessonDays ?? [], start: s.lessonStartTime ?? '', end: s.lessonEndTime ?? '', room: s.room ?? '' };
}
