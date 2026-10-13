import { THEME_ICON, THEME_LABEL, cycleTheme, useTheme } from '../../lib/theme';

/** Mavzu almashtirgich: Avto → Qorong'i → Yorug' */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { pref } = useTheme();
  return (
    <button
      type="button"
      onClick={cycleTheme}
      className={`w-full flex items-center justify-between rounded-xl bg-tint/5 px-4 py-3 text-sm text-ink-muted active:scale-[0.99] transition ${className}`}
    >
      <span>{THEME_ICON[pref]} Mavzu</span>
      <span className="font-semibold text-ink">{THEME_LABEL[pref]}</span>
    </button>
  );
}
