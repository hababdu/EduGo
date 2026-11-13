import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Check, GraduationCap, Layers3, Save } from 'lucide-react';
import { apiFetch } from '../../lib/api-client';
import { PAGE_WIDE } from '../../design/tokens';
import { StaffHero, Panel } from '../../components/staff';
import { Skeleton } from '../../components/ui';
import { toast } from '../../components/ui/Toast';

type CatalogItem = { key: string; label: string };
type Module = { featureKey: string; enabled: boolean; settings?: Record<string, unknown> };
type Period = { id: string; name: string; periodType: string; startsAt: string; endsAt: string; isActive: boolean };
type Config = { organizationId: string; model: { modelKey: string; settings?: Record<string, unknown> }; modules: Module[]; policies: { policyKey: string; config: Record<string, unknown> }[]; periods: Period[] };
type Catalog = { models: CatalogItem[]; features: CatalogItem[]; policies: CatalogItem[] };
const inputCls = 'min-h-[42px] w-full rounded-xl border border-tint/10 bg-surface/50 px-3 py-2 text-sm text-ink outline-none focus:border-accent/60';

export function AdminEducationSettings() {
  const qc = useQueryClient();
  const [modelKey, setModelKey] = useState('CUSTOM');
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [periodName, setPeriodName] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [periodType, setPeriodType] = useState('CUSTOM');
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const catalogQuery = useQuery({ queryKey: ['education-catalog'], queryFn: () => apiFetch<Catalog>('/api/v1/organization/education/catalog') });
  const configQuery = useQuery({ queryKey: ['organization-education-config'], queryFn: () => apiFetch<Config>('/api/v1/organization/education/config') });

  useEffect(() => {
    if (configQuery.data && !settingsLoaded) {
      setModelKey(configQuery.data.model?.modelKey ?? 'CUSTOM');
      setEnabled(Object.fromEntries(configQuery.data.modules.map((m) => [m.featureKey, m.enabled])));
      setSettingsLoaded(true);
    }
  }, [configQuery.data, settingsLoaded]);

  const save = useMutation({
    mutationFn: () => apiFetch('/api/v1/organization/education/config', {
      method: 'PATCH',
      data: {
        modelKey,
        modules: (catalogQuery.data?.features ?? []).map((f) => ({ featureKey: f.key, enabled: !!enabled[f.key], settings: configQuery.data?.modules.find((m) => m.featureKey === f.key)?.settings ?? {} })),
        policies: configQuery.data?.policies ?? [],
      },
    }),
    onSuccess: async () => { toast('success', 'Ta’lim modeli sozlamalari saqlandi'); await qc.invalidateQueries({ queryKey: ['organization-education-config'] }); },
    onError: (e: any) => toast('error', e?.message ?? 'Saqlashda xatolik'),
  });
  const addPeriod = useMutation({
    mutationFn: () => apiFetch('/api/v1/organization/education/periods', { method: 'POST', data: {
      name: periodName, periodType, startsAt: new Date(periodStart + 'T00:00:00+05:00').toISOString(),
      endsAt: new Date(periodEnd + 'T23:59:59+05:00').toISOString(), isActive: true,
    } }),
    onSuccess: async () => { setPeriodName(''); setPeriodStart(''); setPeriodEnd(''); await qc.invalidateQueries({ queryKey: ['organization-education-config'] }); toast('success', 'O‘quv davri qo‘shildi'); },
    onError: (e: any) => toast('error', e?.message ?? 'Davrni qo‘shib bo‘lmadi'),
  });
  const periods = configQuery.data?.periods ?? [];
  const activePeriod = periods.find((p) => p.isActive);

  return (
    <div className={PAGE_WIDE}>
      <StaffHero accent="teal" eyebrow="EduGo · Tashkilot sozlamalari" title="Ta’lim modeli"
        subtitle="Tashkilotingiz qanday ta’lim berishini, qaysi modullardan foydalanishini va o‘quv davrlarini belgilang." />
      {(catalogQuery.isLoading || configQuery.isLoading) && <Skeleton className="h-48" />}
      {(catalogQuery.error || configQuery.error) && <p className="rounded-xl bg-coral/10 p-3 text-sm text-coral">{(catalogQuery.error || configQuery.error as Error)?.message ?? 'Ma’lumotlarni yuklab bo‘lmadi'}</p>}
      {catalogQuery.data && configQuery.data && <>
        <Panel title="Ta’lim modeli" icon={GraduationCap} accent="teal">
          <p className="mb-3 text-xs text-ink-muted">Tashkilotingizning asosiy ish uslubini tanlang. Turi va yo‘nalishlari katalogi bundan mustaqil.</p>
          <select className={inputCls} value={modelKey} onChange={(e) => setModelKey(e.target.value)}>
            {catalogQuery.data.models.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {catalogQuery.data.models.map((m) => <button type="button" key={m.key} onClick={() => setModelKey(m.key)}
              className={`rounded-xl border p-3 text-left transition ${modelKey === m.key ? 'border-accent bg-accent/10' : 'border-tint/10 bg-surface/30'}`}>
              <span className="flex items-center justify-between gap-2 text-sm font-semibold text-ink">{m.label}{modelKey === m.key && <Check className="h-4 w-4 text-accent" />}</span>
              <span className="mt-1 block text-[11px] text-ink-muted">{m.key.replaceAll('_', ' ')}</span>
            </button>)}
          </div>
        </Panel>

        <Panel title="Faol modullar" icon={Layers3} accent="gold">
          <p className="mb-3 text-xs text-ink-muted">Kerak bo‘lmagan modullarni o‘chiring. Bu sozlamalar hozircha konfiguratsiya sifatida saqlanadi; mavjud ekran va API’larni to‘liq bloklash keyingi ulash bosqichida bajariladi.</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {catalogQuery.data.features.map((f) => {
              const checked = !!enabled[f.key];
              return <label key={f.key} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-tint/10 bg-surface/30 px-3 py-2">
                <input type="checkbox" checked={checked} onChange={(e) => setEnabled((s) => ({ ...s, [f.key]: e.target.checked }))} className="h-4 w-4 accent-[var(--accent)]" />
                <span className="text-sm text-ink">{f.label}</span>
                <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] ${checked ? 'bg-teal/15 text-teal' : 'bg-surface text-ink-faint'}`}>{checked ? 'Yoqilgan' : 'O‘chiq'}</span>
              </label>;
            })}
          </div>
          <button type="button" disabled={save.isPending} onClick={() => save.mutate()} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-base disabled:opacity-50">
            <Save className="h-4 w-4" />{save.isPending ? 'Saqlanmoqda…' : 'Sozlamalarni saqlash'}
          </button>
        </Panel>

        <Panel title="O‘quv davrlari" icon={CalendarDays} accent="violet">
          <p className="mb-3 text-xs text-ink-muted">O‘quv yili, semestr, kurs oqimi yoki qisqa kursning boshlanish va tugash sanasini belgilang. Bir vaqtda bitta davr faol bo‘ladi.</p>
          {activePeriod && <div className="mb-3 rounded-xl border border-teal/20 bg-teal/10 p-3 text-xs text-teal">Faol davr: <strong>{activePeriod.name}</strong> · {new Date(activePeriod.startsAt).toLocaleDateString()} – {new Date(activePeriod.endsAt).toLocaleDateString()}</div>}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input className={inputCls} placeholder="Davr nomi (masalan, 2026–2027)" value={periodName} onChange={(e) => setPeriodName(e.target.value)} />
            <select className={inputCls} value={periodType} onChange={(e) => setPeriodType(e.target.value)}>
              <option value="ACADEMIC_YEAR">O‘quv yili</option><option value="SEMESTER">Semestr</option><option value="COURSE">Kurs oqimi</option><option value="SHORT_COURSE">Qisqa kurs</option><option value="CUSTOM">Boshqa</option>
            </select>
            <label className="text-xs text-ink-muted">Boshlanish sanasi<input type="date" className={inputCls} value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} /></label>
            <label className="text-xs text-ink-muted">Tugash sanasi<input type="date" className={inputCls} value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} /></label>
          </div>
          <button type="button" disabled={!periodName.trim() || !periodStart || !periodEnd || addPeriod.isPending} onClick={() => addPeriod.mutate()} className="mt-3 w-full rounded-xl border border-accent/30 bg-accent/10 py-2.5 text-sm font-semibold text-accent disabled:opacity-40">Davr qo‘shish va faollashtirish</button>
          <div className="mt-4 space-y-2">
            {periods.map((p) => <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-tint/10 bg-surface/30 p-3">
              <div className="min-w-0"><p className="truncate text-sm font-semibold text-ink">{p.name}</p><p className="text-[11px] text-ink-muted">{new Date(p.startsAt).toLocaleDateString()} – {new Date(p.endsAt).toLocaleDateString()}</p></div>
              <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] ${p.isActive ? 'bg-teal/15 text-teal' : 'bg-surface text-ink-muted'}`}>{p.isActive ? 'Faol' : 'Tarixiy'}</span>
            </div>)}
          </div>
        </Panel>
      </>}
    </div>
  );
}
