import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ClipboardCheck, AlertTriangle } from 'lucide-react';
import { apiFetch } from '../../lib/api-client';
import { Panel } from './Panel';

interface Todo {
  toGradeTotal: number;
  toGrade: { assignmentId: string; title: string; groupId: string; groupName: string; pending: number }[];
  atRisk: { groupId: string; groupName: string; studentId: string; name: string; attendancePct: number; absent: number }[];
}

/** O'qituvchi uchun: baholashni kutayotgan topshiriqlar va davomati past o'quvchilar. */
export function TeacherTodo() {
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ['teacher', 'todo'], queryFn: () => apiFetch<Todo>('/api/v1/teacher/todo'), staleTime: 60_000 });
  if (!data || (data.toGrade.length === 0 && data.atRisk.length === 0)) return null;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {data.toGrade.length > 0 && (
        <Panel title={`Baholash kutmoqda (${data.toGradeTotal})`} icon={ClipboardCheck} accent="gold" flush>
          <ul className="divide-y divide-tint/5">
            {data.toGrade.map((t) => (
              <li key={t.assignmentId}>
                <button type="button" onClick={() => navigate(`/teacher/assignments/${t.assignmentId}`)} className="flex w-full items-center gap-3 px-5 py-3 text-left active:bg-tint/5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{t.title}</p>
                    <p className="truncate text-[11px] text-ink-muted">{t.groupName}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-gold/15 px-2.5 py-1 text-xs font-semibold tabular-nums text-gold">{t.pending} ta</span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      {data.atRisk.length > 0 && (
        <Panel title="E'tibor talab qiladi (davomat < 70%)" icon={AlertTriangle} accent="coral" flush>
          <ul className="divide-y divide-tint/5">
            {data.atRisk.map((s) => (
              <li key={`${s.groupId}:${s.studentId}`}>
                <button type="button" onClick={() => navigate(`/teacher/groups/${s.groupId}?tab=attendance`)} className="flex w-full items-center gap-3 px-5 py-3 text-left active:bg-tint/5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{s.name}</p>
                    <p className="truncate text-[11px] text-ink-muted">{s.groupName} · {s.absent} marta kelmagan</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-coral/15 px-2.5 py-1 text-xs font-semibold tabular-nums text-coral">{s.attendancePct}%</span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
