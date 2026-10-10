import { formatDue } from '../../lib/due';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api-client';
import { toast } from '../ui/Toast';
import { Panel } from '../staff';
import { FileUploader } from '../materials/FileUploader';
import { MaterialFiles } from '../materials/MaterialFiles';
import { Edit3 } from '../../design/icons';
import type { MaterialFileDto } from '../../lib/material-files';

interface Mine {
  assignment: { id: string; dueAt: string | null; maxScore: number; gradingStatus: 'PENDING' | 'RUNNING' | 'DONE' };
  canSubmit: boolean;
  closedReason: string | null;
  submission: null | {
    status: string;
    textAnswer: string | null;
    submittedAt: string;
    files: MaterialFileDto[];
    score: number | null;
    maxScore: number;
    feedback: string | null;
    strengths: string[];
    improvements: string[];
    gradedBy: 'AI' | 'TEACHER' | null;
  };
}

function useCountdown(due: string | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!due) return;
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [due]);
  if (!due) return null;
  const ms = new Date(due).getTime() - now;
  if (ms <= 0) return 'Muddat tugadi';
  const m = Math.floor(ms / 60000);
  const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
  return d > 0 ? `${d} kun ${h} soat qoldi` : h > 0 ? `${h} soat ${mm} daqiqa qoldi` : `${mm} daqiqa qoldi`;
}

export function HomeworkSubmitPanel({ assignmentId }: { assignmentId: string }) {
  const qc = useQueryClient();
  const key = ['submission-mine', assignmentId];
  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => apiFetch<Mine>(`/api/v1/submissions/assignments/${assignmentId}/mine`),
    refetchInterval: (q) => (q.state.data?.assignment.gradingStatus === 'RUNNING' ? 8000 : false),
  });
  const [text, setText] = useState('');
  const [files, setFiles] = useState<MaterialFileDto[]>([]);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const countdown = useCountdown(data?.assignment.dueAt ?? null);

  const sub = data?.submission ?? null;
  useEffect(() => {
    if (sub) {
      setText(sub.textAnswer ?? '');
      setFiles(sub.files);
    }
  }, [sub?.submittedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useMutation({
    mutationFn: () =>
      apiFetch(`/api/v1/submissions/assignments/${assignmentId}/mine`, {
        method: 'PUT',
        body: JSON.stringify({ textAnswer: text.trim() || undefined, fileIds: files.map((f) => f.id) }),
      }),
    onSuccess: () => {
      toast('success', 'Vazifa topshirildi ✅');
      setEditing(false);
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e: any) => toast('error', e?.message || 'Topshirib bo\'lmadi'),
  });

  if (isLoading || !data) return <div className="h-24 rounded-3xl bg-surface/40 animate-pulse" />;

  const graded = sub?.status === 'GRADED' && sub.score !== null;
  const showForm = data.canSubmit && (!sub || editing);
  const inputCls =
    'w-full bg-surface/60 rounded-2xl px-4 py-3 text-sm outline-none border border-white/10 text-ink focus:border-gold/50 placeholder:text-ink-faint';

  return (
    <Panel title="Vazifani topshirish" icon={Edit3} accent="gold">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-ink-muted">
            {data.assignment.dueAt ? `Muddat: ${formatDue(data.assignment.dueAt)}` : 'Muddat belgilanmagan'}
          </span>
          {countdown && (
            <span className={`rounded-full px-2.5 py-1 font-semibold ${data.canSubmit ? 'bg-gold/15 text-gold' : 'bg-coral/15 text-coral'}`}>
              {countdown}
            </span>
          )}
        </div>

        {graded && (
          <div className="rounded-2xl bg-teal/10 border border-teal/30 p-4 space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-ink-muted">{sub!.gradedBy === 'TEACHER' ? "O'qituvchi bahosi" : '🤖 AI bahosi'}</span>
              <span className="text-2xl font-bold text-teal tabular-nums">{sub!.score}<span className="text-sm text-ink-muted">/{sub!.maxScore}</span></span>
            </div>
            {sub!.feedback && <p className="text-sm text-ink whitespace-pre-wrap">{sub!.feedback}</p>}
            {sub!.strengths.length > 0 && (
              <ul className="text-xs text-teal list-disc pl-4 space-y-0.5">{sub!.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
            )}
            {sub!.improvements.length > 0 && (
              <ul className="text-xs text-gold list-disc pl-4 space-y-0.5">{sub!.improvements.map((s, i) => <li key={i}>{s}</li>)}</ul>
            )}
          </div>
        )}

        {sub && !graded && !showForm && (
          <div className="rounded-2xl bg-sky-500/10 border border-sky-500/30 p-3 text-xs text-ink">
            {data.assignment.gradingStatus === 'RUNNING'
              ? '🤖 AI baholamoqda… natija tez orada chiqadi'
              : sub.status === 'NEEDS_REVIEW' || sub.status === 'FAILED'
                ? "✅ Topshirildi. O'qituvchi tekshiradi."
                : data.canSubmit
                  ? '✅ Topshirildi. Muddat tugagach AI baholaydi.'
                  : '✅ Topshirildi. Baho kutilmoqda.'}
          </div>
        )}

        {!sub && !data.canSubmit && (
          <p className="text-sm text-coral">{data.closedReason ?? 'Topshirib bo\'lmaydi'}</p>
        )}

        {sub && !showForm && (
          <div className="space-y-2">
            {sub.textAnswer && <p className="text-sm text-ink-muted whitespace-pre-wrap rounded-2xl bg-surface/40 p-3">{sub.textAnswer}</p>}
            {sub.files.length > 0 && <MaterialFiles files={sub.files} />}
            {data.canSubmit && (
              <button onClick={() => setEditing(true)} className="text-xs font-semibold text-gold bg-gold/10 px-3.5 py-2 rounded-xl">
                Javobni o'zgartirish
              </button>
            )}
          </div>
        )}

        {showForm && (
          <div className="space-y-3">
            <textarea
              value={text}
              maxLength={10000}
              rows={6}
              onChange={(e) => setText(e.target.value)}
              placeholder="Javobingizni shu yerga yozing…"
              className={inputCls}
            />
            <FileUploader files={files} onChange={setFiles} onBusyChange={setBusy} deleteOnRemove={() => true} />
            <p className="text-[11px] text-ink-faint">AI faqat matn, PDF, DOCX va TXT fayllarni o'qiy oladi. Rasm bo'lsa — o'qituvchi tekshiradi.</p>
            <div className="flex gap-2">
              <button
                onClick={() => save.mutate()}
                disabled={busy || save.isPending || (!text.trim() && files.length === 0)}
                className="flex-1 rounded-2xl bg-gold text-base font-semibold py-3 text-sm disabled:opacity-40 active:scale-[0.98] transition"
              >
                {save.isPending ? 'Yuborilmoqda…' : sub ? 'Yangilash' : 'Topshirish'}
              </button>
              {editing && (
                <button onClick={() => setEditing(false)} className="px-4 rounded-2xl bg-surface/60 text-sm text-ink border border-white/10">
                  Bekor
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}
