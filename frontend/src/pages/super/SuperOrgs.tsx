import { useState } from 'react';
import { StaffHero, Panel } from '../../components/staff';
import { Skeleton } from '../../components/ui';
import { toast } from '../../components/ui/Toast';
import { IMAGES } from '../../design/images';
import { CONTROL, PAGE } from '../../design/tokens';
import { School, Plus, X } from '../../design/icons';
import { Org, sapi, useSuperMutation, useSuperOrgs } from './superApi';

function CreateOrg() {
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const m = useSuperMutation(sapi.createOrg, 'Maktab yaratildi');
  const ok = name.trim().length >= 2;
  return (
    <Panel title="Yangi maktab" icon={Plus} accent="gold">
      <div className="space-y-2.5">
        <input className={CONTROL.input} placeholder="Maktab nomi (masalan: 12-maktab)" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
        <input className={CONTROL.input} placeholder="Izoh (ixtiyoriy)" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        <button type="button" disabled={!ok || m.isPending} className={`${CONTROL.buttonPrimary} w-full disabled:opacity-40`}
          onClick={() => m.mutate({ name: name.trim(), note: note.trim() || undefined }, { onSuccess: () => { setName(''); setNote(''); } })}>
          {m.isPending ? 'Yaratilmoqda…' : 'Maktab yaratish'}
        </button>
      </div>
    </Panel>
  );
}

function OrgCard({ org }: { org: Org }) {
  const [tg, setTg] = useState('');
  const assign = useSuperMutation(sapi.assignAdmin, 'Admin tayinlandi');
  const remove = useSuperMutation(sapi.removeAdmin, 'Admin olib tashlandi');
  const upd = useSuperMutation(sapi.updateOrg);
  const suspended = org.status === 'SUSPENDED';
  const valid = /^\d{3,20}$/.test(tg.trim());

  return (
    <Panel title={org.name} icon={School} accent={suspended ? 'coral' : 'teal'}
      action={<span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${suspended ? 'bg-coral/15 text-coral' : 'bg-teal/15 text-teal'}`}>{suspended ? "To'xtatilgan" : 'Faol'}</span>}>
      <div className="space-y-4">
        {org.note && <p className="text-xs text-ink-muted">{org.note}</p>}
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="rounded-2xl bg-surface/50 py-2.5"><div className="font-display text-lg font-bold text-ink tabular-nums">{org.users}</div><div className="text-[11px] text-ink-muted">Foydalanuvchi</div></div>
          <div className="rounded-2xl bg-surface/50 py-2.5"><div className="font-display text-lg font-bold text-ink tabular-nums">{org.groups}</div><div className="text-[11px] text-ink-muted">Guruh</div></div>
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
          <div className="mt-2 flex gap-2">
            <input className={`${CONTROL.input} min-w-0 flex-1`} inputMode="numeric" placeholder="Admin Telegram ID" value={tg} onChange={(e) => setTg(e.target.value.replace(/\D/g, ''))} />
            <button type="button" disabled={!valid || assign.isPending} className={`${CONTROL.buttonSubtle} disabled:opacity-40`}
              onClick={() => assign.mutate({ orgId: org.id, telegramId: tg.trim() }, { onSuccess: () => setTg('') })}>
              Tayinlash
            </button>
          </div>
          <p className="mt-1 text-[11px] text-ink-faint">Foydalanuvchi ilovaga kamida bir marta kirgan bo'lishi kerak.</p>
        </div>

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
