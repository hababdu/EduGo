import { useEffect, useState } from 'react';
import { CalendarDays, GraduationCap, Settings, Users } from 'lucide-react';
import { StaffHero, Panel, Avatar } from '../../components/staff';
import { Skeleton } from '../../components/ui';
import { IMAGES } from '../../design/images';
import { PAGE_WIDE } from '../../design/tokens';
import { TimetableView } from './TimetableView';
import { AssignmentRow, Chip, DAYS, InvoiceRow, MEMBER_UZ, MemberRow, Paged, ROLE_UZ, Slot, TRIAL_UZ, TrialRow, del, dt, inputCls, money, patch, post, useSchoolAction, useSchoolQuery } from './schoolApi';

type Tab = 'members' | 'trials' | 'timetable' | 'profile';
const btn = (c: string) => `rounded-xl px-2.5 py-1.5 text-xs font-semibold ${c}`;
const ok = 'bg-teal/15 text-teal';
const bad = 'bg-coral/10 text-coral';
const neutral = 'bg-tint/10 text-ink';

/* ───────── A'zolar ───────── */
function MembersTab() {
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => { const t = setTimeout(() => { setSearch(input.trim()); setPage(1); }, 300); return () => clearTimeout(t); }, [input]);
  const { data: pending } = useSchoolQuery<Paged<MemberRow>>(['m-pending'], '/api/v1/admin/memberships?status=PENDING');
  const { data, isLoading } = useSchoolQuery<Paged<MemberRow>>(['m-active', search, role, page], `/api/v1/admin/memberships?status=ACTIVE&page=${page}${search ? `&search=${encodeURIComponent(search)}` : ''}${role ? `&role=${role}` : ''}`);
  const approve = useSchoolAction((v: { id: string; role: string }) => post(`/api/v1/admin/memberships/${v.id}/approve`, { role: v.role }), 'Qabul qilindi');
  const reject = useSchoolAction((id: string) => post(`/api/v1/admin/memberships/${id}/reject`), 'Rad etildi');
  const change = useSchoolAction((v: { id: string; role: string }) => patch(`/api/v1/admin/memberships/${v.id}/role`, { role: v.role }), "Rol o'zgartirildi");
  const remove = useSchoolAction((id: string) => del(`/api/v1/admin/memberships/${id}`), 'Maktabdan chiqarildi');
  return (
    <div className="space-y-4">
      {!!pending?.items.length && (
        <Panel title={`Qo'shilish so'rovlari · ${pending.total}`} icon={Users} accent="gold" flush>
          <ul className="divide-y divide-tint/5">{pending.items.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
              <Avatar name={m.user.name} />
              <div className="min-w-0 flex-1 basis-32"><div className="truncate text-sm font-semibold text-ink">{m.user.name}</div><div className="truncate text-[11px] text-ink-muted">{ROLE_UZ[m.role]} · {dt(m.requestedAt)}{m.message ? ` · ${m.message}` : ''}</div></div>
              <button type="button" disabled={approve.isPending} onClick={() => approve.mutate({ id: m.id, role: m.role })} className={btn(ok)}>Qabul</button>
              <button type="button" disabled={reject.isPending} onClick={() => reject.mutate(m.id)} className={btn(bad)}>Rad</button>
            </li>
          ))}</ul>
        </Panel>
      )}
      <Panel title={`A'zolar${data ? ` · ${data.total}` : ''}`} icon={Users} accent="sky" flush>
        <div className="space-y-2 border-b border-tint/5 p-3">
          <input className={inputCls} placeholder="Ism yoki username…" value={input} onChange={(e) => setInput(e.target.value)} />
          <div className="flex flex-wrap gap-1.5">{[['', 'Hammasi'], ['STUDENT', "O'quvchilar"], ['TEACHER', "O'qituvchilar"], ['ADMIN', 'Adminlar']].map(([v, l]) => (
            <button key={v} type="button" onClick={() => { setRole(v); setPage(1); }} className={`rounded-full px-3 py-1 text-xs font-semibold ${role === v ? 'bg-sky/20 text-sky' : 'bg-tint/5 text-ink-muted'}`}>{l}</button>
          ))}</div>
        </div>
        {isLoading ? <div className="p-5"><Skeleton className="h-24" /></div> : !data?.items.length ? <p className="p-6 text-center text-xs text-ink-muted">A'zo topilmadi</p> : (
          <ul className="divide-y divide-tint/5">{data.items.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
              <Avatar name={m.user.name} />
              <div className="min-w-0 flex-1 basis-32"><div className="truncate text-sm font-semibold text-ink">{m.user.name}</div><div className="truncate text-[11px] text-ink-muted">{m.user.username ? `@${m.user.username} · ` : ''}ID {m.user.telegramId}</div></div>
              {m.role === 'ADMIN' ? <Chip s={{ l: 'Admin', c: 'bg-sky/15 text-sky' }} /> : (
                <>
                  <select aria-label="Rol" className="rounded-xl bg-tint/5 px-2 py-1.5 text-xs font-semibold text-ink" value={m.role} disabled={change.isPending}
                    onChange={(e) => { if (window.confirm(`${m.user.name} — «${ROLE_UZ[e.target.value]}» qilinsinmi?`)) change.mutate({ id: m.id, role: e.target.value }); }}>
                    <option value="STUDENT">{ROLE_UZ.STUDENT}</option><option value="TEACHER">{ROLE_UZ.TEACHER}</option>
                  </select>
                  <button type="button" disabled={remove.isPending} onClick={() => { if (window.confirm(`${m.user.name} maktabdan chiqarilsinmi?`)) remove.mutate(m.id); }} className={btn(bad)}>Chiqarish</button>
                </>
              )}
            </li>
          ))}</ul>
        )}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-between border-t border-tint/5 px-4 py-3 text-xs text-ink-muted">
            <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className={`${btn('bg-tint/5')} disabled:opacity-40`}>Oldingi</button><span>{data.page} / {data.pages}</span>
            <button type="button" disabled={page >= data.pages} onClick={() => setPage(page + 1)} className={`${btn('bg-tint/5')} disabled:opacity-40`}>Keyingi</button>
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ───────── Sinov darslari ───────── */
function TrialsTab() {
  const [status, setStatus] = useState('REQUESTED');
  const [when, setWhen] = useState<Record<string, string>>({});
  const { data, isLoading } = useSchoolQuery<Paged<TrialRow>>(['trials', status], `/api/v1/admin/trials?status=${status}`);
  const { data: groups } = useSchoolQuery<{ id: string; name: string }[]>(['groups'], '/api/v1/groups');
  const [grp, setGrp] = useState<Record<string, string>>({});
  const act = useSchoolAction((v: { id: string; a: string; body?: unknown }) => post(`/api/v1/admin/trials/${v.id}/${v.a}`, v.body), 'Bajarildi');
  return (
    <Panel title="Sinov darslari" icon={GraduationCap} accent="gold" flush>
      <div className="flex flex-wrap gap-1.5 border-b border-tint/5 p-3">{Object.entries(TRIAL_UZ).filter(([k]) => k !== 'CANCELLED').map(([k, v]) => (
        <button key={k} type="button" onClick={() => setStatus(k)} className={`rounded-full px-3 py-1 text-xs font-semibold ${status === k ? 'bg-gold/20 text-gold' : 'bg-tint/5 text-ink-muted'}`}>{v.l}</button>
      ))}</div>
      {isLoading ? <div className="p-5"><Skeleton className="h-24" /></div> : !data?.items.length ? <p className="p-6 text-center text-xs text-ink-muted">Bo'sh</p> : (
        <ul className="divide-y divide-tint/5">{data.items.map((t) => (
          <li key={t.id} className="space-y-2 px-4 py-3">
            <div className="flex items-center gap-2"><Avatar name={t.student.name} />
              <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-ink">{t.student.name}{t.requestedByParent ? ' (ota-ona orqali)' : ''}</div><div className="truncate text-[11px] text-ink-muted">{t.group ? `${t.group.name} · ` : ''}{t.scheduledAt ? `Dars: ${dt(t.scheduledAt)}` : t.preferredAt ? `Xohish: ${dt(t.preferredAt)}` : 'Vaqt yo\'q'}{t.note ? ` · ${t.note}` : ''}</div></div>
              <Chip s={TRIAL_UZ[t.status]} /></div>
            {t.status === 'REQUESTED' && (
              <div className="flex flex-wrap gap-2"><input type="datetime-local" aria-label="Dars vaqti" className="min-h-[40px] flex-1 rounded-xl border border-tint/5 bg-surface/40 px-2 text-xs text-ink" value={when[t.id] ?? ''} onChange={(e) => setWhen({ ...when, [t.id]: e.target.value })} />
                <button type="button" disabled={!when[t.id] || act.isPending} onClick={() => act.mutate({ id: t.id, a: 'approve', body: { scheduledAt: new Date(when[t.id]).toISOString() } })} className={`${btn(ok)} disabled:opacity-40`}>Tasdiqlash</button>
                <button type="button" onClick={() => act.mutate({ id: t.id, a: 'decline', body: {} })} className={btn(bad)}>Rad</button></div>
            )}
            {t.status === 'APPROVED' && <div className="flex gap-2"><button type="button" onClick={() => act.mutate({ id: t.id, a: 'attended' })} className={btn(ok)}>Qatnashdi</button><button type="button" onClick={() => act.mutate({ id: t.id, a: 'no-show' })} className={btn(bad)}>Kelmadi</button><button type="button" onClick={() => act.mutate({ id: t.id, a: 'decline', body: {} })} className={btn(neutral)}>Bekor</button></div>}
            {t.status === 'ATTENDED' && (
              <div className="flex gap-2"><select aria-label="Guruh" className="min-h-[40px] flex-1 rounded-xl bg-tint/5 px-2 text-xs text-ink" value={grp[t.id] ?? t.group?.id ?? ''} onChange={(e) => setGrp({ ...grp, [t.id]: e.target.value })}>
                <option value="">Guruhsiz</option>{groups?.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
                <button type="button" disabled={act.isPending} onClick={() => act.mutate({ id: t.id, a: 'admit', body: { groupId: (grp[t.id] ?? t.group?.id) || undefined } })} className={btn(ok)}>Qabul qilish</button></div>
            )}
          </li>
        ))}</ul>
      )}
    </Panel>
  );
}

