import { useEffect, useState } from 'react';
import { ArrowLeft, GraduationCap, Search, Star } from 'lucide-react';
import { StaffHero, Panel } from '../../components/staff';
import { EmptyState, Skeleton } from '../../components/ui';
import { IMAGES } from '../../design/images';
import { PAGE } from '../../design/tokens';
import { TimetableView } from './TimetableView';
import { Catalog, Chip, MEMBER_UZ, MyMembership, MyTrial, ROLE_UZ, ScheduleSessionRow, SchoolDetail, TRIAL_UZ, dt, del, inputCls, post, useSchoolAction, useSchoolQuery } from './schoolApi';

type Tab = 'schools' | 'timetable' | 'requests';

const Stars = ({ v }: { v: number }) => (
  <span className="inline-flex items-center gap-1 text-xs font-semibold text-gold"><Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />{v ? v.toFixed(1) : '—'}</span>
);

function DetailView({ id, onBack }: { id: string; onBack: () => void }) {
  const { data, isLoading } = useSchoolQuery<SchoolDetail>(['detail', id], `/api/v1/catalog/${id}`);
  const [role, setRole] = useState<'STUDENT' | 'TEACHER'>('STUDENT');
  const [msg, setMsg] = useState('');
  const [when, setWhen] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const join = useSchoolAction(() => post('/api/v1/memberships/requests', { organizationId: id, role, message: msg || undefined }), "So'rov yuborildi");
  const trial = useSchoolAction(() => post('/api/v1/trials', { organizationId: id, preferredAt: when ? new Date(when).toISOString() : undefined, note: msg || undefined }), "Sinov darsiga yozildingiz");
  const review = useSchoolAction(() => post(`/api/v1/catalog/${id}/reviews`, { rating, comment: comment || undefined }), 'Sharh saqlandi');
  if (isLoading || !data) return <Skeleton className="h-40" />;
  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Orqaga</button>
      <Panel title={data.name} icon={GraduationCap} accent="sky" action={<Stars v={data.ratingAvg} />}>
        <p className="text-xs text-ink-muted">{[data.city, `${data.ratingCount} ta sharh`].filter(Boolean).join(' · ')}</p>
        {data.about && <p className="mt-2 text-sm text-ink">{data.about}</p>}
        {!!data.subjects.length && <div className="mt-3 flex flex-wrap gap-1.5">{data.subjects.map((s) => <span key={s} className="rounded-full bg-tint/5 px-2.5 py-1 text-[11px] text-ink-muted">{s}</span>)}</div>}
      </Panel>
      <Panel title="Qo'shilish" accent="teal">
        <div className="space-y-2">
          <div className="flex gap-2">
            {(['STUDENT', 'TEACHER'] as const).map((r) => <button key={r} type="button" onClick={() => setRole(r)} className={`flex-1 rounded-xl py-2 text-xs font-semibold ${role === r ? 'bg-teal/20 text-teal' : 'bg-tint/5 text-ink-muted'}`}>{ROLE_UZ[r]}</button>)}
          </div>
          <textarea className={inputCls} rows={2} maxLength={300} placeholder="Izoh (ixtiyoriy)" value={msg} onChange={(e) => setMsg(e.target.value)} />
          <button type="button" disabled={join.isPending} onClick={() => join.mutate(undefined)} className="w-full rounded-xl bg-teal py-2.5 text-sm font-semibold text-base disabled:opacity-40">A'zo bo'lish so'rovi</button>
          <div className="border-t border-tint/5 pt-2">
            <label className="mb-1 block text-[11px] text-ink-muted">Sinov darsi uchun qulay vaqt (ixtiyoriy)</label>
            <input type="datetime-local" className={inputCls} value={when} onChange={(e) => setWhen(e.target.value)} />
            <button type="button" disabled={trial.isPending} onClick={() => trial.mutate(undefined)} className="mt-2 w-full rounded-xl bg-gold py-2.5 text-sm font-semibold text-base disabled:opacity-40">Sinov darsiga yozilish</button>
          </div>
        </div>
      </Panel>
      <Panel title="Sharhlar" icon={Star} accent="gold">
        {!data.reviews.length ? <p className="text-xs text-ink-muted">Hali sharh yo'q</p> : (
          <ul className="space-y-2">{data.reviews.map((r, i) => (
            <li key={i} className="text-sm"><span className="font-semibold text-ink">{r.author}</span> <Stars v={r.rating} />{r.comment && <p className="text-xs text-ink-muted">{r.comment}</p>}</li>
          ))}</ul>
        )}
        <div className="mt-3 space-y-2 border-t border-tint/5 pt-3">
          <p className="text-[11px] text-ink-muted">Sharhni faqat shu maktabning a'zolari qoldira oladi.</p>
          <div className="flex gap-1">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" aria-label={`${n} ball`} onClick={() => setRating(n)} className={`rounded-lg px-2.5 py-1.5 text-sm font-bold ${n <= rating ? 'bg-gold/20 text-gold' : 'bg-tint/5 text-ink-faint'}`}>{n}</button>)}</div>
          <input className={inputCls} maxLength={500} placeholder="Izoh" value={comment} onChange={(e) => setComment(e.target.value)} />
          <button type="button" disabled={review.isPending} onClick={() => review.mutate(undefined)} className="w-full rounded-xl bg-tint/10 py-2.5 text-sm font-semibold text-ink disabled:opacity-40">Sharh qoldirish</button>
        </div>
      </Panel>
    </div>
  );
}

