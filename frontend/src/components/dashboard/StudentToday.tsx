import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarCheck, ClipboardList } from 'lucide-react';
import { apiFetch } from '../../lib/api-client';
import { formatTime, useTodayLessons } from '../../hooks/useSchedule';

interface Task {
  id: string; title: string; groupId: string; groupName: string; dueAt: string | null; maxScore: number;
  state: 'PENDING' | 'SUBMITTED' | 'GRADED'; score: number | null; overdue: boolean;
}

const fmtDue = (iso: string) => new Date(iso).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });

/** O'quvchi bosh sahifasi: bugungi darslar va vazifalar holati. */
export function StudentToday() {
  const navigate = useNavigate();
  const lessons = useTodayLessons();
  const tasks = useQuery({ queryKey: ['student', 'tasks'], queryFn: () => apiFetch<Task[]>('/api/v1/dashboard/tasks'), staleTime: 60_000 });
  const todays = lessons.data ?? [];
  const list = tasks.data ?? [];
  if (todays.length === 0 && list.length === 0) return null;

  const badge = (t: Task) =>
    t.state === 'GRADED' ? { text: `${t.score ?? '—'}/${t.maxScore}`, cls: 'bg-teal/15 text-teal' }
    : t.state === 'SUBMITTED' ? { text: 'Topshirildi', cls: 'bg-sky/15 text-sky' }
    : t.overdue ? { text: "Muddati o'tgan", cls: 'bg-coral/15 text-coral' }
    : { text: 'Topshiring', cls: 'bg-gold/15 text-gold' };

  return (
    <div className="space-y-3 px-5">
      {todays.length > 0 && (
        <section className="rounded-3xl border border-tint/10 bg-surface/40 p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink"><CalendarCheck className="h-4 w-4 text-teal" aria-hidden="true" />Bugungi darslar</h3>
          <ul className="space-y-2">
            {todays.map((l) => (
              <li key={l.id}>
                <button type="button" onClick={() => navigate(`/groups/${l.id}`)} className="flex w-full items-center gap-3 text-left">
                  <span className="w-12 shrink-0 text-sm font-semibold tabular-nums text-gold">{l.startTime ?? '—'}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink">{l.name}</span>
                    <span className="block truncate text-[11px] text-ink-muted">{[formatTime(l.startTime, l.endTime), l.room].filter(Boolean).join(' · ')}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {list.length > 0 && (
        <section className="rounded-3xl border border-tint/10 bg-surface/40 p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink"><ClipboardList className="h-4 w-4 text-gold" aria-hidden="true" />Vazifalarim</h3>
          <ul className="space-y-2">
            {list.slice(0, 6).map((t) => {
              const b = badge(t);
              return (
                <li key={t.id}>
                  <button type="button" onClick={() => navigate(`/groups/${t.groupId}`)} className="flex w-full items-center gap-3 text-left">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-ink">{t.title}</span>
                      <span className="block truncate text-[11px] text-ink-muted">{t.groupName}{t.dueAt && t.state === 'PENDING' ? ` · muddat ${fmtDue(t.dueAt)}` : ''}</span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${b.cls}`}>{b.text}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