/* ───────── Fanlar, tayinlash, jadval ───────── */
function TimetableTab() {
  const { data: subjects } = useSchoolQuery<{ id: string; name: string }[]>(['subjects'], '/api/v1/admin/teaching/subjects');
  const { data: assigns } = useSchoolQuery<AssignmentRow[]>(['assigns'], '/api/v1/admin/teaching/assignments');
  const { data: groups } = useSchoolQuery<{ id: string; name: string }[]>(['groups'], '/api/v1/groups');
  const { data: members } = useSchoolQuery<Paged<MemberRow>>(['m-teachers'], '/api/v1/admin/memberships?status=ACTIVE&role=TEACHER');
  const { data: slots } = useSchoolQuery<Slot[]>(['tt', 'admin'], '/api/v1/admin/teaching/timetable');
  const [name, setName] = useState('');
  const [a, setA] = useState({ teacherId: '', subjectId: '', groupId: '' });
  const [s, setS] = useState({ assignmentId: '', weekday: 1, startTime: '09:00', endTime: '10:00', room: '' });
  const addSubject = useSchoolAction(() => post('/api/v1/admin/teaching/subjects', { name }), "Fan qo'shildi", () => setName(''));
  const rmSubject = useSchoolAction((id: string) => del(`/api/v1/admin/teaching/subjects/${id}`), "Fan o'chirildi");
  const assign = useSchoolAction(() => post('/api/v1/admin/teaching/assignments', a), 'Tayinlandi');
  const unassign = useSchoolAction((id: string) => del(`/api/v1/admin/teaching/assignments/${id}`), "Tayinlash o'chirildi");
  const addSlot = useSchoolAction(() => post(`/api/v1/admin/teaching/assignments/${s.assignmentId}/slots`, { weekday: s.weekday, startTime: s.startTime, endTime: s.endTime, room: s.room || undefined }), "Dars qo'shildi");
  const rmSlot = useSchoolAction((id: string) => del(`/api/v1/admin/teaching/slots/${id}`), "Dars o'chirildi");
  return (
    <div className="space-y-4">
      <Panel title="Fanlar" icon={CalendarDays} accent="teal">
        <div className="flex flex-wrap gap-1.5">{subjects?.map((x) => <span key={x.id} className="inline-flex items-center gap-1 rounded-full bg-tint/5 px-2.5 py-1 text-xs text-ink">{x.name}<button type="button" aria-label={`${x.name} ni o'chirish`} onClick={() => { if (window.confirm(`«${x.name}» o'chirilsinmi?`)) rmSubject.mutate(x.id); }} className="text-coral">×</button></span>)}{!subjects?.length && <span className="text-xs text-ink-muted">Fan yo'q</span>}</div>
        <div className="mt-3 flex gap-2"><input className={inputCls} placeholder="Yangi fan (masalan, Fizika)" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} /><button type="button" disabled={name.trim().length < 2 || addSubject.isPending} onClick={() => addSubject.mutate(undefined)} className={`${btn(ok)} disabled:opacity-40`}>Qo'shish</button></div>
      </Panel>
      <Panel title="O'qituvchi tayinlash" accent="sky">
        <div className="space-y-2">
          <select aria-label="O'qituvchi" className={inputCls} value={a.teacherId} onChange={(e) => setA({ ...a, teacherId: e.target.value })}><option value="">O'qituvchi…</option>{members?.items.map((m) => <option key={m.user.id} value={m.user.id}>{m.user.name}</option>)}</select>
          <div className="grid grid-cols-2 gap-2">
            <select aria-label="Fan" className={inputCls} value={a.subjectId} onChange={(e) => setA({ ...a, subjectId: e.target.value })}><option value="">Fan…</option>{subjects?.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
            <select aria-label="Sinf" className={inputCls} value={a.groupId} onChange={(e) => setA({ ...a, groupId: e.target.value })}><option value="">Sinf (guruh)…</option>{groups?.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
          </div>
          <button type="button" disabled={!a.teacherId || !a.subjectId || !a.groupId || assign.isPending} onClick={() => assign.mutate(undefined)} className="w-full rounded-xl bg-sky py-2.5 text-sm font-semibold text-base disabled:opacity-40">Tayinlash</button>
        </div>
        {!!assigns?.length && <ul className="mt-3 divide-y divide-tint/5">{assigns.map((x) => (
          <li key={x.id} className="flex items-center gap-2 py-2 text-xs"><span className="min-w-0 flex-1 truncate text-ink">{x.subject.name} · {x.group.name} · <span className="text-ink-muted">{x.teacher.name}</span> · {x.slots} dars</span><button type="button" onClick={() => { if (window.confirm("Tayinlash va uning darslari o'chirilsinmi?")) unassign.mutate(x.id); }} className={btn(bad)}>O'chirish</button></li>
        ))}</ul>}
      </Panel>
      <Panel title="Dars qo'shish" accent="gold">
        <div className="space-y-2">
          <select aria-label="Tayinlash" className={inputCls} value={s.assignmentId} onChange={(e) => setS({ ...s, assignmentId: e.target.value })}><option value="">Fan · sinf · o'qituvchi…</option>{assigns?.map((x) => <option key={x.id} value={x.id}>{x.subject.name} · {x.group.name} · {x.teacher.name}</option>)}</select>
          <div className="grid grid-cols-3 gap-2">
            <select aria-label="Kun" className={inputCls} value={s.weekday} onChange={(e) => setS({ ...s, weekday: Number(e.target.value) })}>{DAYS.slice(1).map((d, i) => <option key={d} value={i + 1}>{d}</option>)}</select>
            <input type="time" aria-label="Boshlanish" className={inputCls} value={s.startTime} onChange={(e) => setS({ ...s, startTime: e.target.value })} />
            <input type="time" aria-label="Tugash" className={inputCls} value={s.endTime} onChange={(e) => setS({ ...s, endTime: e.target.value })} />
          </div>
          <input className={inputCls} placeholder="Xona (ixtiyoriy)" maxLength={40} value={s.room} onChange={(e) => setS({ ...s, room: e.target.value })} />
          <button type="button" disabled={!s.assignmentId || addSlot.isPending} onClick={() => addSlot.mutate(undefined)} className="w-full rounded-xl bg-gold py-2.5 text-sm font-semibold text-base disabled:opacity-40">Darsni qo'shish</button>
        </div>
      </Panel>
      <Panel title="Maktab jadvali" accent="teal" flush>
        {!slots?.length ? <p className="p-5 text-xs text-ink-muted">Jadval bo'sh</p> : <ul className="divide-y divide-tint/5">{slots.map((x) => (
          <li key={x.id} className="flex items-center gap-2 px-4 py-2.5 text-xs"><span className="w-24 shrink-0 font-semibold text-ink">{DAYS[x.weekday].slice(0, 3)} {x.startTime}–{x.endTime}</span><span className="min-w-0 flex-1 truncate text-ink-muted">{x.subject} · {x.group.name} · {x.teacher.name}{x.room ? ` · ${x.room}` : ''}</span><button type="button" aria-label="Darsni o'chirish" onClick={() => rmSlot.mutate(x.id)} className="text-coral">×</button></li>
        ))}</ul>}
      </Panel>
    </div>
  );
}

