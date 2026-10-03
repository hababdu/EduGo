import { NavLink } from 'react-router-dom';
import { Home, BookOpen, ClipboardList, Users, User } from 'lucide-react';
import { haptic } from '../../lib/telegram';

const items = [
  { to: '/', Icon: Home, label: 'Bosh sahifa', end: true },
  { to: '/lessons', Icon: BookOpen, label: 'Darslar', end: false },
  { to: '/tests', Icon: ClipboardList, label: 'Testlar', end: false },
  { to: '/groups', Icon: Users, label: 'Guruhlar', end: false },
  { to: '/profile', Icon: User, label: 'Profil', end: false },
];

export function BottomNav() {
  return (
    <nav
      aria-label="Asosiy navigatsiya"
      className="glass fixed bottom-0 inset-x-0 z-30 border-t border-white/5 flex justify-around"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {items.map(({ to, Icon, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={() => haptic('light')}
          className={({ isActive }) =>
            `relative flex flex-col items-center gap-0.5 py-2.5 px-3 text-[11px] font-semibold transition-colors ${
              isActive ? 'text-gold' : 'text-ink-faint hover:text-ink-muted'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {isActive && <span aria-hidden="true" className="absolute top-0 h-0.5 w-8 rounded-full bg-gold" />}
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.4 : 2} aria-hidden="true" />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
