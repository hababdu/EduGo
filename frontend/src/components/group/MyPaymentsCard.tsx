import { Wallet } from 'lucide-react';
import { formatMoney, monthLabel, PaymentState, useMyPayments } from '../../hooks/usePayments';

const STYLE: Record<PaymentState, { label: string; cls: string }> = {
  PAID: { label: "To'langan", cls: 'bg-teal/15 text-teal' },
  WAIVED: { label: 'Imtiyoz', cls: 'bg-gold/15 text-gold' },
  UNPAID: { label: "To'lanmagan", cls: 'bg-coral/15 text-coral' },
};

/** O'quvchining o'z to'lov holati (oxirgi oylar). Ma'lumot bo'lmasa yoki xato bo'lsa — jim. */
export function MyPaymentsCard({ groupId }: { groupId: string }) {
  const { data } = useMyPayments(groupId);
  if (!data || data.months.length === 0) return null;

  return (
    <section className="rounded-3xl border border-white/5 bg-surface/20 p-4" aria-label="Mening to'lovlarim">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Wallet className="h-4 w-4 text-gold" aria-hidden="true" /> To'lovlarim
        </h2>
        {data.monthlyFee != null && <span className="text-xs tabular-nums text-ink-muted">Oylik: {formatMoney(data.monthlyFee)}</span>}
      </div>
      <ul className="space-y-1.5">
        {data.months.map((m) => (
          <li key={m.month} className="flex items-center justify-between text-xs">
            <span className="text-ink-muted">{monthLabel(m.month)}</span>
            <span className={`rounded-full px-2.5 py-0.5 font-semibold ${STYLE[m.status].cls}`}>{STYLE[m.status].label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
