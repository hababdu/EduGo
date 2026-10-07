import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Banknote, Users, TrendingUp, CircleAlert, Wallet } from 'lucide-react';
import { currentMonth, formatMoney, monthLabel, usePaymentsOverview } from '../../hooks/usePayments';
import { IMAGES } from '../../design/images';
import { StaffHero, Panel, KpiCard, Avatar, ProgressBar } from '../../components/staff';
import { MonthSwitcher } from '../../components/staff/MonthSwitcher';
import { EmptyState, Skeleton } from '../../components/ui';
import { PAGE_WIDE } from '../../design/tokens';

/** To'lovlar: oy bo'yicha yig'ilgan summa, guruhlar holati va qarzdorlar. */
export default function AdminPayments() {
  const navigate = useNavigate();
  const [month, setMonth] = useState(currentMonth());
  const { data, isLoading, error } = usePaymentsOverview(month);

  const goGroup = (id: string) => navigate(`/admin/payments/${id}?month=${month}`);
  const t = data?.totals;
  const payable = t ? t.paid + t.unpaid : 0;
  const pct = payable > 0 && t ? Math.round((t.paid / payable) * 100) : 0;

  return (
    <div className={PAGE_WIDE}>
      <StaffHero
        accent="gold"
        image={IMAGES.hero}
        eyebrow="EduGo · To'lovlar"
        title="To'lov nazorati"
        subtitle="Kim to'lagan, kim qarzdor — har oy uchun qo'lda belgilanadi."
        actions={<MonthSwitcher month={month} onChange={setMonth} />}
        footer={
          t && (
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 pt-1">
              <div>
                <p className="text-[11px] text-ink-muted">{monthLabel(month)}: yig'ilgan</p>
                <p className="mt-1 font-display text-3xl font-extrabold leading-none tabular-nums text-gold">{formatMoney(t.collected)}</p>
              </div>
              <div className="min-w-[160px] max-w-xs flex-1">
                <div className="mb-1.5 flex items-center justify-between text-[11px] text-ink-muted">
                  <span>To'laganlar</span>
                  <span className="font-semibold tabular-nums text-teal">{pct}%</span>
                </div>
                <ProgressBar value={pct} tone="auto" />
              </div>
            </div>
          )
        }
      />

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-40" />
        </div>
      )}
      {error && <p className="rounded-2xl border border-coral/20 bg-coral/10 p-3 text-sm text-coral">{(error as Error).message || "To'lovlarni yuklab bo'lmadi"}</p>}

      {data && t && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard label="Yig'ilgan" value={formatMoney(t.collected)} icon={Banknote} accent="teal" />
            <KpiCard label="Kutilgan" value={formatMoney(t.expected)} icon={TrendingUp} accent="gold" hint="imtiyozsiz, oylik to'lov belgilangan guruhlar" />
            <KpiCard label="To'lamaganlar" value={t.unpaid} icon={CircleAlert} accent="coral" hint="qarzdor o'quvchilar" />
            <KpiCard label="To'laganlar" value={t.paid} icon={Users} accent="sky" hint={t.waived ? `${t.waived} ta imtiyozli` : undefined} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel title="Guruhlar" icon={Wallet} accent="gold" flush>
              {data.groups.length === 0 ? (
                <EmptyState icon={Wallet} title="Guruhlar yo'q" subtitle="O'quvchisi bor guruhlar shu yerda ko'rinadi" />
              ) : (
                <ul className="divide-y divide-white/5">
                  {data.groups.map((g) => {
                    const pay = g.paid + g.unpaid;
                    const gp = pay > 0 ? Math.round((g.paid / pay) * 100) : 0;
                    return (
                      <li key={g.groupId}>
                        <button type="button" onClick={() => goGroup(g.groupId)} className="w-full space-y-2 px-5 py-3 text-left transition hover:bg-white/[0.03] active:bg-white/[0.05]">
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="truncate text-sm font-semibold text-ink">{g.name}</span>
                            <span className="shrink-0 text-[11px] tabular-nums text-ink-muted">
                              {g.monthlyFee != null ? formatMoney(g.monthlyFee) : "narx yo'q"}
                            </span>
                          </div>
                          <ProgressBar value={gp} tone="auto" />
                          <div className="flex items-center justify-between text-[11px] text-ink-muted">
                            <span>
                              <span className="font-semibold text-teal">{g.paid}</span> to'lagan ·{' '}
                              <span className={`font-semibold ${g.unpaid ? 'text-coral' : 'text-ink-muted'}`}>{g.unpaid}</span> qarz
                              {g.waived ? ` · ${g.waived} imtiyoz` : ''}
                            </span>
                            <span className="tabular-nums">{formatMoney(g.collected)}</span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>

            <Panel
              title={`Qarzdorlar${data.debtors.length ? ` (${data.debtors.length})` : ''}`}
              icon={CircleAlert}
              accent="coral"
              flush
            >
              {data.debtors.length === 0 ? (
                <p className="px-5 pb-5 text-xs text-ink-muted">Bu oy qarzdor yo'q 🎉</p>
              ) : (
                <ul className="max-h-[420px] divide-y divide-white/5 overflow-y-auto">
                  {data.debtors.map((d) => (
                    <li key={`${d.groupId}:${d.studentId}`}>
                      <button type="button" onClick={() => goGroup(d.groupId)} className="flex w-full items-center gap-3 px-5 py-2.5 text-left transition hover:bg-white/[0.03]">
                        <Avatar name={d.name} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-ink">{d.name}</span>
                          <span className="block truncate text-[11px] text-ink-muted">{d.groupName}</span>
                        </span>
                        <span className="shrink-0 text-xs font-semibold tabular-nums text-coral">{formatMoney(d.monthlyFee)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
