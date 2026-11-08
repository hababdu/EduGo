import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, GraduationCap, UserRoundX, X } from 'lucide-react';
import { apiFetch } from '../../lib/api-client';
import { StaffHero, Panel } from '../../components/staff';
import { IMAGES } from '../../design/images';
import { PAGE_WIDE } from '../../design/tokens';
import { EmptyState, Skeleton } from '../../components/ui';
import { toast } from '../../components/ui/Toast';
import { useGroups } from '../../hooks/useGroups';

type TrialStatus = 'REQUESTED' | 'APPROVED' | 'DECLINED' | 'ATTENDED' | 'NO_SHOW' | 'CANCELLED' | 'ADMITTED';
interface Trial {
  id: string; status: TrialStatus; preferredAt: string | null; scheduledAt: string | null;
  note: string | null; decisionNote: string | null; createdAt: string;
  group: { id: string; name: string } | null;
  student: { id: string; name: string; username: string | null };
  requestedByParent: boolean;
}
interface TrialResponse { total: number; page: number; pages: number; items: Trial[] }

const LABEL: Record<TrialStatus, string> = {
  REQUESTED: 'Yangi ariza', APPROVED: 'Tasdiqlandi', DECLINED: 'Rad etildi',
  ATTENDED: 'Qatnashdi', NO_SHOW: 'Kelmagan', CANCELLED: 'Bekor qilingan', ADMITTED: 'Qabul qilindi',
};
const COLOR: Record<TrialStatus, string> = {
  REQUESTED: 'bg-sky/15 text-sky', APPROVED: 'bg-gold/15 text-gold',
  DECLINED: 'bg-coral/15 text-coral', ATTENDED: 'bg-teal/15 text-teal',
  NO_SHOW: 'bg-coral/10 text-coral', CANCELLED: 'bg-surface/60 text-ink-muted',
  ADMITTED: 'bg-teal/20 text-teal',
};
const dateLabel = (value: string | null) => value ? new Date(value).toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent', dateStyle: 'medium', timeStyle: 'short' }) : 'Belgilanmagan';
const input = 'min-h-[40px] rounded-xl border border-tint/10 bg-surface/50 px-3 py-2 text-sm text-ink outline-none focus:border-accent/60';

