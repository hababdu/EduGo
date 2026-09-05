import { NavLink } from 'react-router-dom';
import { haptic } from '../../lib/telegram';

const items = [
  { to: '/', icon: '🏠', label: 'Bosh sahifa' },
  { to: '/lessons', icon: '📚', label: 'Darslar' },
  { to: '/tests', icon: '📝', label: 'Testlar' },
  { to: '/ranking', icon: '🏆', label: 'Reyting' },
  { to: '/profile', icon: '👤', label: 'Profil' },
];

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 bg-surface border-t border-white/5 flex justify-around"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={() => haptic('light')}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 py-2.5 px-3 text-xs ${
              isActive ? 'text-gold' : 'text-ink-faint'
            }`
          }
        >
          <span className="text-lg" aria-hidden="true">
            {item.icon}
          </span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
