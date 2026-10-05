import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Banknote, CircleAlert, Check, Gift, X } from 'lucide-react';
import {
  currentMonth,
  formatMoney,
  GroupPaymentStudent,
  PaymentState,
  useGroupPayments,
  useMarkPayments,
} from '../../hooks/usePayments';
import { IMAGES } from '../../design/images';
import { StaffHero, Panel, KpiCard, Avatar } from '../../components/staff';
import { MonthSwitcher } from '../../components/staff/MonthSwitcher';
import { toast } from '../../components/ui/Toast';
import { Skeleton } from '../../components/ui';
import { PAGE_WIDE, CONTROL } from '../../design/tokens';

const OPTIONS: { value: PaymentState; label: string; Icon: typeof Check; on: string }[] = [
  { value: 'UNPAID', label: "To'lamagan", Icon: X, on: 'bg-coral text-base' },
  { value: 'PAID', label: "To'lagan", Icon: Check, on: 'bg-teal text-base' },
  { value: 'WAIVED', label: 'Imtiyoz', Icon: Gift, on: 'bg-gold text-base' },
];

interface Edit {
  status: PaymentState;
  amount: string; // matn sifatida (kiritish qulayligi uchun)
}

/** Bir guruhning bir oylik to'lovlarini qo'lda belgilash. */
export default function AdminGroupPayments() {
  const { groupId = '' } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const month = /^\d{4}-\d{2}$/.test(params.get('month') ?? '') ? (params.get('month') as string) : currentMonth();
  const setMonth = (m: string) => setParams({ month: m }, { replace: true });

  const { data, isLoading, error } = useGroupPayments(groupId, month);
  const mark = useMarkPayments(groupId);
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const [saved, setSaved] = useState(false);

  const fee = data?.monthlyFee ?? null;

  // Oy almashganda yoki server ma'lumoti kelganda — tahrirlarni serverdagi holatga tenglashtiramiz
  useEffect(() => {
    if (!data) return;
    const next: Record<string, Edit> = {};
    for (const s of data.students) next[s.studentId] = { status: s.status, amount: s.status === 'PAID' ? String(s.amount) : '' };
    setEdits(next);
    setSaved(false);
  }, [data]);

  const students = data?.students ?? [];
  const changed = useMemo(
    () =>
      students.filter((s) => {
        const e = edits[s.studentId];
        if (!e) return false;
        if (e.status !== s.status) return true;
        return e.status === 'PAID' && Number(e.amount || fee || 0) !== s.amount;
      }),
    [students, edits, fee],
  );

  const setStatus = (s: GroupPaymentStudent, status: PaymentState) => {
    setSaved(false);
    setEdits((e) => ({
      ...e,
      [s.studentId]: { status, amount: status === 'PAID' ? (e[s.studentId]?.amount || String(s.amount || fee || '')) : '' },
    }));
  };
  const setAmount = (id: string, amount: string) => {
    setSaved(false);
    setEdits((e) => ({ ...e, [id]: { ...e[id], amount: amount.replace(/[^\d]/g, '') } }));
  };
  const markAllPaid = () => {
    setSaved(false);
    setEdits((e) => {
      const next = { ...e };
      for (const s of students) if (s.due && (next[s.studentId]?.status ?? s.status) === 'UNPAID') next[s.studentId] = { status: 'PAID', amount: String(fee ?? '') };
      return next;
    });
  };

  const save = () => {
    const records = changed.map((s) => {
      const e = edits[s.studentId];
      const amount = Number(e.amount || fee || 0);
      return e.status === 'PAID' ? { studentId: s.studentId, status: e.status, amount } : { studentId: s.studentId, status: e.status };
    });
    if (records.length === 0) return;
    if (records.some((r) => r.status === 'PAID' && !('amount' in r && (r.amount ?? 0) > 0))) {
      toast('error', "To'lagan o'quvchi uchun summani kiriting (yoki guruhga oylik to'lov belgilang)");
      return;
    }
    mark.mutate(
      { month, records },
      {
        onSuccess: () => {
          setSaved(true);
          toast('success', 'Saqlandi');
        },
        onError: (err: any) => toast('error', err?.message || "Saqlab bo'lmadi"),
      },
    );
  };

  const totals = data?.totals;

  return (
    <div className={`${PAGE_WIDE} pb-40`}>
      <StaffHero
        accent="gold"
        image={IMAGES.hero}
        eyebrow="To'lovlar"
        title={data?.name ?? 'Guruh'}
        subtitle={fee != null ? `Oylik to'lov: ${formatMoney(fee)}` : "Oylik to'lov belgilanmagan — summani har bir o'quvchi uchun kiritasiz"}
        top={
          <button
            type="button"
            onClick={() => navigate('/admin/payments')}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-ink-muted transition hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Orqaga
          </button>
        }
        actions={<MonthSwitcher month={month} onChange={setMonth} />}
      />

      {isLoading && <Skeleton className="h-64 rounded-3xl" />}
      {error && <p className="rounded-2xl border border-coral/20 bg-coral/10 p-3 text-sm text-coral">{(error as Error).message || "Yuklab bo'lmadi"}</p>}

      {totals && (
        <div className="grid grid-cols-3 gap-3">
          <KpiCard label="Yig'ilgan" value={formatMoney(totals.collected)} icon={Banknote} accent="teal" />
          <KpiCard label="To'lagan" value={totals.paid} icon={Check} accent="sky" hint={totals.waived ? `${totals.waived} imtiyoz` : undefined} />
          <KpiCard label="Qarzdor" value={totals.unpaid} icon={CircleAlert} accent="coral" />
        </div>
      )}

      {data && students.length === 0 && <p className="rounded-2xl border border-white/10 bg-surface/30 py-8 text-center text-sm text-ink-muted">Guruhda hali o'quvchi yo'q</p>}

      {students.length > 0 && (
        <Panel
          title="O'quvchilar"
          icon={Banknote}
          accent="gold"
          flush
          action={
            <button type="button" onClick={markAllPaid} className="rounded-xl border border-teal/20 bg-teal/10 px-3 py-1.5 text-xs font-semibold text-teal transition active:scale-95">
              Hammasi to'ladi
            </button>
          }
        >
          <ul className="divide-y divide-white/5">
            {students.map((s) => {
              const name = `${s.firstName} ${s.lastName ?? ''}`.trim() || s.username || "Noma'lum";
              const e = edits[s.studentId] ?? { status: s.status, amount: '' };
              return (
                <li key={s.studentId} className="space-y-2 px-5 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={name} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{name}</span>
                    {!s.due && s.status === 'UNPAID' && <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-ink-muted">oydan keyin qo'shilgan</span>}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5" role="group" aria-label={`${name} to'lovi`}>
                    {OPTIONS.map(({ value, label, Icon, on }) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={e.status === value}
                        onClick={() => setStatus(s, value)}
                        className={`flex items-center justify-center gap-1 rounded-xl py-2 text-xs font-semibold transition active:scale-95 ${e.status === value ? on : 'bg-white/5 text-ink-muted'}`}
                      >
                        <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {label}
                      </button>
                    ))}
                  </div>
                  {e.status === 'PAID' && (
                    <label className="flex items-center gap-2 text-[11px] text-ink-muted">
                      Summa (so'm)
                      <input
                        inputMode="numeric"
                        value={e.amount}
                        onChange={(ev) => setAmount(s.studentId, ev.target.value)}
                        placeholder={fee != null ? String(fee) : 'Masalan, 300000'}
                        className={`${CONTROL.input} max-w-[180px] !min-h-[40px] !py-1.5`}
                      />
                    </label>
                  )}
                </li>
              );
            })}
          </ul>
        </Panel>
      )}

      {changed.length > 0 && (
        <div className="glass fixed inset-x-0 bottom-[60px] z-30 border-t border-white/10 px-4 py-3">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
            <span className="text-xs text-ink-muted">{changed.length} ta o'zgarish saqlanmagan</span>
            <button type="button" onClick={save} disabled={mark.isPending} className={`${CONTROL.buttonPrimary} disabled:opacity-50`}>
              {mark.isPending ? 'Saqlanmoqda…' : 'Saqlash'}
            </button>
          </div>
        </div>
      )}
      {saved && changed.length === 0 && <p className="text-center text-xs text-teal">Saqlandi ✓</p>}
    </div>
  );
}