function SchoolsTab() {
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [sort, setSort] = useState('rating');
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { const t = setTimeout(() => setSearch(input.trim()), 300); return () => clearTimeout(t); }, [input]);
  const { data: cities } = useSchoolQuery<{ city: string }[]>(['cities'], '/api/v1/catalog/cities');
  const { data, isLoading } = useSchoolQuery<Catalog>(['catalog', search, city, sort], `/api/v1/catalog?sort=${sort}${search ? `&search=${encodeURIComponent(search)}` : ''}${city ? `&city=${encodeURIComponent(city)}` : ''}`);
  if (open) return <DetailView id={open} onBack={() => setOpen(null)} />;
  return (
    <div className="space-y-3">
      <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" /><input className={`${inputCls} pl-9`} placeholder="Maktab qidirish…" value={input} onChange={(e) => setInput(e.target.value)} /></div>
      <div className="flex gap-2">
        <select aria-label="Shahar" className={inputCls} value={city} onChange={(e) => setCity(e.target.value)}><option value="">Barcha shaharlar</option>{cities?.map((c) => <option key={c.city} value={c.city}>{c.city}</option>)}</select>
        <select aria-label="Saralash" className={inputCls} value={sort} onChange={(e) => setSort(e.target.value)}><option value="rating">Reyting</option><option value="newest">Yangi</option><option value="name">Nomi</option></select>
      </div>
      {isLoading ? <Skeleton className="h-32" /> : !data?.items.length ? <EmptyState icon={GraduationCap} title="Maktab topilmadi" /> : (
        <ul className="space-y-2">{data.items.map((s) => (
          <li key={s.id}><button type="button" onClick={() => setOpen(s.id)} className="flex w-full items-center gap-3 rounded-2xl border border-tint/10 bg-surface/40 p-3 text-left">
            <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-ink">{s.name}</div><div className="truncate text-[11px] text-ink-muted">{s.city ?? 'Shahar ko\'rsatilmagan'} · {s.ratingCount} sharh</div></div>
            <Stars v={s.ratingAvg} />
          </button></li>
        ))}</ul>
      )}
    </div>
  );
}

