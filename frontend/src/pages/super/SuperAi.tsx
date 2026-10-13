import { useEffect, useState } from 'react';
import { StaffHero, Panel, MiniBars } from '../../components/staff';
import { Skeleton } from '../../components/ui';
import { IMAGES } from '../../design/images';
import { CONTROL, PAGE } from '../../design/tokens';
import { Sparkles, Users } from '../../design/icons';
import { num, ROLE_UZ, sapi, useSuperAi, useSuperMutation, type AiProviderId } from './superApi';

const ROLES = ['STUDENT', 'TEACHER', 'ADMIN'];
const PROVIDERS: { id: AiProviderId; name: string; hint: string }[] = [
  { id: 'gemini', name: 'Gemini', hint: 'Google · tez va arzon' },
  { id: 'groq', name: 'Groq', hint: 'Tez, ochiq modellar' },
  { id: 'anthropic', name: 'Claude', hint: 'Anthropic · aniq javoblar' },
];
const MODEL_RE = /^[A-Za-z0-9._\-/:]{0,80}$/;

export function SuperAi() {
  const { data } = useSuperAi();
  const save = useSuperMutation(sapi.saveAi, 'Saqlandi');
  const [limits, setLimits] = useState<Record<string, string>>({});
  useEffect(() => {
    if (data) setLimits(Object.fromEntries(ROLES.map((r) => [r, String(data.settings.limits[r] ?? 0)])));
  }, [data?.settings.limits.STUDENT, data?.settings.limits.TEACHER, data?.settings.limits.ADMIN]); // eslint-disable-line react-hooks/exhaustive-deps

  const [primary, setPrimary] = useState<AiProviderId>('gemini');
  const [fallback, setFallback] = useState<AiProviderId | 'none'>('none');
  const [models, setModels] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!data) return;
    setPrimary(data.settings.primary);
    setFallback(data.settings.fallback ?? 'none');
    const m: Record<string, string> = {};
    for (const p of PROVIDERS) for (const t of ['fast', 'smart'] as const) {
      const cur = data.settings.models[p.id][t];
      m[`${p.id}.${t}`] = cur === data.provider.defaults[p.id][t] ? '' : cur;
    }
    setModels(m);
  }, [JSON.stringify(data?.settings.models), data?.settings.primary, data?.settings.fallback]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) return <div className={PAGE}><Skeleton className="h-64" /></div>;
  const modelsValid = Object.values(models).every((v) => MODEL_RE.test(v.trim()));
  const providerDirty =
    primary !== data.settings.primary || fallback !== (data.settings.fallback ?? 'none') ||
    PROVIDERS.some((p) => (['fast', 'smart'] as const).some((t) => (models[`${p.id}.${t}`] ?? '').trim() !== (data.settings.models[p.id][t] === data.provider.defaults[p.id][t] ? '' : data.settings.models[p.id][t])));
  const saveProvider = () => {
    const out: Partial<Record<AiProviderId, { fast?: string; smart?: string }>> = {};
    for (const p of PROVIDERS) out[p.id] = { fast: (models[`${p.id}.fast`] ?? '').trim(), smart: (models[`${p.id}.smart`] ?? '').trim() };
    save.mutate({ primary, fallback, models: out });
  };
  const on = data.settings.enabled;
  const valid = ROLES.every((r) => /^\d{1,8}$/.test(limits[r] ?? ''));

  return (
    <div className={PAGE}>
      <StaffHero accent="gold" image={IMAGES.hero} eyebrow="SUPER ADMIN · AI NAZORATI" title="AI nazorati" subtitle={`Asosiy: ${data.provider.primary}${data.provider.fallback ? ` · zaxira: ${data.provider.fallback}` : ''}${data.provider.active[0] && data.provider.active[0] !== data.provider.primary ? ` · hozir ishlayapti: ${data.provider.active[0]}` : ''}`} />

      <Panel title="Qaysi AI ishlaydi" icon={Sparkles} accent="gold">
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {PROVIDERS.map((p) => {
              const sel = primary === p.id;
              const ok = data.provider.configured[p.id];
              return (
                <button key={p.id} type="button" onClick={() => { setPrimary(p.id); if (fallback === p.id) setFallback('none'); }}
                  className={`rounded-2xl border p-3 text-left transition active:scale-[0.98] ${sel ? 'border-gold bg-gold/10' : 'border-tint/10 bg-tint/5'}`}>
                  <span className="block text-sm font-semibold text-ink">{p.name}</span>
                  <span className="mt-0.5 block text-[10px] leading-snug text-ink-muted">{p.hint}</span>
                  <span className={`mt-1.5 inline-block text-[10px] font-semibold ${ok ? 'text-teal' : 'text-coral'}`}>{ok ? '✓ kalit bor' : '✕ kalit yo\'q'}</span>
                  {sel && <span className="mt-1 block text-[10px] font-bold uppercase tracking-wide text-gold">Asosiy</span>}
                </button>
              );
            })}
          </div>
          {!data.provider.configured[primary] && (
            <p className="rounded-xl bg-coral/10 p-2.5 text-[11px] text-coral">
              {PROVIDERS.find((p) => p.id === primary)?.name} uchun API kalit sozlanmagan (Render → Environment). Hozircha kaliti bor boshqa AI ishlaydi.
            </p>
          )}
          <label className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-sm text-ink">Zaxira</span>
            <select className={CONTROL.input} value={fallback} onChange={(e) => setFallback(e.target.value as AiProviderId | 'none')}>
              <option value="none">Yo'q</option>
              {PROVIDERS.filter((p) => p.id !== primary).map((p) => <option key={p.id} value={p.id}>{p.name}{data.provider.configured[p.id] ? '' : ' (kalit yo\'q)'}</option>)}
            </select>
          </label>
          <details className="rounded-xl bg-tint/5 p-3">
            <summary className="cursor-pointer text-sm text-ink">Model nomlari (ixtiyoriy)</summary>
            <div className="mt-3 space-y-3">
              {PROVIDERS.map((p) => (
                <div key={p.id} className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{p.name}</p>
                  {(['fast', 'smart'] as const).map((t) => (
                    <label key={t} className="flex items-center gap-3">
                      <span className="w-14 shrink-0 text-xs text-ink-muted">{t === 'fast' ? 'Tez' : 'Aqlli'}</span>
                      <input className={CONTROL.input} placeholder={data.provider.defaults[p.id][t]} value={models[`${p.id}.${t}`] ?? ''}
                        onChange={(e) => setModels({ ...models, [`${p.id}.${t}`]: e.target.value })} />
                    </label>
                  ))}
                </div>
              ))}
              <p className="text-[11px] text-ink-faint">Bo'sh qoldirsangiz — standart model. Tez — oddiy so'rovlar, Aqlli — chat va murakkab javoblar.</p>
            </div>
          </details>
          <button type="button" disabled={!providerDirty || !modelsValid || save.isPending} className={`${CONTROL.buttonPrimary} w-full disabled:opacity-40`} onClick={saveProvider}>
            AI tanlovini saqlash
          </button>
        </div>
      </Panel>

      <Panel title="AI holati" icon={Sparkles} accent={on ? 'teal' : 'coral'}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-ink">{on ? 'AI yoqilgan — hamma foydalana oladi' : "AI o'chirilgan — hech kim foydalana olmaydi"}</p>
          <button type="button" role="switch" aria-checked={on} disabled={save.isPending}
            onClick={() => { if (on && !window.confirm("AI hamma uchun o'chirilsinmi?")) return; save.mutate({ enabled: !on }); }}
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? 'bg-teal' : 'bg-tint/15'}`}>
            <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
        </div>
      </Panel>

      <Panel title="Kunlik token limiti (rol bo'yicha)" icon={Users} accent="sky">
        <div className="space-y-2.5">
          {ROLES.map((r) => (
            <label key={r} className="flex items-center gap-3">
              <span className="w-24 text-sm text-ink">{ROLE_UZ[r]}</span>
              <input className={CONTROL.input} inputMode="numeric" value={limits[r] ?? ''} onChange={(e) => setLimits({ ...limits, [r]: e.target.value.replace(/\D/g, '') })} />
            </label>
          ))}
          <p className="text-[11px] text-ink-faint">0 — cheklanmagan. Super admin uchun cheklov yo'q. Vazifalarni AI bilan baholash limitga kirmaydi.</p>
          <button type="button" disabled={!valid || save.isPending} className={`${CONTROL.buttonPrimary} w-full disabled:opacity-40`}
            onClick={() => save.mutate({ limits: Object.fromEntries(ROLES.map((r) => [r, Number(limits[r])])) })}>
            Limitlarni saqlash
          </button>
        </div>
      </Panel>

      <Panel title="So'nggi 7 kun (token)" icon={Sparkles} accent="gold">
        <MiniBars color="gold" data={data.days.map((d) => ({ label: d.date.slice(8), value: d.tokens, title: `${d.date}: ${num(d.tokens)}` }))} />
      </Panel>

      <Panel title="Bugun eng ko'p ishlatganlar" icon={Users} accent="teal" flush>
        {data.topToday.length === 0 ? <p className="p-6 text-center text-sm text-ink-muted">Bugun AI ishlatilmagan</p> : (
          <ul className="divide-y divide-tint/5">
            {data.topToday.map((t, i) => (
              <li key={`${t.userId}-${i}`} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                <span className="min-w-0 truncate text-ink">{t.name} <span className="text-[11px] text-ink-muted">{t.role ? ROLE_UZ[t.role] : ''}</span></span>
                <span className="shrink-0 tabular-nums text-ink-muted">{num(t.tokens)} · {t.requests}x</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Funksiyalar bo'yicha (7 kun)" icon={Sparkles} accent="sky" flush>
        <ul className="divide-y divide-tint/5">
          {data.features.map((f) => (
            <li key={f.feature} className="flex items-center justify-between px-5 py-2.5 text-sm">
              <span className="text-ink">{f.feature}</span>
              <span className="tabular-nums text-ink-muted">{num(f.tokens)} · {f.requests}x</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
