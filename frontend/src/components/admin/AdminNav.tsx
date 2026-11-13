import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, GraduationCap, Wallet, UserPlus, School, BookOpen } from 'lucide-react';
import { haptic } from '../../lib/telegram';

/**
 * Admin navigatsiyasi — 5 ta bo'lim, takrorlanmaydi:
 * Maktab = a'zolar + guruhlar + sinov darslari + jadval + profil (eski «Foydalanuvchilar», «Guruhlar», «Sinov darslari»).
 */
const ITEMS = [
  { to: '/admin', label: 'Boshqaruv', Icon: LayoutDashboard, end: true },
  { to: '/admin/students', label: "O'quvchilar", Icon: GraduationCap },
  { to: '/admin/school', label: 'Maktab', Icon: School, also: ['/admin/groups', '/admin/trials', '/admin/users'] },
  { to: '/admin/payments', label: "To'lovlar", Icon: Wallet },
  { to: '/admin/leads', label: 'Lidlar', Icon: UserPlus },
  { to: '/admin/education', label: 'Ta’lim modeli', Icon: BookOpen },
];

function matches(pathname: string, item: { to: string; end?: boolean; also?: string[] }) {
  const hit = (p: string) => pathname === p || pathname.startsWith(p + '/');
  return item.end ? pathname === item.to : hit(item.to) || !!item.also?.some(hit);
}

export function AdminNav() {
  const { pathname } = useLocation();
  return (
    <nav aria-label="Admin navigatsiyasi" className="glass fixed inset-x-0 bottom-0 z-50 border-t border-tint/10 shadow-[0_-8px_30px_rgb(0_0_0/0.08)]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="mx-auto flex max-w-2xl items-center gap-1 px-2 py-2 sm:gap-2 sm:px-4">
        {ITEMS.map((item) => {
          const active = matches(pathname, item);
          const { to, label, Icon, end } = item;
          return (
            <NavLink key={to} to={to} end={end} onClick={() => haptic('light')} aria-current={active ? 'page' : undefined}
              className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-[10px] font-semibold transition-colors sm:text-[11px] ${active ? 'bg-accent/10 text-accent' : 'text-ink-faint hover:bg-surface/70 hover:text-ink'}`}>
              <Icon className="h-[19px] w-[19px]" strokeWidth={active ? 2.4 : 1.9} aria-hidden="true" />
              <span className="max-w-full truncate">{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