function RequestsTab() {
  const { data: m } = useSchoolQuery<MyMembership[]>(['mine-m'], '/api/v1/memberships/mine');
  const { data: t } = useSchoolQuery<MyTrial[]>(['mine-t'], '/api/v1/trials/mine');
  const activate = useSchoolAction((id: string) => post(`/api/v1/memberships/${id}/activate`), 'Maktab almashtirildi', () => window.location.reload());
  const mine = m?.filter((r) => r.status === 'ACTIVE') ?? [];
  const requests = m?.filter((r) => r.status !== 'ACTIVE') ?? [];
  const cancelM = useSchoolAction((id: string) => del(`/api/v1/memberships/requests/${id}`), "So'rov bekor qilindi");
  const cancelT = useSchoolAction((id: string) => del(`/api/v1/trials/${id}`), 'Bekor qilindi');
  return (
    <div className="space-y-4">
      <Panel title="Mening maktablarim" icon={GraduationCap} accent="sky" flush>
        {!mine.length ? <p className="p-5 text-xs text-ink-muted">Siz hali hech qaysi maktab a'zosi emassiz. «Maktablar» bo'limidan maktab tanlab, so'rov yuboring. Bir nechta maktab a'zosi bo'lish mumkin.</p> : <ul className="divide-y divide-tint/5">{mine.map((r) => (
          <li key={r.id} className="flex items-center gap-3 px-4 py-3"><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-ink">{r.organization.name}</div><div className="text-[11px] text-ink-muted">{ROLE_UZ[r.role] ?? r.role}</div></div>
            {r.isActive ? <Chip s={{ l: 'Hozirgi', c: 'bg-teal/15 text-teal' }} /> : r.role !== 'STUDENT' ? null : <button type="button" disabled={activate.isPending} onClick={() => activate.mutate(r.id)} className="rounded-xl bg-sky/15 px-2.5 py-1.5 text-xs font-semibold text-sky">Tanlash</button>}</li>
        ))}</ul>}
      </Panel>
      <Panel title="A'zolik so'rovlari" accent="teal" flush>
        {!requests.length ? <p className="p-5 text-xs text-ink-muted">So'rov yo'q</p> : <ul className="divide-y divide-tint/5">{requests.map((r) => (
          <li key={r.id} className="flex items-center gap-3 px-4 py-3"><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-ink">{r.organization.name}</div><div className="text-[11px] text-ink-muted">{ROLE_UZ[r.role] ?? r.role} · {dt(r.requestedAt)}</div></div>
            <Chip s={MEMBER_UZ[r.status] ?? MEMBER_UZ.PENDING} />
            {r.status === 'PENDING' && <button type="button" onClick={() => cancelM.mutate(r.id)} className="rounded-xl bg-coral/10 px-2.5 py-1.5 text-xs font-semibold text-coral">Bekor</button>}</li>
        ))}</ul>}
      </Panel>
      <Panel title="Sinov darslari" accent="gold" flush>
        {!t?.length ? <p className="p-5 text-xs text-ink-muted">Sinov darsi yo'q</p> : <ul className="divide-y divide-tint/5">{t.map((r) => (
          <li key={r.id} className="flex items-center gap-3 px-4 py-3"><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-ink">{r.organization.name}</div><div className="text-[11px] text-ink-muted">{r.scheduledAt ? `Dars: ${dt(r.scheduledAt)}` : r.preferredAt ? `Xohish: ${dt(r.preferredAt)}` : 'Vaqt belgilanmagan'}{r.decisionNote ? ` · ${r.decisionNote}` : ''}</div></div>
            <Chip s={TRIAL_UZ[r.status] ?? TRIAL_UZ.REQUESTED} />
            {(r.status === 'REQUESTED' || r.status === 'APPROVED') && <button type="button" onClick={() => cancelT.mutate(r.id)} className="rounded-xl bg-coral/10 px-2.5 py-1.5 text-xs font-semibold text-coral">Bekor</button>}</li>
        ))}</ul>}
      </Panel>
    </div>
  );
}

function StudentSessions() {
  const { data } = useSchoolQuery<ScheduleSessionRow[]>(['my-schedule-sessions'], '/api/v1/timetable/sessions/mine');
  if (!data?.length) return null;
  return <Panel title="Individual va bir martalik mashg‘ulotlar" accent="sky" flush><ul className="divide-y divide-tint/5">{data.map((x) => <li key={x.id} className="px-4 py-3"><div className="text-sm font-semibold text-ink">{x.title}</div><div className="mt-1 text-xs text-ink-muted">{dt(x.startsAt)} – {dt(x.endsAt)}{x.room ? ' · ' + x.room : ''}</div></li>)}</ul></Panel>;
}

/** O'quvchi uchun: maktablar katalogi, o'z jadvali, so'rovlar. */
export default function StudentSchool() {
  const [tab, setTab] = useState<Tab>('schools');
  const tabs: [Tab, string][] = [['schools', 'Maktablar'], ['timetable', 'Jadvalim'], ['requests', 'Maktablarim']];
  return (
    <div className={PAGE}>
      <StaffHero accent="sky" image={IMAGES.hero} eyebrow="EduGo · Maktab" title="Maktablar va jadval" subtitle="Maktab toping, a'zo bo'ling yoki sinov darsiga yoziling." />
      <div className="flex gap-2">{tabs.map(([k, l]) => <button key={k} type="button" onClick={() => setTab(k)} className={`flex-1 rounded-xl py-2 text-xs font-semibold ${tab === k ? 'bg-sky/20 text-sky' : 'bg-tint/5 text-ink-muted'}`}>{l}</button>)}</div>
      {tab === 'schools' && <SchoolsTab />}
      {tab === 'timetable' && <div className="space-y-4"><TimetableView url="/api/v1/timetable/mine" keyName="mine" who="group" /><StudentSessions /></div>}
      {tab === 'requests' && <RequestsTab />}
    </div>
  );
}
