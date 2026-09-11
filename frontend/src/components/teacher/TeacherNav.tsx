import { NavLink, useLocation } from 'react-router-dom';

const items = [
  { to: '/teacher', icon: '🏫', label: 'Ish maydonim', end: true },
  { to: '/teacher/content/courses', icon: '📚', label: 'Kontent', matchPrefix: '/teacher/content' },
  { to: '/teacher/questions', icon: '❓', label: 'Savollar' },
  { to: '/teacher/tests', icon: '📝', label: 'Testlar' },
];

export function TeacherNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface/90 backdrop-blur-md border-t border-white/10 px-4 py-2 flex items-center justify-around overflow-x-auto no-scrollbar shadow-lg">
      {items.map((item) => {
        const isActive = item.matchPrefix
          ? location.pathname.startsWith(item.matchPrefix)
          : item.end
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);

        return (
          <NavLink
            key={item.to}
            to={item.to}
            title={item.label}
            className={`flex flex-col items-center justify-center p-3 rounded-xl transition-all shrink-0 ${
              isActive ? 'text-gold bg-gold/10 scale-105' : 'text-ink-muted hover:text-ink hover:bg-surface-muted/50'
            }`}
          >
            <span className="text-xl" aria-hidden="true">{item.icon}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}