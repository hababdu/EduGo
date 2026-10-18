import { StaffHero, Panel, Avatar } from '../../components/staff';
import { Skeleton } from '../../components/ui';
import { IMAGES } from '../../design/images';
import { PAGE } from '../../design/tokens';
import { ShieldCheck } from '../../design/icons';
import { ROLE_UZ, sapi, useSuperAdmins, useSuperOrgs, useSuperMutation, when } from './superApi';

export function SuperAdmins() {
  const { data, isLoading } = useSuperAdmins();
  const block = useSuperMutation(sapi.block);
  const { data: orgs } = useSuperOrgs();
  const move = useSuperMutation(sapi.moveAdmin, "Admin ko'chirildi");
  return (
    <div className={PAGE}>
      <StaffHero accent="sky" image={IMAGES.hero} eyebrow="SUPER ADMIN · ADMINLAR" title="Adminlar" subtitle="Tayinlash «Maktablar» bo'limida. Bu yerda holatini boshqarasiz va boshqa maktabga ko'chirasiz." />
      <Panel title="Ro'yxat" icon={ShieldCheck} accent="sky" flush>
        {isLoading ? <div className="p-5"><Skeleton className="h-24" /></div> : !data?.length ? (
          <p className="p-8 text-center text-sm text-ink-muted">Adminlar yo'q</p>
        ) : (
          <ul className="divide-y divide-tint/5">
            {data.map((a) => {
              const sa = a.role === 'SUPER_ADMIN';
              const blocked = a.status === 'BLOCKED';
              return (
                <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <Avatar name={a.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-ink">{a.name}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${sa ? 'bg-gold/15 text-gold' : 'bg-sky/15 text-sky'}`}>{ROLE_UZ[a.role]}</span>
                    </div>
                    <div className="truncate text-[11px] text-ink-muted">{a.organization?.name ?? 'Maktabsiz'} · ID {a.telegramId} · {when(a.lastActiveAt)}</div>
                  </div>
                  {!sa && orgs && orgs.length > 1 && (
                    <select aria-label="Maktabga ko'chirish" disabled={move.isPending} value={a.organization?.id ?? ''}
                      onChange={(e) => { const to = e.target.value; const name = orgs.find((o) => o.id === to)?.name; if (to && to !== a.organization?.id && window.confirm(`${a.name} «${name}» maktabiga ko'chirilsinmi?`)) move.mutate({ userId: a.id, organizationId: to }); }}
                      className="max-w-[110px] shrink-0 rounded-xl bg-tint/5 px-2 py-1.5 text-xs text-ink-muted">
                      {!a.organization && <option value="">Maktabsiz</option>}
                      {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  )}
                  {!sa && (
                    <button type="button" disabled={block.isPending}
                      onClick={() => { if (blocked || window.confirm(`${a.name} bloklansinmi?`)) block.mutate({ id: a.id, blocked: !blocked }); }}
                      className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold ${blocked ? 'bg-teal/15 text-teal' : 'bg-coral/10 text-coral'}`}>
                      {blocked ? 'Ochish' : 'Bloklash'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
