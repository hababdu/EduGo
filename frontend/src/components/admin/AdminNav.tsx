import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, GraduationCap, FolderOpen, Wallet,
  UserPlus, School, CalendarClock, MoreHorizontal, X,
} from 'lucide-react';
import { haptic } from '../../lib/telegram';

const PRIMARY = [
  { to: '/admin', label: 'Boshqaruv', Icon: LayoutDashboard, end: true },
  { to: '/admin/students', label: 'O\'quvchilar', Icon: GraduationCap },
  { to: '/admin/groups', label: 'Guruhlar', Icon: FolderOpen },
  { to: '/admin/payments', label: 'To\'lovlar', Icon: Wallet },
];

const SECONDARY = [
  { to: '/admin/users', label: 'Foydalanuvchilar', Icon: Users },
  { to: '/admin/leads', label: 'Lidlar', Icon: UserPlus },
  { to: '/admin/trials', label: 'Sinov darslari', Icon: CalendarClock },
  { to: '/admin/school', label: 'Maktab', Icon: School },
];

function matches(pathname: string, item: { to: string; end?: boolean }) {
  return item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(item.to + '/');
}

/** Ixcham admin navigatsiyasi: asosiy bo'limlar doim ko'rinadi, qolganlari "Yana" ichida. */
export function AdminNav() {
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = SECONDARY.some((item) => matches(pathname, item));

  useEffect(() => setMoreOpen(false), [pathname]);

  const linkClass = (active: boolean) =>
    `relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-[10px] font-semibold transition-colors sm:text-[11px] ${
      active ? 'bg-accent/10 text-accent' : 'text-ink-faint hover:bg-surface/70 hover:text-ink'
    }`;

  return (
    <>
      {moreOpen && (
        <button aria-label="Menyuni yopish" className="fixed inset-0 z-40 cursor-default bg-black/10" onClick={() => setMoreOpen(false)} />
      )}
      <nav aria-label="Admin navigatsiyasi" className="glass fixed inset-x-0 bottom-0 z-50 border-t border-tint/10 shadow-[0_-8px_30px_rgb(0_0_0/0.08)]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto flex max-w-2xl items-center gap-1 px-2 py-2 sm:gap-2 sm:px-4">
          {PRIMARY.map(({ to, label, Icon, end }) => {
            const active = matches(pathname, { to, end });
            return (
              <NavLink key={to} to={to} end={end} onClick={() => haptic('light')} aria-current={active ? 'page' : undefined} className={linkClass(active)}>
                <Icon className="h-[19px] w-[19px]" strokeWidth={active ? 2.4 : 1.9} aria-hidden="true" />
                <span className="max-w-full truncate">{label}</span>
              </NavLink>
            );
          })}
          <div className="relative min-w-0 flex-1">
            {moreOpen && (
              <div className="absolute bottom-[calc(100%+12px)] right-0 z-50 w-64 overflow-hidden rounded-2xl border border-tint/10 bg-surface p-2 shadow-2xl">
                <div className="flex items-center justify-between px-2 pb-2 pt-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">Boshqa bo'limlar</p>
                  <button type="button" onClick={() => setMoreOpen(false)} aria-label="Yopish" className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-2"><X className="h-4 w-4" /></button>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {SECONDARY.map(({ to, label, Icon }) => {
                    const active = matches(pathname, { to });
                    return (
                      <NavLink key={to} to={to} onClick={() => { haptic('light'); setMoreOpen(false); }} aria-current={active ? 'page' : undefined} className={`flex min-w-0 items-center gap-2 rounded-xl px-2.5 py-3 text-xs font-medium transition-colors ${active ? 'bg-accent/10 text-accent' : 'text-ink-muted hover:bg-surface-2 hover:text-ink'}`}>
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            )}
            <button type="button" aria-expanded={moreOpen} aria-haspopup="menu" onClick={() => { haptic('light'); setMoreOpen((open) => !open); }} className={linkClass(moreActive || moreOpen)}>
              <MoreHorizontal className="h-[19px] w-[19px]" strokeWidth={2} aria-hidden="true" />
              <span>Yana</span>
              {moreActive && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent" />}
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