/* ───────── Profil va obuna ───────── */
function ProfileTab() {
  const [f, setF] = useState({ city: '', about: '', isPublic: true });
  const { data: inv } = useSchoolQuery<InvoiceRow[]>(['invoices'], '/api/v1/admin/subscription/invoices');
  const save = useSchoolAction(() => patch('/api/v1/admin/school-profile', f), 'Saqlandi');
  return (
    <div className="space-y-4">
      <Panel title="Katalogdagi profil" icon={Settings} accent="sky">
        <div className="space-y-2">
          <input className={inputCls} placeholder="Shahar" maxLength={60} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
          <textarea className={inputCls} rows={3} maxLength={1000} placeholder="Maktab haqida" value={f.about} onChange={(e) => setF({ ...f, about: e.target.value })} />
          <label className="flex items-center gap-2 text-xs text-ink"><input type="checkbox" checked={f.isPublic} onChange={(e) => setF({ ...f, isPublic: e.target.checked })} />Katalogda ko'rinsin</label>
          <button type="button" disabled={save.isPending} onClick={() => save.mutate(undefined)} className="w-full rounded-xl bg-sky py-2.5 text-sm font-semibold text-base disabled:opacity-40">Saqlash</button>
          <p className="text-[11px] text-ink-muted">Shaharni o'chirish uchun maydonni bo'sh qoldirib saqlang.</p>
        </div>
      </Panel>
      <Panel title="Obuna hisoblari" accent="gold" flush>
        {!inv?.length ? <p className="p-5 text-xs text-ink-muted">Hisob yo'q</p> : <ul className="divide-y divide-tint/5">{inv.map((i) => (
          <li key={i.id} className="flex items-center gap-3 px-4 py-3 text-xs"><span className="font-semibold text-ink">{i.month}</span><span className="flex-1 text-ink-muted">{money(i.amount)}</span><Chip s={i.status === 'PAID' ? { l: "To'langan", c: 'bg-teal/15 text-teal' } : i.status === 'PENDING' ? { l: 'Kutilmoqda', c: 'bg-gold/15 text-gold' } : { l: 'Bekor', c: 'bg-tint/10 text-ink-muted' }} /></li>
        ))}</ul>}
      </Panel>
    </div>
  );
}

