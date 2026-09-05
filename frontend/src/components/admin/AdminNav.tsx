import { NavLink } from 'react-router-dom';

const items = [
  { to: '/admin', icon: '📊', label: 'Dashboard', end: true },
  { to: '/admin/students', icon: '👨‍🎓', label: 'Studentlar' },
];

export function AdminNav() {
  return (
    <nav className="border-b border-white/5 px-6 flex gap-1">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-3.5 text-sm border-b-2 -mb-px ${
              isActive
                ? 'border-gold text-ink'
                : 'border-transparent text-ink-muted'
            }`
          }
        >
          <span aria-hidden="true">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
