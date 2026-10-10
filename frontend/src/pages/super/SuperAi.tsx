import { useEffect, useState } from 'react';
import { StaffHero, Panel, MiniBars } from '../../components/staff';
import { Skeleton } from '../../components/ui';
import { IMAGES } from '../../design/images';
import { CONTROL, PAGE } from '../../design/tokens';
import { Sparkles, Users } from '../../design/icons';
import { num, ROLE_UZ, sapi, useSuperAi, useSuperMutation } from './superApi';

const ROLES = ['STUDENT', 'TEACHER', 'ADMIN'];

export function SuperAi() {
  const { data } = useSuperAi();
  const save = useSuperMutation(sapi.saveAi, 'Saqlandi');
  const [limits, setLimits] = useState<Record<string, string>>({});
  useEffect(() => {
    if (data) setLimits(Object.fromEntries(ROLES.map((r) => [r, String(data.settings.limits[r] ?? 0)])));
  }, [data?.settings.limits.STUDENT, data?.settings.limits.TEACHER, data?.settings.limits.ADMIN]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) return <div className={PAGE}><Skeleton className="h-64" /></div>;
  const on = data.settings.enabled;
  const valid = ROLES.every((r) => /^\d{1,8}$/.test(limits[r] ?? ''));

  return (
    <div className={PAGE}>
      <StaffHero accent="gold" image={IMAGES.hero} eyebrow="SUPER ADMIN · AI NAZORATI" title="AI nazorati" subtitle={`Asosiy: ${data.provider.primary}${data.provider.fallback ? ` · zaxira: ${data.provider.fallback}` : ''}`} />

      <Panel title="AI holati" icon={Sparkles} accent={on ? 'teal' : 'coral'}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-ink">{on ? 'AI yoqilgan — hamma foydalana oladi' : "AI o'chirilgan — hech kim foydalana olmaydi"}</p>
          <button type="button" role="switch" aria-checked={on} disabled={save.isPending}
            onClick={() => { if (on && !window.confirm("AI hamma uchun o'chirilsinmi?")) return; save.mutate({ enabled: !on }); }}
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? 'bg-teal' : 'bg-white/15'}`}>
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
          <ul className="divide-y divide-white/5">
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
        <ul className="divide-y divide-white/5">
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
