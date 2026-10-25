import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Phone, Plus, Trash2, UserPlus } from 'lucide-react';
import { apiFetch } from '../../lib/api-client';
import { IMAGES } from '../../design/images';
import { PAGE_WIDE } from '../../design/tokens';
import { StaffHero, Panel } from '../../components/staff';
import { EmptyState, Skeleton } from '../../components/ui';
import { toast } from '../../components/ui/Toast';

type Status = 'NEW' | 'CONTACTED' | 'TRIAL' | 'ENROLLED' | 'LOST';
interface Lead { id: string; name: string; phone: string | null; source: string | null; interest: string | null; status: Status; note: string | null; nextContactAt: string | null; createdAt: string }
interface Res { items: Lead[]; counts: Record<Status, number> }

const STATUS: Record<Status, { l: string; c: string }> = {
  NEW: { l: 'Yangi', c: 'bg-sky/15 text-sky' },
  CONTACTED: { l: 'Aloqa qilindi', c: 'bg-gold/15 text-gold' },
  TRIAL: { l: 'Sinov darsi', c: 'bg-teal/15 text-teal' },
  ENROLLED: { l: 'Qabul qilindi', c: 'bg-teal/25 text-teal' },
  LOST: { l: 'Rad / qiziqmadi', c: 'bg-coral/15 text-coral' },
};
const ORDER = Object.keys(STATUS) as Status[];
const inputCls = 'min-h-[44px] w-full rounded-xl border border-tint/5 bg-surface/40 px-3 py-2 text-sm text-ink outline-none focus:border-gold/50';
const dayStr = (iso: string) => new Date(iso).toLocaleDateString('uz-UZ', { timeZone: 'Asia/Tashkent', day: '2-digit', month: '2-digit' });

