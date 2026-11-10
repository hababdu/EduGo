import { NavLink, useLocation } from 'react-router-dom';
import { haptic } from '../../lib/telegram';

export interface SectionTab { to: string; label: string; match?: string[] }

/**
 * Bitta bo'lim ichidagi o'xshash sahifalar uchun yo'l-asosli tablar (pastki menyuda bitta tugma bo'lib turadi).
 * Sahifaning o'ziga tegmaydi: `Section` ichiga o'raladi.
 */
export function SectionTabs({ tabs, label }: { tabs: SectionTab[]; label: string }) {
  const { pathname } = useLocation();
  return (
    <div className="mx-auto max-w-4xl px-4 pt-4 sm:px-6">
      <div role="tablist" aria-label={label} className="flex gap-2 overflow-x-auto">
        {tabs.map((t) => {
          const active = (t.match ?? [t.to]).some((p) => pathname === p || pathname.startsWith(p + '/'));
          return (
            <NavLink key={t.to} to={t.to} role="tab" aria-selected={active} onClick={() => haptic('light')}
              className={`shrink-0 rounded-xl px-4 py-2 text-xs font-semibold transition-colors ${active ? 'bg-accent text-base' : 'bg-tint/5 text-ink-muted hover:bg-tint/10'}`}>
              {t.label}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}

/** Tablar + sahifa */
export function Section({ tabs, label, children }: { tabs: SectionTab[]; label: string; children: React.ReactNode }) {
  return (<><SectionTabs tabs={tabs} label={label} />{children}</>);
}
