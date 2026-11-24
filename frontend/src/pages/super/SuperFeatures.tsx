import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { StaffHero, Panel } from '../../components/staff';
import { Skeleton } from '../../components/ui';
import { toast } from '../../components/ui/Toast';
import { IMAGES } from '../../design/images';
import { PAGE } from '../../design/tokens';
import { apiFetch } from '../../lib/api-client';
import { inputCls, money } from '../school/schoolApi';

interface Row { key: string; name: string; description: string; icon: string; priceMonthly: number; active: boolean; schools: number }

function FeatureRow({ r }: { r: Row }) {
  const qc = useQueryClient();
  const [price, setPrice] = useState(String(r.priceMonthly));
  useEffect(() => setPrice(String(r.priceMonthly)), [r.priceMonthly]);
  const save = useMutation({
    mutationFn: (d: { priceMonthly?: number; active?: boolean }) => apiFetch(`/api/v1/super/features/${r.key}`, { method: 'PATCH', data: d as any }),
    onSuccess: () => { toast('success', 'Saqlandi'); qc.invalidateQueries({ queryKey: ['super-features'] }); },
    onError: (e: any) => toast('error', e?.message || 'Xatolik'),
  });
  const n = Number(price);
  const valid = Number.isInteger(n) && n >= 0 && n !== r.priceMonthly;
  return (
    <li className="space-y-2 px-5 py-3">
      <div className="flex items-center gap-2"><span aria-hidden>{r.icon}</span><b className="text-sm text-ink">{r.name}</b><span className="ml-auto text-[11px] text-ink-muted">{r.schools} ta maktab</span></div>
      <div className="flex items-center gap-2">
        <input className={inputCls} inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))} aria-label={`${r.name} narxi`} />
        <button type="button" disabled={!valid || save.isPending} onClick={() => save.mutate({ priceMonthly: n })} className="shrink-0 rounded-xl bg-sky px-4 py-2.5 text-xs font-semibold text-base disabled:opacity-40">Saqlash</button>
      </div>
      <label className="flex items-center gap-2 text-xs text-ink"><input type="checkbox" checked={r.active} onChange={(e) => save.mutate({ active: e.target.checked })} />Sotuvda ({money(r.priceMonthly)}/oy). Narx o'zgarsa, yoqib bo'lgan maktablarga ta'sir qilmaydi.</label>
    </li>
  );
}

export function SuperFeatures() {
  const { data, isLoading } = useQuery({ queryKey: ['super-features'], queryFn: () => apiFetch<Row[]>('/api/v1/super/features') });
  return (
    <div className={PAGE}>
      <StaffHero accent="sky" image={IMAGES.hero} eyebrow="SUPER ADMIN · DO'KON" title="Funksiyalar narxi" subtitle="Maktab adminlari do'kondan yoqadigan funksiyalarning oylik narxi." />
      <Panel title="Katalog" accent="gold" flush>
        {isLoading || !data ? <div className="p-5"><Skeleton className="h-32" /></div> : <ul className="divide-y divide-tint/5">{data.map((r) => <FeatureRow key={r.key} r={r} />)}</ul>}
      </Panel>
    </div>
  );
}