/** Qabul (lid) CRM: kimdir qiziqsa — yozib qo'yamiz, holatini kuzatamiz, qayta aloqa sanasini belgilaymiz. */
export default function AdminLeads() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Status | 'ALL'>('ALL');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', source: '', interest: '', note: '' });

  const key = ['leads', filter];
  const { data, isLoading, error } = useQuery({ queryKey: key, queryFn: () => apiFetch<Res>(`/api/v1/leads${filter === 'ALL' ? '' : `?status=${filter}`}`) });
  const refresh = () => qc.invalidateQueries({ queryKey: ['leads'] });
  const onError = (e: any) => toast('error', e?.message || 'Xatolik');

  const create = useMutation({
    mutationFn: () => apiFetch('/api/v1/leads', { method: 'POST', data: { ...form, phone: form.phone || undefined, source: form.source || undefined, interest: form.interest || undefined, note: form.note || undefined } }),
    onSuccess: () => { setForm({ name: '', phone: '', source: '', interest: '', note: '' }); setAdding(false); refresh(); },
    onError,
  });
  const patch = useMutation({
    mutationFn: (v: { id: string; body: Record<string, unknown> }) => apiFetch(`/api/v1/leads/${v.id}`, { method: 'PATCH', data: v.body }),
    onSuccess: refresh, onError,
  });
  const del = useMutation({ mutationFn: (id: string) => apiFetch(`/api/v1/leads/${id}`, { method: 'DELETE' }), onSuccess: refresh, onError });

  const total = data ? Object.values(data.counts).reduce((a, b) => a + b, 0) : 0;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className={PAGE_WIDE}>
      <StaffHero accent="gold" image={IMAGES.hero} eyebrow="EduGo · Qabul" title="Yangi o'quvchilar (arizalar)" subtitle="Qiziqqanlarni yozib boring, aloqa va sinov darsini unutmang."
        actions={<button type="button" onClick={() => setAdding((v) => !v)} className="flex min-h-[40px] items-center gap-1.5 rounded-xl bg-gold px-3 py-2 text-xs font-semibold text-base"><Plus className="h-4 w-4" aria-hidden="true" />Ariza</button>} />

      {adding && (
        <Panel title="Yangi ariza" icon={UserPlus} accent="gold">
          <div className="space-y-2">
            <input className={inputCls} placeholder="Ism *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className={inputCls} placeholder="Telefon" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <input className={inputCls} placeholder="Manba (Instagram, tanish…)" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
              <input className={inputCls} placeholder="Qiziqish (kurs/guruh)" value={form.interest} onChange={(e) => setForm({ ...form, interest: e.target.value })} />
            </div>
            <textarea className={inputCls} rows={2} placeholder="Izoh" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            <button type="button" disabled={form.name.trim().length < 2 || create.isPending} onClick={() => create.mutate()} className="w-full rounded-xl bg-gold py-2.5 text-sm font-semibold text-base disabled:opacity-40">Saqlash</button>
          </div>
        </Panel>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist">
        {(['ALL', ...ORDER] as const).map((s) => (
          <button key={s} type="button" role="tab" aria-selected={filter === s} onClick={() => setFilter(s)}
            className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold ${filter === s ? 'bg-gold text-base' : 'bg-surface/40 text-ink-muted'}`}>
            {s === 'ALL' ? `Hammasi · ${total}` : `${STATUS[s].l} · ${data?.counts[s] ?? 0}`}
          </button>
        ))}
      </div>

      {isLoading && <Skeleton className="h-40" />}
      {error && <p className="rounded-2xl border border-coral/20 bg-coral/10 p-3 text-sm text-coral">{(error as Error).message}</p>}
      {data && data.items.length === 0 && <EmptyState icon={UserPlus} title="Arizalar yo'q" subtitle="Yangi qiziqqan odamni “Ariza” tugmasi bilan qo'shing" />}

      <ul className="space-y-2">
        {data?.items.map((l) => {
          const overdue = l.nextContactAt && l.status !== 'ENROLLED' && l.status !== 'LOST' && l.nextContactAt.slice(0, 10) < today;
          return (
            <li key={l.id} className="space-y-2 rounded-2xl border border-tint/10 bg-surface/30 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{l.name}</p>
                  <p className="truncate text-[11px] text-ink-muted">{[l.interest, l.source].filter(Boolean).join(' · ') || '—'}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS[l.status].c}`}>{STATUS[l.status].l}</span>
              </div>
              {l.note && <p className="text-xs text-ink-muted">{l.note}</p>}
              <div className="flex flex-wrap items-center gap-2">
                {l.phone && <a href={`tel:${l.phone}`} className="flex items-center gap-1 rounded-lg bg-teal/15 px-2.5 py-1.5 text-xs font-semibold text-teal"><Phone className="h-3.5 w-3.5" aria-hidden="true" />{l.phone}</a>}
                <select value={l.status} onChange={(e) => patch.mutate({ id: l.id, body: { status: e.target.value } })} className="rounded-lg border border-tint/10 bg-surface/60 px-2 py-1.5 text-xs text-ink">
                  {ORDER.map((s) => <option key={s} value={s}>{STATUS[s].l}</option>)}
                </select>
                <label className={`flex items-center gap-1 text-[11px] ${overdue ? 'text-coral' : 'text-ink-muted'}`}>
                  Aloqa:
                  <input type="date" value={l.nextContactAt ? l.nextContactAt.slice(0, 10) : ''} onChange={(e) => patch.mutate({ id: l.id, body: { nextContactAt: e.target.value ? new Date(`${e.target.value}T09:00:00+05:00`).toISOString() : null } })}
                    className="rounded-lg border border-tint/10 bg-surface/60 px-2 py-1 text-xs text-ink" />
                  {l.nextContactAt && <span className="sr-only">{dayStr(l.nextContactAt)}</span>}
                </label>
                <button type="button" aria-label="O'chirish" onClick={() => { if (window.confirm(`${l.name} arizasini o'chirasizmi?`)) del.mutate(l.id); }} className="ml-auto text-coral"><Trash2 className="h-4 w-4" /></button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
