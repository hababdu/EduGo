import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import { apiFetch } from '../../lib/api-client';
import { formatMoney } from '../../hooks/usePayments';
import { Panel } from './Panel';
import { MiniBars } from './MiniBars';

interface Finance {
  months: { month: string; collected: number; expected: number; paid: number; unpaid: number; rate: number | null }[];
  topGroups: { groupId: string; name: string; students: number; collected: number }[];
}
interface Risk { studentId: string; name: string; groups: string[]; attendancePct: number | null; idleDays: number; reasons: string[] }

const SHORT = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];

/** Maktab egasi uchun: tushum dinamikasi (6 oy) va xavf ostidagi o'quvchilar. */
export function AdminInsights() {
  const navigate = useNavigate();
  const fin = useQuery({ queryKey: ['insights', 'finance'], queryFn: () => apiFetch<Finance>('/api/v1/insights/finance?months=6'), staleTime: 120_000 });
  const risk = useQuery({ queryKey: ['insights', 'risk'], queryFn: () => apiFetch<Risk[]>('/api/v1/insights/at-risk'), staleTime: 120_000 });

  const months = fin.data?.months ?? [];
  const hasMoney = months.some((m) => m.collected > 0 || m.expected > 0);
  const last = months[months.length - 1];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {hasMoney && (
        <Panel title="Tushum dinamikasi (6 oy)" icon={TrendingUp} accent="gold"
          action={last?.rate != null ? <span className="rounded-full bg-tint/5 px-2 py-0.5 text-[10px] text-ink-muted">Bu oy: {last.rate}% yig'ildi</span> : undefined}>
          <MiniBars color="gold" data={months.map((m) => ({ label: SHORT[Number(m.month.slice(5, 7)) - 1], value: Math.round(m.collected / 1000), title: `${m.month}: ${formatMoney(m.collected)} / ${formatMoney(m.expected)}` }))} />
          <p className="mt-2 text-[11px] text-ink-muted">Ustun: yig'ilgan summa (ming so'm). Bu oy: {last ? `${formatMoney(last.collected)} / ${formatMoney(last.expected)}` : '—'}</p>
          {fin.data!.topGroups.some((g) => g.collected > 0) && (
            <ul className="mt-3 space-y-1">
              {fin.data!.topGroups.filter((g) => g.collected > 0).slice(0, 3).map((g) => (
                <li key={g.groupId} className="flex justify-between text-xs"><span className="truncate text-ink">{g.name}</span><span className="tabular-nums text-teal">{formatMoney(g.collected)}</span></li>
              ))}
            </ul>
          )}
        </Panel>
      )}
      {risk.data && risk.data.length > 0 && (
        <Panel title={`Xavf ostida (${risk.data.length})`} icon={AlertTriangle} accent="coral" flush>
          <ul className="divide-y divide-tint/5 stagger">
            {risk.data.slice(0, 6).map((r) => (
              <li key={r.studentId}>
                <button type="button" onClick={() => navigate(`/admin/students`)} className="flex w-full items-center gap-3 px-5 py-3 text-left active:bg-tint/5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{r.name}</p>
                    <p className="truncate text-[11px] text-ink-muted">{r.groups.join(', ')}</p>
                  </div>
                  <span className="shrink-0 text-right text-[11px] text-coral">{r.reasons.join(' · ')}</span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
