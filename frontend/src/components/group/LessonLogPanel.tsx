import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen } from 'lucide-react';
import { apiFetch } from '../../lib/api-client';
import { shiftDate, tashkentToday } from '../../hooks/useAttendance';

interface Entry { id: string; date: string; topic: string; homework: string | null }

const fmt = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long', weekday: 'short', timeZone: 'UTC' });

/** Dars jurnali: o'tilgan mavzu + uyga vazifa. `canEdit` — o'qituvchi/admin uchun forma. */
export function LessonLogPanel({ groupId, canEdit }: { groupId: string; canEdit: boolean }) {
  const qc = useQueryClient();
  const today = tashkentToday();
  const [date, setDate] = useState(today);
  const [topic, setTopic] = useState('');
  const [homework, setHomework] = useState('');
  const key = ['lesson-log', groupId];
  const { data = [] } = useQuery({ queryKey: key, queryFn: () => apiFetch<Entry[]>(`/api/v1/groups/${groupId}/lesson-log`), staleTime: 30_000 });
  const save = useMutation({
    mutationFn: () => apiFetch(`/api/v1/groups/${groupId}/lesson-log`, { method: 'PUT', data: { date, topic, homework: homework || undefined } }),
    onSuccess: () => { setTopic(''); setHomework(''); qc.invalidateQueries({ queryKey: key }); },
  });

  const pick = (e: Entry) => { setDate(e.date); setTopic(e.topic); setHomework(e.homework ?? ''); };
  if (!canEdit && data.length === 0) return null;

  return (
    <section className="space-y-3 rounded-3xl border border-tint/10 bg-surface/30 p-4" aria-label="Dars jurnali">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-ink"><BookOpen className="h-4 w-4 text-gold" aria-hidden="true" />Dars jurnali</h3>

      {canEdit && (
        <div className="space-y-2">
          <input type="date" value={date} min={shiftDate(today, -90)} max={today} onChange={(e) => e.target.value && setDate(e.target.value)}
            className="min-h-[44px] w-full rounded-xl border border-tint/5 bg-surface/40 px-3 py-2 text-sm text-ink outline-none focus:border-accent/60" />
          <input value={topic} maxLength={300} onChange={(e) => setTopic(e.target.value)} placeholder="Bugun nima o'tildi? (mavzu)"
            className="min-h-[44px] w-full rounded-xl border border-tint/5 bg-surface/40 px-3 py-2 text-sm text-ink outline-none focus:border-accent/60" />
          <textarea value={homework} maxLength={1000} onChange={(e) => setHomework(e.target.value)} rows={2} placeholder="Uyga vazifa (ixtiyoriy)"
            className="w-full rounded-xl border border-tint/5 bg-surface/40 px-3 py-2 text-sm text-ink outline-none focus:border-accent/60" />
          <button type="button" disabled={save.isPending || topic.trim().length < 2} onClick={() => save.mutate()}
            className="w-full rounded-xl bg-gold py-2.5 text-sm font-semibold text-base disabled:opacity-40">{save.isPending ? 'Saqlanmoqda…' : 'Jurnalga yozish'}</button>
          {save.error && <p className="text-xs text-coral" role="alert">{(save.error as Error).message || "Saqlab bo'lmadi"}</p>}
        </div>
      )}

      <ul className="divide-y divide-tint/5">
        {data.slice(0, 10).map((e) => (
          <li key={e.id} className="py-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] text-ink-muted">{fmt(e.date)}</p>
                <p className="text-sm font-medium text-ink">{e.topic}</p>
                {e.homework && <p className="mt-0.5 text-xs text-gold">📝 {e.homework}</p>}
              </div>
              {canEdit && <button type="button" onClick={() => pick(e)} className="shrink-0 text-[11px] font-semibold text-ink-muted underline">Tahrirlash</button>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
