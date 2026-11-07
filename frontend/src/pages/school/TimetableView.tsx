import { CalendarDays } from 'lucide-react';
import { EmptyState, Skeleton } from '../../components/ui';
import { DAYS, Slot, useSchoolQuery } from './schoolApi';

/** Haftalik dars jadvali (kunlar bo'yicha). `url` — qaysi jadval (mening / maktab). */
export function TimetableView({ url, keyName, who }: { url: string; keyName: string; who: 'teacher' | 'group' }) {
  const { data, isLoading } = useSchoolQuery<Slot[]>(['tt', keyName], url);
  if (isLoading) return <Skeleton className="h-32" />;
  if (!data?.length) return <EmptyState icon={CalendarDays} title="Jadval bo'sh" subtitle="Dars jadvali hali tuzilmagan yoki siz maktabga biriktirilmagansiz." />;
  const todayIso = ((new Date(Date.now() + 5 * 3_600_000).getUTCDay() + 6) % 7) + 1;
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5, 6, 7].map((d) => {
        const rows = data.filter((s) => s.weekday === d);
        if (!rows.length) return null;
        return (
          <section key={d} className="rounded-2xl border border-tint/10 bg-surface/40 p-3">
            <h3 className={`mb-2 text-xs font-bold ${d === todayIso ? 'text-accent' : 'text-ink-muted'}`}>{DAYS[d]}{d === todayIso ? ' · bugun' : ''}</h3>
            <ul className="space-y-2">
              {rows.map((s) => (
                <li key={s.id} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-xs font-semibold tabular-nums text-ink">{s.startTime}–{s.endTime}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-ink">{s.subject}</div>
                    <div className="truncate text-[11px] text-ink-muted">{who === 'teacher' ? s.teacher.name : s.group.name}{s.room ? ` · ${s.room}` : ''}</div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
