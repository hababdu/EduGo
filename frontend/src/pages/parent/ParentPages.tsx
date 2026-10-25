import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CalendarX, ClipboardList, BookOpen, ChevronLeft, UserCheck } from 'lucide-react';
import { apiFetch } from '../../lib/api-client';
import { Panel } from '../../components/staff';
import { IMAGES } from '../../design/images';
import { StaffHero } from '../../components/staff';
import { toast } from '../../components/ui/Toast';
import { NotificationsPage } from '../NotificationsPage';

interface Standing {
  groupId: string; groupName: string; attendancePct: number | null; absent: number;
  fee: number | null; month: string; payment: 'PAID' | 'WAIVED' | 'UNPAID' | 'NONE';
}
interface Child { id: string; name: string; standing: Standing[]; pendingTasks: number; overdueTasks: number }
interface Detail {
  id: string; name: string; level: number | null; totalScore: number | null; standing: Standing[];
  tasks: { id: string; title: string; groupName: string; dueAt: string | null; state: string; score: number | null; maxScore: number; overdue: boolean }[];
  absences: { date: string; status: 'ABSENT' | 'EXCUSED'; group: string }[];
  results: { title: string; score: number; passed: boolean; at: string }[];
  journal: { date: string; topic: string; homework: string | null; group: string }[];
}

const PAY: Record<string, { t: string; c: string }> = {
  PAID: { t: "To'langan", c: 'text-teal' }, WAIVED: { t: 'Imtiyoz', c: 'text-sky' }, UNPAID: { t: "To'lanmagan", c: 'text-coral' },
};
const TASK: Record<string, { t: string; c: string }> = {
  PENDING: { t: 'Topshirilmagan', c: 'bg-gold/15 text-gold' }, RETURNED: { t: 'Qaytarilgan', c: 'bg-coral/15 text-coral' },
  SUBMITTED: { t: 'Topshirildi', c: 'bg-sky/15 text-sky' }, GRADED: { t: 'Baholandi', c: 'bg-teal/15 text-teal' },
};
const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long', timeZone: 'UTC' });

