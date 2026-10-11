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
  const isActive = ({ to, match, end }: StaffNavItem) =>
    end ? pathname === to : (match ?? [to]).some((p) => pathname === p || pathname.startsWith(p + '/'));
  const activeIdx = items.findIndex(isActive);
  const n = items.length;
  return (
    <nav
      aria-label={label}
      className="glass fixed inset-x-0 bottom-0 z-40 border-t border-white/5"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="relative mx-auto flex max-w-3xl justify-around">
        {activeIdx >= 0 && (
          <span
            aria-hidden="true"
            className="nav-indicator pointer-events-none absolute top-0 left-0 flex justify-center"
            style={{ width: `${100 / n}%`, transform: `translateX(${activeIdx * 100}%)` }}
          >
            <span className="h-0.5 w-8 rounded-full bg-gold shadow-[0_0_10px_2px_rgb(232_184_74/0.55)]" />
          </span>
        )}
        {items.map((item) => {
          const { to, label: text, Icon } = item;
          const active = isActive(item);
          return (
            <NavLink
              key={to}
              to={to}
              onClick={() => haptic('light')}
              aria-current={active ? 'page' : undefined}
              className={`relative flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2 text-[11px] font-semibold transition-colors duration-200 ${
                active ? 'text-gold' : 'text-ink-faint hover:text-ink-muted'
              }`}
            >
              <span className={`relative flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-300 ${active ? 'bg-gold/15' : ''}`}>
                <Icon
                  key={active ? 'on' : 'off'}
                  className={`h-5 w-5 ${active ? 'nav-pop' : ''}`}
                  strokeWidth={active ? 2.4 : 2}
                  aria-hidden="true"
                />
              </span>
              <span className="truncate">{text}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
