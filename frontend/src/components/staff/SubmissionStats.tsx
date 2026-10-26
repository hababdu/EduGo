import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ClipboardCheck } from 'lucide-react';
import { apiFetch } from '../../lib/api-client';
import { Panel } from './Panel';
import { ProgressBar } from './ProgressBar';

interface Row { id: string; title: string; dueAt: string | null; total: number; submitted: number; graded: number }

/** Guruh vazifalari: kim topshirdi, nechtasi baholandi. */
export function SubmissionStats({ groupId }: { groupId: string }) {
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ['teacher', 'submission-stats', groupId],
    queryFn: () => apiFetch<Row[]>(`/api/v1/teacher/groups/${groupId}/submission-stats`),
    staleTime: 30_000,
  });
  if (!data || data.length === 0) return null;
  return (
    <Panel title="Vazifalar topshirilishi" icon={ClipboardCheck} accent="gold" flush>
      <ul className="divide-y divide-tint/5 stagger">
        {data.map((r) => (
          <li key={r.id}>
            <button type="button" onClick={() => navigate(`/teacher/assignments/${r.id}`)} className="block w-full px-5 py-3 text-left active:bg-tint/5">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold text-ink">{r.title}</p>
                <span className="shrink-0 text-xs tabular-nums text-ink-muted">{r.submitted}/{r.total} topshirdi</span>
              </div>
              <ProgressBar value={r.total ? (r.submitted / r.total) * 100 : 0} tone={r.submitted >= r.total && r.total > 0 ? 'teal' : 'gold'} className="mt-1.5" />
              <p className="mt-1 text-[11px] text-ink-muted">Baholangan: {r.graded}/{r.submitted}</p>
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