/** Maktab admini: a'zolar, sinov darslari, jadval, profil va obuna. */
export default function AdminSchool() {
  const [tab, setTab] = useState<Tab>('members');
  const { data: ctx } = useSchoolQuery<{ pending?: { joinRequests: number; trialRequests: number } }>(['ctx'], '/api/v1/panel/context');
  const tabs: [Tab, string, number?][] = [['members', "A'zolar", ctx?.pending?.joinRequests], ['trials', 'Sinov', ctx?.pending?.trialRequests], ['timetable', 'Jadval'], ['profile', 'Profil']];
  return (
    <div className={PAGE_WIDE}>
      <StaffHero accent="sky" image={IMAGES.hero} eyebrow="EduGo · Maktab" title="Maktab boshqaruvi" subtitle="A'zolik so'rovlari, sinov darslari, o'qituvchilar va dars jadvali." />
      <div className="flex gap-2">{tabs.map(([k, l, n]) => (
        <button key={k} type="button" onClick={() => setTab(k)} className={`relative flex-1 rounded-xl py-2 text-xs font-semibold ${tab === k ? 'bg-sky/20 text-sky' : 'bg-tint/5 text-ink-muted'}`}>{l}{!!n && <span className="ml-1 rounded-full bg-coral px-1.5 py-0.5 text-[10px] text-white">{n}</span>}</button>
      ))}</div>
      {tab === 'members' && <MembersTab />}
      {tab === 'trials' && <TrialsTab />}
      {tab === 'timetable' && <TimetableTab />}
      {tab === 'profile' && <ProfileTab />}
    </div>
  );
}
