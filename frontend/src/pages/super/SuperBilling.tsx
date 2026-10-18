import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Banknote, CircleAlert, TrendingUp, Wallet } from 'lucide-react';
import { StaffHero, Panel, KpiCard } from '../../components/staff';
import { MonthSwitcher } from '../../components/staff/MonthSwitcher';
import { Skeleton, EmptyState } from '../../components/ui';
import { IMAGES } from '../../design/images';
import { CONTROL, PAGE } from '../../design/tokens';
import { currentMonth, formatMoney, monthLabel } from '../../hooks/usePayments';
import { BillingOverview, SubState, sapi, useBilling, useSuperMutation } from './superApi';

const STATE: Record<SubState, { label: string; cls: string }> = {
  PAID: { label: "To'lagan", cls: 'bg-teal/15 text-teal' },
  WAIVED: { label: 'Imtiyoz', cls: 'bg-sky/15 text-sky' },
  UNPAID: { label: "To'lamagan", cls: 'bg-coral/15 text-coral' },
};

function Row({ it, month }: { it: BillingOverview['items'][number]; month: string }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(it.state === 'PAID' ? it.amount : it.fee ?? ''));
  const [fee, setFee] = useState(String(it.fee ?? ''));
  const [note, setNote] = useState(it.note ?? '');
  const mark = useSuperMutation(sapi.markBilling, 'Saqlandi');
  const setPlan = useSuperMutation(sapi.updateOrg, 'Oylik summa saqlandi');
  const st = STATE[it.state];
  const suspended = it.orgStatus === 'SUSPENDED';

  return (
    <li>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-tint/[0.03]">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-ink">{it.name}</span>
            {suspended && <span className="shrink-0 rounded-full bg-coral/15 px-2 py-0.5 text-[10px] font-bold text-coral">To'xtatilgan</span>}
          </div>
          <div className="text-[11px] text-ink-muted">Oylik: {it.fee ? formatMoney(it.fee) : 'belgilanmagan'}{it.state === 'PAID' ? ` · to'langan ${formatMoney(it.amount)}` : ''}</div>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${st.cls}`}>{st.label}</span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-tint/5 bg-surface/30 px-5 py-4">
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-[11px] text-ink-muted">Maktabning oylik summasi
              <input className={CONTROL.input} inputMode="numeric" value={fee} onChange={(e) => setFee(e.target.value.replace(/\D/g, ''))} placeholder="so'm" />
            </label>
            <div className="flex items-end">
              <button type="button" className={`${CONTROL.buttonSubtle} w-full`} disabled={setPlan.isPending || fee === String(it.fee ?? '')}
                onClick={() => setPlan.mutate({ id: it.orgId, monthlyPlanFee: fee ? Number(fee) : null })}>Summani saqlash</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-[11px] text-ink-muted">{monthLabel(month)} uchun to'langan
              <input className={CONTROL.input} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))} placeholder="so'm" />
            </label>
            <label className="space-y-1 text-[11px] text-ink-muted">Izoh
              <input className={CONTROL.input} maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="ixtiyoriy" />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={`${CONTROL.buttonPrimary} flex-1`} disabled={mark.isPending}
              onClick={() => mark.mutate({ orgId: it.orgId, month, status: 'PAID', amount: amount ? Number(amount) : undefined, note })}>To'ladi</button>
            <button type="button" className={`${CONTROL.buttonSubtle} flex-1`} disabled={mark.isPending}
              onClick={() => mark.mutate({ orgId: it.orgId, month, status: 'WAIVED', note })}>Imtiyoz</button>
            {it.state !== 'UNPAID' && (
              <button type="button" className={`${CONTROL.buttonDanger} flex-1`} disabled={mark.isPending}
                onClick={() => mark.mutate({ orgId: it.orgId, month, status: 'UNPAID' })}>Bekor qilish</button>
            )}
          </div>
          <Link to={`/super/orgs/${it.orgId}`} className="block text-center text-xs font-semibold text-gold">Maktab tafsilotlari →</Link>
        </div>
      )}
    </li>
  );
}

/** Maktablarning super adminga oylik obuna to'lovi (har bir MAKTAB to'laydi; o'quvchilar to'lovidan alohida). */
export function SuperBilling() {
  const [month, setMonth] = useState(currentMonth());
  const { data, isLoading, error } = useBilling(month);
  const t = data?.totals;
  return (
    <div className={PAGE}>
      <StaffHero accent="gold" image={IMAGES.hero} eyebrow="SUPER ADMIN · OBUNALAR" title="Maktab obunalari"
        subtitle="Har bir maktab oyiga belgilangan summani to'laydi. To'lovni siz belgilaysiz."
        actions={<MonthSwitcher month={month} onChange={setMonth} />} />
      {isLoading && <Skeleton className="h-40" />}
      {error && <p className="rounded-2xl border border-coral/20 bg-coral/10 p-3 text-sm text-coral">{(error as Error).message}</p>}
      {data && t && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard label="Yig'ilgan" value={formatMoney(t.collected)} icon={Banknote} accent="teal" />
            <KpiCard label="Kutilgan" value={formatMoney(t.expected)} icon={TrendingUp} accent="gold" hint="faol maktablar, imtiyozsiz" />
            <KpiCard label="To'lamagan" value={t.unpaid} icon={CircleAlert} accent="coral" hint="faol maktablar" />
            <KpiCard label="To'lagan" value={t.paid} icon={Wallet} accent="sky" hint={t.waived ? `${t.waived} ta imtiyozli` : undefined} />
          </div>
          <Panel title="Maktablar" icon={Wallet} accent="gold" flush>
            {data.items.length === 0 ? <EmptyState icon={Wallet} title="Maktab yo'q" subtitle="Avval «Maktablar» bo'limida maktab yarating" /> : (
              <ul className="divide-y divide-tint/5">{data.items.map((it) => <Row key={it.orgId + month} it={it} month={month} />)}</ul>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
