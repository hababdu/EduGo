import { useNavigate } from 'react-router-dom';
import { CalendarCheck, CircleCheck, Clock } from 'lucide-react';
import { Panel } from './Panel';
import { ProgressBar } from './ProgressBar';
import { formatTime, useTodayLessons } from '../../hooks/useSchedule';

interface Props {
  /** '/teacher/groups' yoki '/admin/groups' — guruh sahifasiga o'tish uchun */
  basePath: string;
  /** Davomat tabini to'g'ridan-to'g'ri ochish (o'qituvchi sahifasi qo'llab-quvvatlaydi) */
  openAttendanceTab?: boolean;
}

/** "Bugungi darslar": jadvali bo'yicha bugun darsi bor guruhlar va davomat holati. */
export function TodayLessons({ basePath, openAttendanceTab = false }: Props) {
  const navigate = useNavigate();
  const { data, isLoading, error } = useTodayLessons();

  return (
    <Panel title="Bugungi darslar" icon={CalendarCheck} accent="teal" flush>
      {isLoading ? (
        <div className="mx-5 mb-5 h-16 animate-pulse rounded-2xl bg-white/5" />
      ) : error ? (
        <p className="px-5 pb-5 text-xs text-coral">Jadvalni yuklab bo'lmadi</p>
      ) : !data || data.length === 0 ? (
        <p className="px-5 pb-5 text-xs text-ink-muted">
          Bugun darslar yo'q. Guruh sozlamalarida dars kunlarini belgilang — shu yerda ko'rinadi.
        </p>
      ) : (
        <ul className="divide-y divide-white/5">
          {data.map((l) => {
            const done = l.membersCount > 0 && l.markedCount >= l.membersCount;
            const pct = l.membersCount > 0 ? (l.markedCount / l.membersCount) * 100 : 0;
            const time = formatTime(l.startTime, l.endTime);
            return (
              <li key={l.id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-14 shrink-0 text-center">
                  <Clock className="mx-auto mb-0.5 h-3.5 w-3.5 text-ink-faint" aria-hidden="true" />
                  <span className="text-xs font-semibold tabular-nums text-ink">{l.startTime ?? '—'}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{l.name}</p>
                  <p className="truncate text-[11px] text-ink-muted">
                    {[time, l.room, l.teacher ? `${l.teacher.firstName} ${l.teacher.lastName ?? ''}`.trim() : null].filter(Boolean).join(' · ')}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <ProgressBar value={pct} tone={done ? 'teal' : 'gold'} className="max-w-[140px]" />
                    <span className="text-[10px] tabular-nums text-ink-muted">
                      {l.markedCount}/{l.membersCount}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`${basePath}/${l.id}${openAttendanceTab ? '?tab=attendance' : ''}`)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition active:scale-95 ${
                    done ? 'bg-teal/10 text-teal' : 'bg-gold text-base'
                  }`}
                >
                  {done && <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" />}
                  {done ? "Ko'rish" : 'Davomat'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
