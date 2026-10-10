import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api-client';
import { toast } from '../ui/Toast';
import { Panel, Avatar } from '../staff';
import { MaterialFiles } from '../materials/MaterialFiles';
import { Trophy } from '../../design/icons';
import type { MaterialFileDto } from '../../lib/material-files';

interface Row {
  student: { id: string; firstName?: string | null; lastName?: string | null; username?: string | null };
  submission: null | {
    id: string; status: string; textAnswer: string | null; submittedAt: string; files: MaterialFileDto[];
    aiScore: number | null; aiFeedback: string | null; aiStrengths: string[]; aiImprovements: string[];
    teacherScore: number | null; teacherFeedback: string | null; finalScore: number | null; gradeError: string | null;
  };
}
interface Res {
  assignment: { id: string; dueAt: string | null; maxScore: number; gradingStatus: 'PENDING' | 'RUNNING' | 'DONE' };
  summary: { total: number; submitted: number; graded: number; needsReview: number; failed: number; average: number | null };
  rows: Row[];
}

const STATUS: Record<string, { l: string; c: string }> = {
  SUBMITTED: { l: 'Topshirdi', c: 'bg-sky-500/15 text-sky-400' },
  GRADED: { l: 'Baholandi', c: 'bg-teal/15 text-teal' },
  NEEDS_REVIEW: { l: 'Tekshirish kerak', c: 'bg-gold/15 text-gold' },
  FAILED: { l: 'AI xatosi', c: 'bg-coral/15 text-coral' },
};

function Review({ row, max, onDone }: { row: Row; max: number; onDone: () => void }) {
  const s = row.submission!;
  const [score, setScore] = useState(String(s.finalScore ?? ''));
  const [fb, setFb] = useState(s.teacherFeedback ?? '');
  const m = useMutation({
    mutationFn: () =>
      apiFetch(`/api/v1/submissions/${s.id}/review`, {
        method: 'PATCH',
        body: JSON.stringify({ score: Number(score), feedback: fb.trim() || undefined }),
      }),
    onSuccess: () => { toast('success', 'Saqlandi'); onDone(); },
    onError: (e: any) => toast('error', e?.message || 'Xatolik'),
  });
  const n = Number(score);
  const ok = score !== '' && Number.isInteger(n) && n >= 0 && n <= max;
  const cls = 'bg-surface/60 rounded-xl px-3 py-2 text-sm outline-none border border-white/10 text-ink focus:border-gold/50';
  return (
    <div className="space-y-2 pt-2">
      <div className="flex gap-2">
        <input type="number" min={0} max={max} value={score} onChange={(e) => setScore(e.target.value)} placeholder={`0–${max}`} className={`${cls} w-24`} />
        <input value={fb} maxLength={2000} onChange={(e) => setFb(e.target.value)} placeholder="Izoh (ixtiyoriy)" className={`${cls} flex-1 min-w-0`} />
        <button disabled={!ok || m.isPending} onClick={() => m.mutate()} className="px-4 rounded-xl bg-gold text-base text-sm font-semibold disabled:opacity-40">
          Saqlash
        </button>
      </div>
    </div>
  );
}

