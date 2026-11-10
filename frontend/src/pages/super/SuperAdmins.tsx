import { useEffect, useState } from 'react';
import { StaffHero, Panel, Avatar } from '../../components/staff';
import { Skeleton } from '../../components/ui';
import { IMAGES } from '../../design/images';
import { PAGE } from '../../design/tokens';
import { ShieldCheck } from '../../design/icons';
import { ROLE_UZ, sapi, useAllUsers, useSuperOrgs, useSuperMutation, when } from './superApi';

const ROLES = ['STUDENT', 'TEACHER', 'ADMIN'] as const;
const FILTERS = [['', 'Hammasi'], ['STUDENT', 'O\'quvchilar'], ['TEACHER', "O'qituvchilar"], ['ADMIN', 'Adminlar']] as const;
const BADGE: Record<string, string> = { SUPER_ADMIN: 'bg-gold/15 text-gold', ADMIN: 'bg-sky/15 text-sky', TEACHER: 'bg-teal/15 text-teal', STUDENT: 'bg-tint/10 text-ink-muted' };

export function SuperAdmins() {
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);
  const [pickOrg, setPickOrg] = useState<Record<string, string>>({});
  useEffect(() => { const t = setTimeout(() => { setSearch(input.trim()); setPage(1); }, 300); return () => clearTimeout(t); }, [input]);

  const { data, isLoading } = useAllUsers(search, role, page);
  const { data: orgs } = useSuperOrgs();
  const block = useSuperMutation(sapi.block);
  const move = useSuperMutation(sapi.moveAdmin, "Admin ko'chirildi");
  const change = useSuperMutation(sapi.changeRole, 'Rol o\'zgartirildi');

  return (
    <div className={PAGE}>
      <StaffHero accent="sky" image={IMAGES.hero} eyebrow="SUPER ADMIN · FOYDALANUVCHILAR" title="Adminlar va foydalanuvchilar" subtitle="Barcha foydalanuvchilar shu yerda. Rolini (talaba, o'qituvchi, admin) o'zgartirasiz, boshqa maktabga ko'chirasiz yoki bloklaysiz." />
      <Panel title={`Ro'yxat${data ? ` · ${data.total}` : ''}`} icon={ShieldCheck} accent="sky" flush>
        <div className="space-y-2 border-b border-tint/5 p-3">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ism, username yoki Telegram ID…" aria-label="Qidirish"
            className="w-full rounded-xl bg-tint/5 px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-muted" />
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map(([v, l]) => (
              <button key={v} type="button" onClick={() => { setRole(v); setPage(1); }}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${role === v ? 'bg-sky/20 text-sky' : 'bg-tint/5 text-ink-muted'}`}>{l}</button>
            ))}
          </div>
        </div>
        {isLoading ? <div className="p-5"><Skeleton className="h-24" /></div> : !data?.items.length ? (
          <p className="p-8 text-center text-sm text-ink-muted">Foydalanuvchi topilmadi</p>
        ) : (
          <ul className="divide-y divide-tint/5">
            {data.items.map((a) => {
              const sa = a.role === 'SUPER_ADMIN';
              const blocked = a.status === 'BLOCKED';
              const orgId = a.organization?.id ?? pickOrg[a.id] ?? (orgs?.length === 1 ? orgs[0].id : '');
              return (
                <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
                  <Avatar name={a.name} />
                  <div className="min-w-0 flex-1 basis-40">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-ink">{a.name}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${BADGE[a.role] ?? BADGE.STUDENT}`}>{ROLE_UZ[a.role]}</span>
                      {blocked && <span className="shrink-0 rounded-full bg-coral/10 px-2 py-0.5 text-[10px] font-bold text-coral">Bloklangan</span>}
                    </div>
                    <div className="truncate text-[11px] text-ink-muted">{a.organization?.name ?? 'Maktabsiz'} · ID {a.telegramId} · {when(a.lastActiveAt)}</div>
                  </div>
                  {!sa && (
                    <div className="flex shrink-0 items-center gap-2">
                      {!a.organization && orgs && orgs.length > 1 && (
                        <select aria-label="Maktab tanlash" value={pickOrg[a.id] ?? ''} onChange={(e) => setPickOrg((m) => ({ ...m, [a.id]: e.target.value }))}
                          className="max-w-[110px] rounded-xl bg-tint/5 px-2 py-1.5 text-xs text-ink-muted">
                          <option value="">Maktab…</option>
                          {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                        </select>
                      )}
                      <select aria-label="Rolni o'zgartirish" disabled={change.isPending || !orgId} value={a.role}
                        onChange={(e) => { const to = e.target.value; if (to !== a.role && window.confirm(`${a.name} — «${ROLE_UZ[to]}» qilinsinmi?`)) change.mutate({ id: a.id, role: to, organizationId: a.organization ? undefined : orgId }); }}
                        className="rounded-xl bg-tint/5 px-2 py-1.5 text-xs font-semibold text-ink">
                        {ROLES.map((r) => <option key={r} value={r}>{ROLE_UZ[r]}</option>)}
                      </select>
                      {a.role === 'ADMIN' && orgs && orgs.length > 1 && (
                        <select aria-label="Maktabga ko'chirish" disabled={move.isPending} value={a.organization?.id ?? ''}
                          onChange={(e) => { const to = e.target.value; const name = orgs.find((o) => o.id === to)?.name; if (to && to !== a.organization?.id && window.confirm(`${a.name} «${name}» maktabiga ko'chirilsinmi?`)) move.mutate({ userId: a.id, organizationId: to }); }}
                          className="max-w-[110px] rounded-xl bg-tint/5 px-2 py-1.5 text-xs text-ink-muted">
                          {!a.organization && <option value="">Maktabsiz</option>}
                          {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                        </select>
                      )}
                      <button type="button" disabled={block.isPending}
                        onClick={() => { if (blocked || window.confirm(`${a.name} bloklansinmi?`)) block.mutate({ id: a.id, blocked: !blocked }); }}
                        className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${blocked ? 'bg-teal/15 text-teal' : 'bg-coral/10 text-coral'}`}>
                        {blocked ? 'Ochish' : 'Bloklash'}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-between border-t border-tint/5 px-4 py-3 text-xs text-ink-muted">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-xl bg-tint/5 px-3 py-1.5 font-semibold disabled:opacity-40">Oldingi</button>
            <span>{data.page} / {data.pages}</span>
            <button type="button" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)} className="rounded-xl bg-tint/5 px-3 py-1.5 font-semibold disabled:opacity-40">Keyingi</button>
          </div>
        )}
      </Panel>
    </div>
  );
}
