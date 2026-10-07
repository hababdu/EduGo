import { NavLink, useLocation } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { haptic } from '../../lib/telegram';

export interface StaffNavItem {
  to: string;
  label: string;
  Icon: LucideIcon;
  /** Faol deb hisoblanadigan yo'l prefikslari (berilmasa `to` ning o'zi) */
  match?: string[];
  end?: boolean;
}

/** Admin va o'qituvchi uchun yagona pastki navigatsiya (o'quvchi BottomNav bilan bir xil ko'rinish). */
export function StaffNav({ items, label }: { items: StaffNavItem[]; label: string }) {
  const { pathname } = useLocation();
  return (
    <nav
      aria-label={label}
      className="glass fixed inset-x-0 bottom-0 z-40 border-t border-white/5"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-3xl justify-around">
        {items.map(({ to, label: text, Icon, match, end }) => {
          const prefixes = match ?? [to];
          const active = end ? pathname === to : prefixes.some((p) => pathname === p || pathname.startsWith(p + '/'));
          return (
            <NavLink
              key={to}
              to={to}
              onClick={() => haptic('light')}
              aria-current={active ? 'page' : undefined}
              className={`relative flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2.5 text-[11px] font-semibold transition-colors ${
                active ? 'text-gold' : 'text-ink-faint hover:text-ink-muted'
              }`}
            >
              {active && <span aria-hidden="true" className="absolute top-0 h-0.5 w-8 rounded-full bg-gold" />}
              <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} aria-hidden="true" />
              <span className="truncate">{text}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
