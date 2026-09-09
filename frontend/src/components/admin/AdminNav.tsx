import { NavLink, useLocation } from 'react-router-dom';

const items = [
  { to: '/admin', icon: '📊', label: 'Dashboard', end: true },
  { to: '/admin/users', icon: '👥', label: 'Foydalanuvchilar' }, // 👈 Yangi qo'shildi
  { to: '/admin/students', icon: '👨‍🎓', label: 'Studentlar' },
  { to: '/admin/groups', icon: '👨‍🎓', label: 'Guruhlash' },
  { to: '/admin/content/courses', icon: '📚', label: 'Kontent', matchPrefix: '/admin/content' },
  { to: '/admin/questions', icon: '❓', label: 'Savollar' },
  { to: '/admin/tests', icon: '📝', label: 'Testlar' },
];

export function AdminNav() {
  const location = useLocation();

  return (
    <nav className="border-b border-white/5 px-6 flex gap-1 overflow-x-auto no-scrollbar">
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
            className={`flex items-center gap-2 px-3 py-3.5 text-sm border-b-2 -mb-px shrink-0 ${
              isActive ? 'border-gold text-ink' : 'border-transparent text-ink-muted'
            }`}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}