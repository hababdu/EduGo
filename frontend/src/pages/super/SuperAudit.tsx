import { useState } from 'react';
import { StaffHero, Panel } from '../../components/staff';
import { Skeleton } from '../../components/ui';
import { IMAGES } from '../../design/images';
import { CONTROL, PAGE } from '../../design/tokens';
import { ScrollText } from '../../design/icons';
import { ROLE_UZ, useSuperAudit, when } from './superApi';

const short = (v: unknown) => {
  if (v === null || v === undefined) return '';
  const s = JSON.stringify(v);
  return s.length > 140 ? s.slice(0, 140) + '…' : s;
};

export function SuperAudit() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const { data, isLoading } = useSuperAudit(page, action);
  return (
    <div className={PAGE}>
      <StaffHero accent="sky" image={IMAGES.hero} eyebrow="SUPER ADMIN · JURNAL" title="Audit jurnali" subtitle="Kim, qachon, nimani o'zgartirgani." />
      <select className={CONTROL.select} value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
        <option value="">Barcha amallar</option>
        {data?.actions.map((a) => <option key={a} value={a}>{a}</option>)}
      </select>
      <Panel title={`Yozuvlar${data ? `: ${data.total}` : ''}`} icon={ScrollText} accent="sky" flush>
        {isLoading && !data ? <div className="p-5"><Skeleton className="h-32" /></div> : !data?.items.length ? (
          <p className="p-8 text-center text-sm text-ink-muted">Yozuv yo'q</p>
        ) : (
          <ul className="divide-y divide-tint/5">
            {data.items.map((r) => (
              <li key={r.id} className="space-y-1 px-5 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-md bg-gold/10 px-2 py-0.5 text-[11px] font-bold text-gold">{r.action}</span>
                  <span className="text-[11px] tabular-nums text-ink-muted">{when(r.createdAt)}</span>
                </div>
                <div className="text-xs text-ink">{r.actor.name} <span className="text-ink-muted">({ROLE_UZ[r.actor.role] ?? r.actor.role})</span> → {r.targetType} <span className="text-ink-muted">{r.targetId.slice(0, 8)}</span></div>
                {(r.oldValue != null || r.newValue != null) && (
                  <div className="break-all text-[11px] text-ink-muted">
                    {r.oldValue != null && <span>{short(r.oldValue)}</span>}{r.oldValue != null && r.newValue != null && ' → '}{r.newValue != null && <span className="text-ink">{short(r.newValue)}</span>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className={`${CONTROL.buttonGhost} disabled:opacity-30`}>← Oldingi</button>
          <span className="text-xs tabular-nums text-ink-muted">{page} / {data.pages}</span>
          <button type="button" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)} className={`${CONTROL.buttonGhost} disabled:opacity-30`}>Keyingi →</button>
        </div>
      )}
    </div>
  );
}
