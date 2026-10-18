import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Banknote, FolderOpen, GraduationCap, ShieldCheck, Users } from 'lucide-react';
import { StaffHero, Panel, KpiCard, Avatar } from '../../components/staff';
import { Skeleton } from '../../components/ui';
import { IMAGES } from '../../design/images';
import { PAGE } from '../../design/tokens';
import { formatMoney, monthLabel } from '../../hooks/usePayments';
import { useOrgDetail, when } from './superApi';

const SUB = { PAID: ["To'lagan", 'bg-teal/15 text-teal'], WAIVED: ['Imtiyoz', 'bg-sky/15 text-sky'], UNPAID: ["To'lamagan", 'bg-coral/15 text-coral'] } as const;

/** Maktab ichi — super admin uchun FAQAT KO'RISH. O'zgartirishni maktab admini qiladi. */
export function SuperOrgDetail() {
  const { id = '' } = useParams();
  const { data: d, isLoading, error } = useOrgDetail(id);

  return (
    <div className={PAGE}>
      <Link to="/super/orgs" className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted"><ArrowLeft className="h-4 w-4" /> Maktablar</Link>
      {isLoading && <Skeleton className="h-48" />}
      {error && <p className="rounded-2xl border border-coral/20 bg-coral/10 p-3 text-sm text-coral">{(error as Error).message}</p>}
      {d && (
        <>
          <StaffHero accent="teal" image={IMAGES.hero} eyebrow="SUPER ADMIN · MAKTAB" title={d.org.name}
            subtitle={`${d.org.status === 'ACTIVE' ? 'Faol' : "To'xtatilgan"} · faqat ko'rish rejimi — o'zgartirishni maktab admini qiladi`} />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard label="O'quvchilar" value={d.counts.students} icon={GraduationCap} accent="sky" />
            <KpiCard label="O'qituvchilar" value={d.counts.teachers} icon={Users} accent="teal" />
            <KpiCard label="Adminlar" value={d.counts.admins} icon={ShieldCheck} accent="gold" />
            <KpiCard label="Guruhlar" value={d.counts.groups} icon={FolderOpen} accent="coral" />
          </div>

          <Panel title="Obuna (maktab → siz)" icon={Banknote} accent="gold">
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">Oylik summa</span>
                <span className="font-semibold tabular-nums text-ink">{d.org.monthlyPlanFee ? formatMoney(d.org.monthlyPlanFee) : 'belgilanmagan'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">{monthLabel(d.subscription.currentMonth)}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${SUB[d.subscription.state][1]}`}>{SUB[d.subscription.state][0]}</span>
              </div>
              {d.subscription.history.length > 0 && (
                <ul className="divide-y divide-tint/5 rounded-2xl bg-surface/40">
                  {d.subscription.history.map((h) => (
                    <li key={h.month} className="flex items-center justify-between px-3 py-2 text-xs">
                      <span className="text-ink-muted">{monthLabel(h.month)}</span>
                      <span className="tabular-nums text-ink">{h.state === 'PAID' ? formatMoney(h.amount) : SUB[h.state][0]}</span>
                    </li>
                  ))}
                </ul>
              )}
              <Link to="/super/billing" className="block text-center text-xs font-semibold text-gold">To'lovni belgilash →</Link>
            </div>
          </Panel>

          <Panel title="Adminlar" icon={ShieldCheck} accent="sky" flush>
            {d.admins.length === 0 ? <p className="p-6 text-center text-sm text-ink-muted">Admin tayinlanmagan — «Maktablar» bo'limida tayinlang</p> : (
              <ul className="divide-y divide-tint/5">
                {d.admins.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-5 py-3">
                    <Avatar name={a.name} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-ink">{a.name}{a.status === 'BLOCKED' ? ' · bloklangan' : ''}</div>
                      <div className="text-[11px] text-ink-muted">{a.username ? `@${a.username} · ` : ''}oxirgi faollik {when(a.lastActiveAt)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Guruhlar va o'quvchi to'lovlari" icon={FolderOpen} accent="teal" flush>
            <div className="border-b border-tint/5 px-5 py-3 text-xs text-ink-muted">
              {monthLabel(d.studentPayments.month)}: yig'ilgan <b className="text-ink">{formatMoney(d.studentPayments.collected)}</b> · kutilgan <b className="text-ink">{formatMoney(d.studentPayments.expected)}</b>
            </div>
            {d.groups.length === 0 ? <p className="p-6 text-center text-sm text-ink-muted">Guruhlar yo'q</p> : (
              <ul className="divide-y divide-tint/5">
                {d.groups.map((g) => (
                  <li key={g.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-ink">{g.name}</div>
                      <div className="text-[11px] text-ink-muted">{g.teacher ?? "O'qituvchi yo'q"} · {g.members} o'quvchi</div>
                    </div>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-ink">{g.fee ? formatMoney(g.fee) : '—'}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="O'qituvchilar" icon={Users} accent="coral" flush>
            {d.teachers.length === 0 ? <p className="p-6 text-center text-sm text-ink-muted">O'qituvchi yo'q</p> : (
              <ul className="divide-y divide-tint/5">
                {d.teachers.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 px-5 py-3"><Avatar name={t.name} /><span className="truncate text-sm font-semibold text-ink">{t.name}</span></li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
