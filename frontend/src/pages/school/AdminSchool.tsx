import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminGroups from '../admin/AdminGroups';
import AdminTrials from '../admin/AdminTrials';
import { CalendarDays, GraduationCap, Settings, Users } from 'lucide-react';
import { StaffHero, Panel, Avatar } from '../../components/staff';
import { Skeleton } from '../../components/ui';
import { IMAGES } from '../../design/images';
import { PAGE_WIDE } from '../../design/tokens';
import { TimetableView } from './TimetableView';
import { uploadPosterImage } from '../../lib/image-upload';
import { getFullUrl } from '../../hooks/useImageUpload';
import { toast } from '../../components/ui/Toast';
import { AssignmentRow, Chip, DAYS, InvoiceRow, MEMBER_UZ, MemberRow, Paged, ROLE_UZ, ScheduleSessionRow, Slot, TRIAL_UZ, TrialRow, del, dt, inputCls, money, patch, post, useSchoolAction, useSchoolQuery } from './schoolApi';

type Tab = 'members' | 'groups' | 'trials' | 'timetable' | 'profile';
const TABS: Tab[] = ['members', 'groups', 'trials', 'timetable', 'profile'];
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

/* ───────── Fanlar, tayinlash, jadval ───────── */
function TimetableTab() {
  const { data: subjects } = useSchoolQuery<{ id: string; name: string }[]>(['subjects'], '/api/v1/admin/teaching/subjects');
  const { data: assigns } = useSchoolQuery<AssignmentRow[]>(['assigns'], '/api/v1/admin/teaching/assignments');
  const { data: groups } = useSchoolQuery<{ id: string; name: string }[]>(['groups'], '/api/v1/groups');
  const { data: members } = useSchoolQuery<Paged<MemberRow>>(['m-teachers'], '/api/v1/admin/memberships?status=ACTIVE&role=TEACHER');
  const { data: slots } = useSchoolQuery<Slot[]>(['tt', 'admin'], '/api/v1/admin/teaching/timetable');
  const { data: sessions } = useSchoolQuery<ScheduleSessionRow[]>(['schedule-sessions'], '/api/v1/admin/teaching/sessions');
  const [name, setName] = useState('');
  const [a, setA] = useState({ teacherId: '', subjectId: '', groupId: '' });
  const [s, setS] = useState({ assignmentId: '', weekday: 1, startTime: '09:00', endTime: '10:00', room: '', startsOn: '', endsOn: '' });
  const [session, setSession] = useState({ title: '', teacherId: '', studentId: '', groupId: '', startsAt: '', endsAt: '', room: '' });
  const addSubject = useSchoolAction(() => post('/api/v1/admin/teaching/subjects', { name }), "Fan qo'shildi", () => setName(''));
  const rmSubject = useSchoolAction((id: string) => del(`/api/v1/admin/teaching/subjects/${id}`), "Fan o'chirildi");
  const assign = useSchoolAction(() => post('/api/v1/admin/teaching/assignments', a), 'Tayinlandi');
  const unassign = useSchoolAction((id: string) => del(`/api/v1/admin/teaching/assignments/${id}`), "Tayinlash o'chirildi");
  const addSlot = useSchoolAction(() => post(`/api/v1/admin/teaching/assignments/${s.assignmentId}/slots`, { weekday: s.weekday, startTime: s.startTime, endTime: s.endTime, room: s.room || undefined, startsOn: s.startsOn || undefined, endsOn: s.endsOn || undefined }), "Dars qo'shildi");
  const rmSlot = useSchoolAction((id: string) => del(`/api/v1/admin/teaching/slots/${id}`), "Dars o'chirildi");
  const addSession = useSchoolAction(() => post('/api/v1/admin/teaching/sessions', { ...session, startsAt: new Date(session.startsAt).toISOString(), endsAt: new Date(session.endsAt).toISOString(), studentId: session.studentId || undefined, groupId: session.groupId || undefined, room: session.room || undefined }), "Mashg'ulot qo'shildi", () => setSession({ title: '', teacherId: '', studentId: '', groupId: '', startsAt: '', endsAt: '', room: '' }));
  const cancelSession = useSchoolAction((id: string) => del(`/api/v1/admin/teaching/sessions/${id}`), 'Mashg‘ulot bekor qilindi');
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
          <div className="grid grid-cols-2 gap-2"><label className="text-[11px] text-ink-muted">Amal qilish boshlanishi<input type="date" className={inputCls} value={s.startsOn} onChange={(e) => setS({ ...s, startsOn: e.target.value })} /></label><label className="text-[11px] text-ink-muted">Amal qilish tugashi<input type="date" className={inputCls} value={s.endsOn} onChange={(e) => setS({ ...s, endsOn: e.target.value })} /></label></div>
          <input className={inputCls} placeholder="Xona (ixtiyoriy)" maxLength={40} value={s.room} onChange={(e) => setS({ ...s, room: e.target.value })} />
          <button type="button" disabled={!s.assignmentId || addSlot.isPending} onClick={() => addSlot.mutate(undefined)} className="w-full rounded-xl bg-gold py-2.5 text-sm font-semibold text-base disabled:opacity-40">Darsni qo'shish</button>
        </div>
      </Panel>
      <Panel title="Individual va bir martalik mashg'ulot" accent="sky">
        <div className="space-y-2">
          <input className={inputCls} placeholder="Mashg'ulot nomi" maxLength={120} value={session.title} onChange={(e) => setSession({ ...session, title: e.target.value })} />
          <select aria-label="O'qituvchi" className={inputCls} value={session.teacherId} onChange={(e) => setSession({ ...session, teacherId: e.target.value })}><option value="">O'qituvchi…</option>{members?.items.map((m) => <option key={m.user.id} value={m.user.id}>{m.user.name}</option>)}</select>
          <div className="grid grid-cols-2 gap-2">
            <select aria-label="O'quvchi (ixtiyoriy)" className={inputCls} value={session.studentId} onChange={(e) => setSession({ ...session, studentId: e.target.value, groupId: '' })}><option value="">O'quvchi tanlash…</option>{members?.items.filter((m) => m.role === 'STUDENT').map((m) => <option key={m.user.id} value={m.user.id}>{m.user.name}</option>)}</select>
            <select aria-label="Guruh (ixtiyoriy)" className={inputCls} value={session.groupId} onChange={(e) => setSession({ ...session, groupId: e.target.value, studentId: '' })}><option value="">Guruh tanlash…</option>{groups?.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
          </div>
          <div className="grid grid-cols-2 gap-2"><label className="text-[11px] text-ink-muted">Boshlanish<input type="datetime-local" className={inputCls} value={session.startsAt} onChange={(e) => setSession({ ...session, startsAt: e.target.value })} /></label><label className="text-[11px] text-ink-muted">Tugash<input type="datetime-local" className={inputCls} value={session.endsAt} onChange={(e) => setSession({ ...session, endsAt: e.target.value })} /></label></div>
          <input className={inputCls} placeholder="Xona (ixtiyoriy)" value={session.room} onChange={(e) => setSession({ ...session, room: e.target.value })} />
          <button type="button" disabled={!session.title.trim() || !session.teacherId || (!session.studentId && !session.groupId) || !session.startsAt || !session.endsAt || addSession.isPending} onClick={() => addSession.mutate(undefined)} className="w-full rounded-xl bg-violet py-2.5 text-sm font-semibold text-base disabled:opacity-40">Mashg'ulotni rejalashtirish</button>
        </div>
        {!!sessions?.length && <ul className="mt-3 divide-y divide-tint/5">{sessions.map((x) => <li key={x.id} className="flex items-center gap-2 py-2 text-xs"><span className="min-w-0 flex-1 text-ink">{x.title} · {dt(x.startsAt)}–{dt(x.endsAt)} · {x.status}</span>{x.status === 'SCHEDULED' && <button type="button" onClick={() => cancelSession.mutate(x.id)} className="text-coral">Bekor</button>}</li>)}</ul>}
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
  const [f, setF] = useState({ city: '', about: '', isPublic: true, posterUrl: '', websiteUrl: '', telegramUrl: '', instagramUrl: '' });
  const [uploading, setUploading] = useState(false);
  const { data: profile } = useSchoolQuery<{ city: string | null; about: string | null; isPublic: boolean; posterUrl: string | null; websiteUrl: string | null; telegramUrl: string | null; instagramUrl: string | null }>(['school-profile'], '/api/v1/admin/school-profile');
  const { data: inv } = useSchoolQuery<InvoiceRow[]>(['invoices'], '/api/v1/admin/subscription/invoices');
  useEffect(() => { if (profile) setF({ city: profile.city || '', about: profile.about || '', isPublic: profile.isPublic, posterUrl: profile.posterUrl || '', websiteUrl: profile.websiteUrl || '', telegramUrl: profile.telegramUrl || '', instagramUrl: profile.instagramUrl || '' }); }, [profile]);
  const save = useSchoolAction(() => patch('/api/v1/admin/school-profile', f), 'Maktab profili saqlandi');
  const onPoster = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try { const posterUrl = await uploadPosterImage(file, 'SCHOOL_POSTER'); setF(v => ({ ...v, posterUrl })); toast('success', 'Maktab posteri yuklandi'); }
    catch (e: any) { toast('error', e?.message || 'Poster yuklanmadi'); }
    finally { setUploading(false); }
  };
  return (
    <div className="space-y-4">
      <Panel title="Maktab profili va ommaviy sahifasi" icon={Settings} accent="sky">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs text-ink-muted font-medium">Maktab posteri</label>
            {f.posterUrl && <div className="relative overflow-hidden rounded-2xl border border-tint/10"><img src={getFullUrl(f.posterUrl)} alt="Maktab posteri" className="h-48 w-full object-cover" /><button type="button" onClick={() => setF(v => ({ ...v, posterUrl: '' }))} className="absolute right-2 top-2 rounded-full bg-black/70 px-3 py-1.5 text-xs text-white">Olib tashlash</button></div>}
            <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-tint/15 bg-surface/30 p-4 text-center">
              <span className="text-sm font-semibold text-ink">{uploading ? 'Yuklanmoqda…' : 'Rasm yuklash yoki almashtirish'}</span>
              <span className="text-[11px] text-ink-muted">JPG, PNG yoki WebP · 8 MB gacha</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={uploading} onChange={e => { void onPoster(e.target.files?.[0]); e.currentTarget.value = ''; }} />
            </label>
          </div>
          <input className={inputCls} placeholder="Shahar" maxLength={60} value={f.city} onChange={e => setF({ ...f, city: e.target.value })} />
          <textarea className={inputCls} rows={4} maxLength={1000} placeholder="Maktab haqida batafsil tavsif..." value={f.about} onChange={e => setF({ ...f, about: e.target.value })} />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input className={inputCls} placeholder="Rasmiy sayt: https://..." value={f.websiteUrl} onChange={e => setF({ ...f, websiteUrl: e.target.value })} />
            <input className={inputCls} placeholder="Telegram: https://t.me/..." value={f.telegramUrl} onChange={e => setF({ ...f, telegramUrl: e.target.value })} />
            <input className={inputCls} placeholder="Instagram: https://instagram.com/..." value={f.instagramUrl} onChange={e => setF({ ...f, instagramUrl: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-xs text-ink"><input type="checkbox" checked={f.isPublic} onChange={e => setF({ ...f, isPublic: e.target.checked })} />Katalogda ko'rinsin</label>
          <button type="button" disabled={save.isPending || uploading} onClick={() => save.mutate(undefined)} className="w-full rounded-xl bg-sky py-2.5 text-sm font-semibold text-base disabled:opacity-40">Profilni saqlash</button>
        </div>
      </Panel>
      <Panel title="Obuna hisoblari" accent="gold" flush>
        {!inv?.length ? <p className="p-5 text-xs text-ink-muted">Hisob yo'q</p> : <ul className="divide-y divide-tint/5">{inv.map(i => <li key={i.id} className="flex items-center gap-3 px-4 py-3 text-xs"><span className="font-semibold text-ink">{i.month}</span><span className="flex-1 text-ink-muted">{money(i.amount)}</span><Chip s={i.status === 'PAID' ? { l: "To'langan", c: 'bg-teal/15 text-teal' } : i.status === 'PENDING' ? { l: 'Kutilmoqda', c: 'bg-gold/15 text-gold' } : { l: 'Bekor', c: 'bg-tint/10 text-ink-muted' }} /></li>)}</ul>}
      </Panel>
    </div>
  );
}

/** Maktab admini: a'zolar, guruhlar, sinov darslari, jadval, profil va obuna — bitta joyda. Tab URL'da (?tab=). */
export default function AdminSchool() {
  const [params, setParams] = useSearchParams();
  const q = params.get('tab') as Tab | null;
  const tab: Tab = q && TABS.includes(q) ? q : 'members';
  const setTab = (t: Tab) => setParams(t === 'members' ? {} : { tab: t }, { replace: true });
  const { data: ctx } = useSchoolQuery<{ pending?: { joinRequests: number; trialRequests: number } }>(['ctx'], '/api/v1/panel/context');
  const tabs: [Tab, string, number?][] = [['members', "A'zolar", ctx?.pending?.joinRequests], ['groups', 'Guruhlar'], ['trials', 'Sinov', ctx?.pending?.trialRequests], ['timetable', 'Jadval'], ['profile', 'Profil']];
  return (
    <div className={PAGE_WIDE}>
      <StaffHero accent="sky" image={IMAGES.hero} eyebrow="EduGo · Maktab" title="Maktab boshqaruvi" subtitle="A'zolar, guruhlar, sinov darslari, o'qituvchilar va dars jadvali — bitta joyda." />
      <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist">{tabs.map(([k, l, n]) => (
        <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`relative shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold ${tab === k ? 'bg-sky/20 text-sky' : 'bg-tint/5 text-ink-muted'}`}>{l}{!!n && <span className="ml-1 rounded-full bg-coral px-1.5 py-0.5 text-[10px] text-white">{n}</span>}</button>
      ))}</div>
      {tab === 'members' && <MembersTab />}
      {tab === 'groups' && <AdminGroups embedded />}
      {tab === 'trials' && <AdminTrials embedded />}
      {tab === 'timetable' && <TimetableTab />}
      {tab === 'profile' && <ProfileTab />}
    </div>
  );
}