function Home() {
  const { data, isLoading, error } = useQuery({ queryKey: ['parent', 'children'], queryFn: () => apiFetch<Child[]>('/api/v1/parent/children') });
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 pb-16 pt-5">
      <StaffHero accent="teal" image={IMAGES.hero} eyebrow="OTA-ONA" title="Farzandlarim" subtitle="Davomat, vazifa va to'lov — bir joyda"
        actions={<Link to="/notifications" className="flex items-center gap-1.5 rounded-xl bg-surface/70 px-3 py-2 text-xs font-semibold text-ink"><Bell className="h-3.5 w-3.5" aria-hidden="true" />Xabarlar</Link>} />
      {isLoading && <div className="h-32 animate-pulse rounded-3xl bg-surface/40" />}
      {error && <p className="rounded-2xl border border-coral/20 bg-coral/10 p-3 text-sm text-coral">{(error as Error).message}</p>}
      {data && data.length === 0 && (
        <p className="rounded-3xl border border-tint/10 bg-surface/30 p-6 text-center text-sm text-ink-muted">
          Hali farzand ulanmagan. O'quvchidan ota-ona taklif havolasini so'rang va Telegramda oching.
        </p>
      )}
      {data?.map((c) => (
        <Link key={c.id} to={`/child/${c.id}`} className="block space-y-3 rounded-3xl border border-tint/10 bg-surface/40 p-4 active:scale-[0.99]">
          <div className="flex items-center justify-between gap-2">
            <h2 className="truncate font-display text-lg font-bold text-ink">{c.name}</h2>
            {c.pendingTasks > 0 && <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${c.overdueTasks ? 'bg-coral/15 text-coral' : 'bg-gold/15 text-gold'}`}>{c.pendingTasks} ta vazifa{c.overdueTasks ? ` · ${c.overdueTasks} muddati o'tgan` : ''}</span>}
          </div>
          {c.standing.length === 0 && <p className="text-xs text-ink-muted">Hozircha guruhga qo'shilmagan</p>}
          <ul className="space-y-1.5">
            {c.standing.map((g) => (
              <li key={g.groupId} className="flex items-center justify-between gap-2 text-xs">
                <span className="min-w-0 truncate text-ink">{g.groupName}</span>
                <span className="shrink-0 text-ink-muted">
                  {g.attendancePct === null ? 'davomat yo\'q' : `davomat ${g.attendancePct}%`}
                  {g.payment !== 'NONE' && <b className={`ml-2 ${PAY[g.payment].c}`}>{PAY[g.payment].t}</b>}
                </span>
              </li>
            ))}
          </ul>
        </Link>
      ))}
    </div>
  );
}

function ChildPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: d, isLoading, error } = useQuery({ queryKey: ['parent', 'child', id], queryFn: () => apiFetch<Detail>(`/api/v1/parent/children/${id}`), enabled: !!id });
  const unlink = useMutation({
    mutationFn: () => apiFetch(`/api/v1/parent/children/${id}`, { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['parent'] }); toast('success', 'Uzildi'); navigate('/'); },
    onError: (e: any) => toast('error', e?.message || 'Xatolik'),
  });
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 pb-16 pt-5">
      <Link to="/" className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted"><ChevronLeft className="h-4 w-4" aria-hidden="true" />Orqaga</Link>
      {isLoading && <div className="h-40 animate-pulse rounded-3xl bg-surface/40" />}
      {error && <p className="rounded-2xl border border-coral/20 bg-coral/10 p-3 text-sm text-coral">{(error as Error).message}</p>}
      {d && (
        <>
          <StaffHero accent="gold" image={IMAGES.hero} eyebrow="FARZAND" title={d.name}
            subtitle={d.level != null ? `Daraja ${d.level} · ${d.totalScore ?? 0} ball` : undefined} />

          <Panel title="Guruhlar: davomat va to'lov" icon={UserCheck} accent="sky">
            <ul className="space-y-2 text-sm">
              {d.standing.map((g) => (
                <li key={g.groupId} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-ink">{g.groupName}</span>
                  <span className="shrink-0 text-xs text-ink-muted">
                    {g.attendancePct === null ? '—' : `${g.attendancePct}% (${g.absent} marta kelmagan)`}
                    {g.payment !== 'NONE' && <b className={`ml-2 ${PAY[g.payment].c}`}>{PAY[g.payment].t}</b>}
                  </span>
                </li>
              ))}
              {d.standing.length === 0 && <li className="text-xs text-ink-muted">Guruh yo'q</li>}
            </ul>
          </Panel>

          <Panel title="Vazifalar" icon={ClipboardList} accent="gold">
            {d.tasks.length === 0 ? <p className="text-xs text-ink-muted">Vazifa yo'q</p> : (
              <ul className="space-y-2">
                {d.tasks.map((t) => {
                  const b = TASK[t.state] ?? TASK.PENDING;
                  return (
                    <li key={t.id} className="flex items-center gap-3">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-ink">{t.title}</span>
                        <span className="block truncate text-[11px] text-ink-muted">{t.groupName}{t.overdue ? " · muddati o'tgan" : ''}</span>
                      </span>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${b.c}`}>{t.state === 'GRADED' ? `${t.score ?? '—'}/${t.maxScore}` : b.t}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          {d.absences.length > 0 && (
            <Panel title="Kelmagan kunlar (30 kun)" icon={CalendarX} accent="coral">
              <ul className="space-y-1.5 text-sm">
                {d.absences.map((a, i) => (
                  <li key={i} className="flex justify-between gap-2"><span className="text-ink">{day(a.date)} · {a.group}</span><span className={a.status === 'ABSENT' ? 'text-coral' : 'text-gold'}>{a.status === 'ABSENT' ? 'kelmadi' : 'sababli'}</span></li>
                ))}
              </ul>
            </Panel>
          )}

          {d.journal.length > 0 && (
            <Panel title="Oxirgi darslar va uyga vazifa" icon={BookOpen} accent="teal">
              <ul className="space-y-2">
                {d.journal.map((j, i) => (
                  <li key={i}>
                    <p className="text-[11px] text-ink-muted">{day(j.date)} · {j.group}</p>
                    <p className="text-sm text-ink">{j.topic}</p>
                    {j.homework && <p className="text-xs text-gold">📝 {j.homework}</p>}
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {d.results.length > 0 && (
            <Panel title="Oxirgi test natijalari" icon={ClipboardList} accent="gold">
              <ul className="space-y-1.5 text-sm">
                {d.results.map((r, i) => (
                  <li key={i} className="flex justify-between gap-2"><span className="truncate text-ink">{r.title}</span><span className={r.passed ? 'text-teal' : 'text-coral'}>{r.score}</span></li>
                ))}
              </ul>
            </Panel>
          )}

          <button type="button" onClick={() => { if (window.confirm("Bu farzandni ro'yxatdan olib tashlaysizmi?")) unlink.mutate(); }}
            className="w-full rounded-2xl border border-tint/10 py-2.5 text-xs text-ink-muted">Farzandni ro'yxatdan chiqarish</button>
        </>
      )}
    </div>
  );
}

export function ParentRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/child/:id" element={<ChildPage />} />
      <Route path="/notifications" element={<NotificationsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
