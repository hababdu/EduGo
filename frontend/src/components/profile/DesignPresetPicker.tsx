import { DESIGN_PRESETS, setDesignPreset, useTheme } from '../../lib/theme';

export function DesignPresetPicker() {
  const { preset } = useTheme();

  return (
    <section className="rounded-3xl border border-tint/10 bg-surface/20 p-4 space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-ink">Dizayn uslubi</h2>
        <p className="text-xs text-ink-muted mt-1">Ilova ko‘rinishini o‘zingizga moslang</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {DESIGN_PRESETS.map((item) => {
          const active = preset === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              onClick={() => setDesignPreset(item.id)}
              className={`min-h-[76px] rounded-2xl border p-3 text-left transition-all ${active ? 'border-accent bg-accent/10 ring-1 ring-accent/30' : 'border-tint/10 bg-surface/20 hover:bg-surface/40'}`}
            >
              <span className="block text-xs font-semibold text-ink">{item.label}</span>
              <span className="block text-[10px] leading-4 text-ink-muted mt-1">{item.description}</span>
              {active && <span className="block text-[10px] font-semibold text-accent mt-1">Tanlangan</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}
