import { useState } from 'react';
import { Link } from 'react-router-dom';
import { StaffHero, Panel } from '../../components/staff';
import { Skeleton } from '../../components/ui';
import { toast } from '../../components/ui/Toast';
import { IMAGES } from '../../design/images';
import { CONTROL, PAGE } from '../../design/tokens';
import { School, Plus, X } from '../../design/icons';
import { Avatar } from '../../components/staff';
import { Candidate, Org, ROLE_UZ, sapi, useCandidates, useSuperMutation, useSuperOrgs } from './superApi';

const CH_RE = /^-100\d{5,}$/;

/** Kanal ID'sini qanday olish va botni qo'shish bo'yicha qisqa yo'riqnoma */
function ChannelHelp() {
  return (
    <ol className="list-decimal space-y-1 pl-5 text-[11px] leading-relaxed text-ink-muted">
      <li>Telegramda maktab uchun <b>yopiq (private)</b> kanal yarating — ochiq havola (@username) qo'ymang.</li>
      <li>Botni kanalga <b>administrator</b> qilib qo'shing (xabar yuborish huquqi bilan).</li>
      <li>Kanal ID'sini oling: kanaldan biror xabarni @getidsbot yoki @RawDataBot ga forward qiling. ID <b>-100</b> bilan boshlanadi.</li>
    </ol>
  );
}

function CreateOrg() {
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [chan, setChan] = useState('');
  const m = useSuperMutation(sapi.createOrg, 'Maktab yaratildi');
  const ok = name.trim().length >= 2 && CH_RE.test(chan.trim());
  return (
    <Panel title="Yangi maktab" icon={Plus} accent="gold">
      <div className="space-y-2.5">
        <input className={CONTROL.input} placeholder="Maktab nomi (masalan: 12-maktab)" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
        <input className={CONTROL.input} placeholder="Izoh (ixtiyoriy)" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        <input className={CONTROL.input} placeholder="Yopiq kanal ID (masalan -1001234567890)" inputMode="numeric" value={chan} onChange={(e) => setChan(e.target.value.trim())} />
        {chan && !CH_RE.test(chan) && <p className="text-[11px] text-coral">ID -100 bilan boshlanishi kerak</p>}
        <ChannelHelp />
        <button type="button" disabled={!ok || m.isPending} className={`${CONTROL.buttonPrimary} w-full disabled:opacity-40`}
          onClick={() => m.mutate({ name: name.trim(), note: note.trim() || undefined, storageChatId: chan.trim() }, { onSuccess: () => { setName(''); setNote(''); setChan(''); } })}>
          {m.isPending ? 'Kanal tekshirilmoqda…' : 'Maktab yaratish'}
        </button>
      </div>
    </Panel>
  );
}