export default function AdminTrials() {
  const qc = useQueryClient();
  const { data: groups = [] } = useGroups();
  const [filter, setFilter] = useState<TrialStatus | 'ALL'>('ALL');
  const [schedule, setSchedule] = useState<Record<string, string>>({});
  const [groups, setGroups] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const key = ['admin-trials', filter];
  const { data, isLoading, error } = useQuery({
    queryKey: key,
    queryFn: () => apiFetch<TrialResponse>(`/api/v1/admin/trials${filter === 'ALL' ? '' : `?status=${filter}`}`),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-trials'] });
  const act = useMutation({
    mutationFn: ({ id, action, body }: { id: string; action: string; body?: Record<string, unknown> }) =>
      apiFetch(`/api/v1/admin/trials/${id}/${action}`, { method: 'POST', data: body ?? {} }),
    onSuccess: () => { toast('success', 'Ariza holati yangilandi'); refresh(); },
    onError: (e: any) => toast('error', e?.message || 'Amal bajarilmadi'),
  });
  const counts: Record<string, number> = useMemo(() => {
    const items = data?.items ?? [];
    return {
      ALL: data?.total ?? 0,
      REQUESTED: items.filter(x => x.status === 'REQUESTED').length,
      APPROVED: items.filter(x => x.status === 'APPROVED').length,
      ATTENDED: items.filter(x => x.status === 'ATTENDED').length,
      ADMITTED: items.filter(x => x.status === 'ADMITTED').length,
    };
  }, [data]);
  const filters: (TrialStatus | 'ALL')[] = ['ALL', 'REQUESTED', 'APPROVED', 'ATTENDED', 'ADMITTED'];
  const dateToIso = (v: string) => v ? new Date(v).toISOString() : '';

  return (
    <div className={`${PAGE_WIDE} space-y-4`}>
      <StaffHero accent="gold" image={IMAGES.hero} eyebrow="EduGo · Qabul" title="Sinov darslari va qabul"
        subtitle="Arizalarni ko'rib chiqing, sinov darsini belgilang va qatnashgan talabani maktabga qabul qiling." />
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist">
        {filters.map(s => <button key={s} type="button" role="tab" aria-selected={filter === s} onClick={() => setFilter(s)}
          className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold ${filter === s ? 'bg-accent text-base' : 'bg-surface/50 text-ink-muted'}`}>
          {s === 'ALL' ? 'Hammasi' : LABEL[s]} · {counts[s] ?? 0}
        </button>)}
      </div>
      {isLoading && <Skeleton className="h-40" />}
      {error && <p className="rounded-xl bg-coral/10 p-3 text-sm text-coral">{(error as Error).message}</p>}
      {data && data.items.length === 0 && <EmptyState icon={GraduationCap} title="Arizalar topilmadi" subtitle="Tanlangan holatda sinov darsi arizalari mavjud emas." />}
      <div className="space-y-3">
        {data?.items.map(t => <Panel key={t.id} title={t.student.name}>
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{t.student.name}</p>
                <p className="text-xs text-ink-muted">{t.student.username ? '@' + t.student.username : 'Telegram foydalanuvchisi'}{t.requestedByParent ? ' · Ota-ona yuborgan' : ''}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${COLOR[t.status]}`}>{LABEL[t.status]}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-ink-muted">
              <div><span className="block text-ink-faint">Afzal vaqt</span>{dateLabel(t.preferredAt)}</div>
              <div><span className="block text-ink-faint">Belgilangan vaqt</span>{dateLabel(t.scheduledAt)}</div>
            </div>
            {t.group && <p className="text-xs text-ink-muted">Guruh: {t.group.name}</p>}
            {t.note && <p className="rounded-xl bg-surface/40 p-2 text-xs text-ink-muted">Izoh: {t.note}</p>}
            {t.decisionNote && <p className="text-xs text-ink-muted">Admin izohi: {t.decisionNote}</p>}
            {t.status === 'REQUESTED' && <div className="space-y-2 border-t border-tint/10 pt-3">
              <label className="block text-xs text-ink-muted">Sinov darsi sanasi va vaqti</label>
              <input aria-label="Sinov darsi sanasi" type="datetime-local" className={`${input} w-full`} value={schedule[t.id] ?? ''} onChange={e => setSchedule(v => ({ ...v, [t.id]: e.target.value }))} />
              <input aria-label="Admin izohi" className={`${input} w-full`} placeholder="Izoh (ixtiyoriy)" value={notes[t.id] ?? ''} onChange={e => setNotes(v => ({ ...v, [t.id]: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <button type="button" disabled={!schedule[t.id] || act.isPending} onClick={() => act.mutate({ id: t.id, action: 'approve', body: { scheduledAt: dateToIso(schedule[t.id]), note: notes[t.id] || undefined } })} className="flex min-h-[40px] items-center justify-center gap-1 rounded-xl bg-teal px-3 py-2 text-xs font-semibold text-base disabled:opacity-40"><Check className="h-4 w-4"/>Tasdiqlash</button>
                <button type="button" disabled={act.isPending} onClick={() => act.mutate({ id: t.id, action: 'decline', body: { note: notes[t.id] || undefined } })} className="flex min-h-[40px] items-center justify-center gap-1 rounded-xl bg-coral/15 px-3 py-2 text-xs font-semibold text-coral disabled:opacity-40"><X className="h-4 w-4"/>Rad etish</button>
              </div>
            </div>}
            {t.status === 'APPROVED' && <div className="grid grid-cols-2 gap-2 border-t border-tint/10 pt-3">
              <button type="button" disabled={act.isPending} onClick={() => act.mutate({ id: t.id, action: 'attended' })} className="flex min-h-[40px] items-center justify-center gap-1 rounded-xl bg-teal px-3 py-2 text-xs font-semibold text-base"><Check className="h-4 w-4"/>Qatnashdi</button>
              <button type="button" disabled={act.isPending} onClick={() => act.mutate({ id: t.id, action: 'no-show' })} className="flex min-h-[40px] items-center justify-center gap-1 rounded-xl bg-coral/15 px-3 py-2 text-xs font-semibold text-coral"><UserRoundX className="h-4 w-4"/>Kelmagan</button>
            </div>}
            {t.status === 'ATTENDED' && <div className="space-y-2 border-t border-tint/10 pt-3">
              <label className="block text-xs text-ink-muted">Biriktiriladigan guruh (ixtiyoriy)</label>
              <select className={`${input} w-full`} value={groups[t.id] ?? ''} onChange={e => setGroups(v => ({ ...v, [t.id]: e.target.value }))}>
                <option value="">Sinov guruhidan foydalanish</option>
                {groups.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <button type="button" disabled={act.isPending} onClick={() => act.mutate({ id: t.id, action: 'admit', body: groups[t.id]?.trim() ? { groupId: groups[t.id].trim() } : {} })} className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-base"><GraduationCap className="h-4 w-4"/>Maktabga qabul qilish</button>
            </div>}
          </div>
        </Panel>)}
      </div>
      {data && data.pages > 1 && <p className="text-center text-xs text-ink-muted">Sahifa {data.page} / {data.pages} · {data.total} ta ariza</p>}
    </div>
  );
}
