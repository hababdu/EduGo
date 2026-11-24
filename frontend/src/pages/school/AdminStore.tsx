import { Check, Sparkles } from 'lucide-react';
import { Panel } from '../../components/staff';
import { Skeleton } from '../../components/ui';
import { Chip, del, money, post, useSchoolAction, useSchoolQuery } from './schoolApi';

export interface StoreItem { key: string; name: string; description: string; icon: string; price: number; enabled: boolean; enabledAt: string | null; available: boolean }
export interface Store { items: StoreItem[]; baseFee: number; featuresTotal: number; total: number; enforced: boolean }

/** Funksiyalar do'koni: yoqilgan funksiyaning narxi oylik to'lovga qo'shiladi va shu yerning o'zida ko'rinadi. */
export function StoreTab() {
  const { data, isLoading } = useSchoolQuery<Store>(['store'], '/api/v1/admin/features');
  const enable = useSchoolAction((key: string) => post(`/api/v1/admin/features/${key}/enable`), "Funksiya yoqildi — narxi oylik to'lovga qo'shildi");
  const disable = useSchoolAction((key: string) => del(`/api/v1/admin/features/${key}`), "Funksiya o'chirildi — keyingi oylik hisobdan chiqadi");
  if (isLoading || !data) return <Skeleton className="h-64 w-full" />;
  const busy = enable.isPending || disable.isPending;
  return (
    <div className="space-y-4">
      <Panel title="Oylik to'lov" icon={Sparkles} accent="gold">
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between"><dt className="text-ink-muted">Asosiy tarif</dt><dd className="font-semibold text-ink">{data.baseFee ? money(data.baseFee) : 'belgilanmagan'}</dd></div>
          {data.items.filter(i => i.enabled).map(i => (
            <div key={i.key} className="flex justify-between"><dt className="text-ink-muted">{i.icon} {i.name}</dt><dd className="font-semibold text-ink">+ {money(i.price)}</dd></div>
          ))}
          <div className="flex justify-between border-t border-tint/10 pt-2"><dt className="font-semibold text-ink">Jami (oyiga)</dt><dd className="text-base font-extrabold text-gold">{money(data.total)}</dd></div>
        </dl>
        <p className="mt-2 text-[11px] text-ink-muted">Yoqilgan funksiyaning narxi keyingi hisobdan boshlab oylik to'lovga qo'shiladi. O'chirsangiz, keyingi oy hisobidan chiqadi.</p>
      </Panel>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {data.items.map(i => (
          <div key={i.key} className={`rounded-2xl border p-4 ${i.enabled ? 'border-teal/30 bg-teal/5' : 'border-tint/10 bg-surface/40'}`}>
            <div className="flex items-start gap-3">
              <span className="text-2xl" aria-hidden>{i.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><h3 className="text-sm font-bold text-ink">{i.name}</h3>{i.enabled && <Chip s={{ l: 'Yoqilgan', c: 'bg-teal/15 text-teal' }} />}</div>
                <p className="mt-1 text-xs text-ink-muted">{i.description}</p>
                <p className="mt-2 text-sm font-semibold text-gold">{money(i.price)} <span className="text-[11px] font-normal text-ink-muted">/ oyiga</span></p>
              </div>
            </div>
            <button type="button" disabled={busy || (!i.enabled && !i.available)}
              onClick={() => (i.enabled ? disable.mutate(i.key) : enable.mutate(i.key))}
              className={`mt-3 w-full rounded-xl py-2.5 text-xs font-semibold disabled:opacity-40 ${i.enabled ? 'bg-coral/10 text-coral' : 'bg-sky text-base'}`}>
              {i.enabled ? "O'chirish" : <span className="inline-flex items-center gap-1"><Check size={14} />Yoqish · {money(i.price)}/oy</span>}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