function OrgCard({ org }: { org: Org }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const { data: cands, isFetching } = useCandidates(q.trim(), open);
  const assign = useSuperMutation(sapi.assignAdmin, 'Admin tayinlandi');
  const remove = useSuperMutation(sapi.removeAdmin, 'Admin olib tashlandi');
  const upd = useSuperMutation(sapi.updateOrg);
  const suspended = org.status === 'SUSPENDED';
  const [editCh, setEditCh] = useState(false);
  const [ch, setCh] = useState('');

  return (
    <Panel title={org.name} icon={School} accent={suspended ? 'coral' : 'teal'}
      action={<span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${suspended ? 'bg-coral/15 text-coral' : 'bg-teal/15 text-teal'}`}>{suspended ? "To'xtatilgan" : 'Faol'}</span>}>
      <div className="space-y-4">
        {org.note && <p className="text-xs text-ink-muted">{org.note}</p>}
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-2xl bg-surface/50 py-2.5"><div className="font-display text-lg font-bold text-ink tabular-nums">{org.users}</div><div className="text-[11px] text-ink-muted">Foydalanuvchi</div></div>
          <div className="rounded-2xl bg-surface/50 py-2.5"><div className="font-display text-lg font-bold text-ink tabular-nums">{org.groups}</div><div className="text-[11px] text-ink-muted">Guruh</div></div>
        </div>

        <div className="rounded-2xl bg-surface/50 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-ink-muted">Yopiq kanal</div>
              {org.storageChatId ? (
                <div className="truncate text-[11px] text-teal">Biriktirilgan · {org.storageChatId}</div>
              ) : (
                <div className="text-[11px] font-semibold text-coral">Biriktirilmagan — fayl yuklab bo'lmaydi</div>
              )}
            </div>
            {!editCh && <button type="button" className="shrink-0 rounded-lg bg-tint/5 px-2.5 py-1.5 text-[11px] font-semibold text-gold" onClick={() => setEditCh(true)}>{org.storageChatId ? "O'zgartirish" : 'Biriktirish'}</button>}
          </div>
          {editCh && (
            <div className="mt-2 space-y-2">
              <input autoFocus className={CONTROL.input} placeholder="-1001234567890" inputMode="numeric" value={ch} onChange={(e) => setCh(e.target.value.trim())} />
              <ChannelHelp />
              <div className="flex gap-2">
                <button type="button" className={`${CONTROL.buttonPrimary} flex-1 disabled:opacity-40`} disabled={!CH_RE.test(ch) || upd.isPending}
                  onClick={() => upd.mutate({ id: org.id, storageChatId: ch }, { onSuccess: () => { toast('success', 'Kanal biriktirildi'); setEditCh(false); setCh(''); } })}>
                  {upd.isPending ? 'Tekshirilmoqda…' : 'Saqlash'}
                </button>
                <button type="button" className={CONTROL.buttonSubtle} onClick={() => { setEditCh(false); setCh(''); }}>Bekor</button>
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="mb-1.5 text-xs font-semibold text-ink-muted">Adminlar</div>
          {org.admins.length === 0 ? <p className="text-xs text-ink-faint">Hali admin tayinlanmagan</p> : (
            <ul className="space-y-1.5">
              {org.admins.map((a) => (
                <li key={a.id} className="flex items-center gap-2 rounded-xl bg-surface/50 px-3 py-2">
                  <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-ink">{a.name}</div><div className="text-[11px] text-ink-muted">ID {a.telegramId}{a.username ? ` · @${a.username}` : ''}</div></div>
                  <button type="button" aria-label="Adminni olib tashlash" disabled={remove.isPending}
                    onClick={() => { if (window.confirm(`${a.name} adminlikdan olinsinmi? (O'qituvchi bo'lib qoladi)`)) remove.mutate({ orgId: org.id, userId: a.id }); }}
                    className="rounded-lg bg-coral/10 p-1.5 text-coral"><X className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          )}
          {!open ? (
            <button type="button" className={`${CONTROL.buttonSubtle} mt-2 w-full`} onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Admin qo'shish
            </button>
          ) : (
            <div className="mt-2 space-y-2 rounded-2xl border border-tint/10 bg-surface/50 p-2.5">
              <div className="flex items-center gap-2">
                <input autoFocus className={`${CONTROL.input} min-w-0 flex-1`} placeholder="Foydalanuvchini qidiring (ism yoki @username)" value={q} onChange={(e) => setQ(e.target.value)} />
                <button type="button" aria-label="Yopish" className="rounded-lg bg-tint/5 p-2 text-ink-muted" onClick={() => { setOpen(false); setQ(''); }}><X className="h-4 w-4" /></button>
              </div>
              <ul className="max-h-64 divide-y divide-tint/5 overflow-y-auto">
                {(cands ?? []).map((c: Candidate) => {
                  const other = !!c.organization && c.organization.id !== org.id && c.role !== 'STUDENT';
                  const already = c.role === 'ADMIN' && c.organization?.id === org.id;
                  return (
                    <li key={c.id}>
                      <button type="button" disabled={assign.isPending || other || already}
                        onClick={() => assign.mutate({ orgId: org.id, userId: c.id }, { onSuccess: () => { setOpen(false); setQ(''); } })}
                        className="flex w-full items-center gap-3 px-2 py-2.5 text-left disabled:opacity-40">
                        <Avatar name={c.name} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-ink">{c.name}</div>
                          <div className="truncate text-[11px] text-ink-muted">{ROLE_UZ[c.role]}{c.username ? ` · @${c.username}` : ''}{c.organization ? ` · ${c.organization.name}` : ''}</div>
                        </div>
                        <span className="shrink-0 text-[11px] font-semibold text-gold">{already ? 'Admin' : other ? 'Band' : 'Tanlash'}</span>
                      </button>
                    </li>
                  );
                })}
                {cands && cands.length === 0 && <li className="p-4 text-center text-xs text-ink-muted">{isFetching ? 'Qidirilmoqda…' : 'Hech kim topilmadi'}</li>}
                {!cands && <li className="p-4 text-center text-xs text-ink-muted">Yuklanmoqda…</li>}
              </ul>
            </div>
          )}
        </div>

        <Link to={`/super/orgs/${org.id}`} className={`${CONTROL.buttonSubtle} block w-full text-center`}>Maktab ichini ko'rish</Link>

        <button type="button" disabled={upd.isPending} className={suspended ? `${CONTROL.buttonSubtle} w-full` : `${CONTROL.buttonDanger} w-full`}
          onClick={() => {
            if (!suspended && !window.confirm(`«${org.name}» to'xtatilsinmi? Uning barcha foydalanuvchilari kira olmaydi.`)) return;
            upd.mutate({ id: org.id, status: suspended ? 'ACTIVE' : 'SUSPENDED' }, { onSuccess: () => toast('success', suspended ? 'Maktab faollashtirildi' : "Maktab to'xtatildi") });
          }}>
          {suspended ? 'Faollashtirish' : "To'xtatish"}
        </button>
      </div>
    </Panel>
  );
}

export function SuperOrgs() {
  const { data, isLoading } = useSuperOrgs();
  return (
    <div className={PAGE}>
      <StaffHero accent="teal" image={IMAGES.hero} eyebrow="SUPER ADMIN · MAKTABLAR" title="Maktablar" subtitle="Har bir maktab o'z admini, o'qituvchilari va o'quvchilari bilan alohida ishlaydi." />
      <CreateOrg />
      {isLoading ? <Skeleton className="h-40" /> : data && data.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-muted">Hali maktab yaratilmagan</p>
      ) : (
        <div className="space-y-4">{data?.map((o) => <OrgCard key={o.id} org={o} />)}</div>
      )}
    </div>
  );
}