export function HomeworkResultsPanel({ assignmentId }: { assignmentId: string }) {
  const qc = useQueryClient();
  const key = ['submissions', assignmentId];
  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => apiFetch<Res>(`/api/v1/submissions/assignments/${assignmentId}`),
    refetchInterval: (q) => (q.state.data?.assignment.gradingStatus === 'RUNNING' ? 8000 : false),
  });
  const [open, setOpen] = useState<string | null>(null);
  const grade = useMutation({
    mutationFn: () => apiFetch<{ started: boolean }>(`/api/v1/submissions/assignments/${assignmentId}/grade-now`, { method: 'POST' }),
    onSuccess: (r) => { toast('success', r.started ? 'AI baholadi' : 'Baholash allaqachon boshlangan'); qc.invalidateQueries({ queryKey: key }); },
    onError: (e: any) => toast('error', e?.message || 'Xatolik'),
  });

  if (isLoading || !data) return <div className="h-24 rounded-3xl bg-surface/40 animate-pulse" />;
  const { summary: sm, assignment: a, rows } = data;
  const pending = a.gradingStatus === 'PENDING';
  const overdue = a.dueAt ? new Date(a.dueAt).getTime() <= Date.now() : false;

  return (
    <Panel title={`Topshirilganlar: ${sm.submitted}/${sm.total}`} icon={Trophy} accent="teal">
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-2 text-center">
          {[['Baholangan', sm.graded], ["O'rtacha", sm.average ?? '—'], ['Tekshirish', sm.needsReview], ['Xato', sm.failed]].map(([l, v]) => (
            <div key={l as string} className="rounded-2xl bg-surface/40 py-2.5">
              <div className="text-base font-bold text-ink tabular-nums">{v}</div>
              <div className="text-[10px] text-ink-muted">{l}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 text-xs text-ink-muted">
          <span>
            {a.gradingStatus === 'RUNNING' ? '🤖 AI baholamoqda…' : a.gradingStatus === 'DONE' ? '✅ AI baholash tugagan'
              : overdue || !a.dueAt ? '⏳ Baholash kutilmoqda' : `Muddat: ${new Date(a.dueAt!).toLocaleDateString('uz-UZ')} — tugagach AI avtomatik baholaydi`}
          </span>
          {pending && (
            <button onClick={() => grade.mutate()} disabled={grade.isPending} className="shrink-0 font-semibold text-gold bg-gold/10 px-3 py-2 rounded-xl disabled:opacity-50">
              {grade.isPending ? 'Baholanmoqda…' : 'Hozir baholash'}
            </button>
          )}
        </div>

        <ul className="divide-y divide-white/5">
          {rows.map((r) => {
            const name = `${r.student.firstName ?? ''} ${r.student.lastName ?? ''}`.trim() || r.student.username || 'Talaba';
            const s = r.submission;
            const st = s ? STATUS[s.status] : null;
            return (
              <li key={r.student.id} className="py-2.5">
                <button disabled={!s} onClick={() => setOpen(open === r.student.id ? null : r.student.id)} className="w-full flex items-center gap-3 text-left">
                  <Avatar name={name} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-ink truncate">{name}</div>
                    <div className="text-[11px] text-ink-muted">{s ? new Date(s.submittedAt).toLocaleString('uz-UZ') : 'Topshirmagan'}</div>
                  </div>
                  {st && <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${st.c}`}>{st.l}</span>}
                  {s?.finalScore != null && <span className="text-sm font-bold text-teal tabular-nums">{s.finalScore}/{a.maxScore}</span>}
                </button>
                {s && open === r.student.id && (
                  <div className="mt-2 space-y-2 rounded-2xl bg-surface/40 p-3">
                    {s.textAnswer && <p className="text-sm text-ink whitespace-pre-wrap">{s.textAnswer}</p>}
                    {s.files.length > 0 && <MaterialFiles files={s.files} />}
                    {s.aiFeedback && (
                      <div className="text-xs text-ink-muted space-y-1">
                        <div className="font-semibold text-ink">🤖 AI: {s.aiScore}/{a.maxScore}</div>
                        <p className="whitespace-pre-wrap">{s.aiFeedback}</p>
                        {s.aiImprovements.length > 0 && <ul className="list-disc pl-4">{s.aiImprovements.map((x, i) => <li key={i}>{x}</li>)}</ul>}
                      </div>
                    )}
                    {s.gradeError && <p className="text-xs text-gold">{s.gradeError}</p>}
                    <Review row={r} max={a.maxScore} onDone={() => qc.invalidateQueries({ queryKey: key })} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </Panel>
  );
}
