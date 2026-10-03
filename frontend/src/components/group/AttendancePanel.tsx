import { useEffect, useMemo, useState } from 'react';
import { Check, X, Clock3 } from 'lucide-react';
import {
  AttendanceStatus,
  shiftDate,
  tashkentToday,
  useAttendanceDay,
  useAttendanceSummary,
  useMarkAttendance,
} from '../../hooks/useAttendance';

const OPTIONS: { value: AttendanceStatus; label: string; Icon: typeof Check; on: string }[] = [
  { value: 'PRESENT', label: 'Keldi', Icon: Check, on: 'bg-teal text-base' },
  { value: 'ABSENT', label: 'Kelmadi', Icon: X, on: 'bg-coral text-base' },
  { value: 'EXCUSED', label: 'Sababli', Icon: Clock3, on: 'bg-gold text-base' },
];

const MAX_BACK_DAYS = 90;

export function AttendancePanel({ groupId }: { groupId: string }) {
  const today = tashkentToday();
  const [date, setDate] = useState(today);
  const [edits, setEdits] = useState<Record<string, AttendanceStatus>>({});
  const [saved, setSaved] = useState(false);

  const { data, isLoading, error } = useAttendanceDay(groupId, date);
  const { data: summary } = useAttendanceSummary(groupId, 30);
  const mark = useMarkAttendance(groupId);

  // Kun almashganda yoki server ma'lumoti kelganda — tahrirlarni serverdagi holatga tenglashtiramiz
  useEffect(() => {
    if (!data) return;
    const next: Record<string, AttendanceStatus> = {};
    for (const s of data.students) if (s.status) next[s.studentId] = s.status;
    setEdits(next);
    setSaved(false);
  }, [data]);

  const percentById = useMemo(
    () => new Map((summary?.students ?? []).map((s) => [s.studentId, s.percent])),
    [summary],
  );

  const students = data?.students ?? [];
  const dirty = students.some((s) => (edits[s.studentId] ?? null) !== s.status);
  const markedNow = Object.keys(edits).length;

  const setStatus = (id: string, st: AttendanceStatus) => {
    setSaved(false);
    setEdits((e) => ({ ...e, [id]: st }));
  };
  const markAllPresent = () => {
    setSaved(false);
    setEdits(Object.fromEntries(students.map((s) => [s.studentId, 'PRESENT' as AttendanceStatus])));
  };
  const save = () => {
    const records = students
      .filter((s) => edits[s.studentId])
      .map((s) => ({ studentId: s.studentId, status: edits[s.studentId] }));
    if (records.length === 0) return;
    mark.mutate({ date, records }, { onSuccess: () => setSaved(true) });
  };

  return (
    <section className="space-y-3" aria-label="Davomat">
      <div className="flex items-end justify-between gap-3">
        <label className="flex flex-col gap-1 text-[11px] font-semibold text-ink-muted uppercase tracking-wide">
          Sana
          <input
            type="date"
            value={date}
            min={shiftDate(today, -MAX_BACK_DAYS)}
            max={today}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="bg-surface/40 border border-white/5 rounded-xl px-3 py-2 text-sm text-ink normal-case tracking-normal outline-none focus:border-gold/50 min-h-[44px]"
          />
        </label>
        {summary?.overallPercent != null && (
          <div className="text-right">
            <p className="text-[10px] text-ink-muted uppercase tracking-wide">30 kunlik o'rtacha</p>
            <p className="font-display text-xl text-teal tabular-nums">{summary.overallPercent}%</p>
          </div>
        )}
      </div>

      {isLoading && <div className="h-40 rounded-2xl bg-surface/30 animate-pulse border border-white/5" />}

      {error && (
        <p className="text-sm text-coral bg-coral/10 border border-coral/20 rounded-2xl p-3">
          {(error as Error).message || "Davomatni yuklab bo'lmadi"}
        </p>
      )}

      {data && students.length === 0 && (
        <p className="text-sm text-ink-muted text-center py-8 bg-surface/20 border border-white/5 rounded-2xl">
          Guruhda hali o'quvchi yo'q
        </p>
      )}

      {students.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-muted tabular-nums">
              Belgilangan: {markedNow} / {students.length}
            </span>
            <button
              type="button"
              onClick={markAllPresent}
              className="text-xs font-semibold text-teal bg-teal/10 border border-teal/20 rounded-xl px-3 py-1.5 active:scale-95 transition"
            >
              Hammasi keldi
            </button>
          </div>

          <ul className="bg-surface/20 border border-white/5 rounded-2xl divide-y divide-white/5 overflow-hidden">
            {students.map((s) => {
              const name = `${s.firstName} ${s.lastName ?? ''}`.trim() || s.username || "Noma'lum";
              const cur = edits[s.studentId];
              const pct = percentById.get(s.studentId);
              return (
                <li key={s.studentId} className="p-3 space-y-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-ink truncate">{name}</span>
                    {pct != null && <span className="text-[11px] text-ink-muted tabular-nums shrink-0">{pct}%</span>}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5" role="group" aria-label={`${name} davomati`}>
                    {OPTIONS.map(({ value, label, Icon, on }) => {
                      const active = cur === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={active}
                          onClick={() => setStatus(s.studentId, value)}
                          className={`flex items-center justify-center gap-1 rounded-xl py-2 text-xs font-semibold transition active:scale-95 ${
                            active ? on : 'bg-white/5 text-ink-muted'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={save}
            disabled={mark.isPending || markedNow === 0 || (!dirty && !saved)}
            className="w-full rounded-xl bg-gold text-base font-semibold py-3 text-sm disabled:opacity-40 active:scale-[0.99] transition"
          >
            {mark.isPending ? 'Saqlanmoqda…' : saved ? 'Saqlandi ✓' : 'Davomatni saqlash'}
          </button>
          {mark.error && (
            <p className="text-xs text-coral" role="alert">
              {(mark.error as Error).message || "Saqlab bo'lmadi"}
            </p>
          )}
        </>
      )}
    </section>
  );
}
