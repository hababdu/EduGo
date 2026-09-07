import { NavLink } from 'react-router-dom';

export function AdminNav() {
  return (
    <header className="border-b border-white/5 bg-surface/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-display font-semibold text-gold text-sm">
            Admin Panel
          </span>
          <nav className="flex gap-1 text-xs">
            <NavLink
              to="/admin"
              end
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg transition-colors ${
                  isActive ? 'bg-gold/10 text-gold font-medium' : 'text-ink-muted hover:text-ink'
                }`
              }
            >
              Overview
            </NavLink>
            <NavLink
              to="/admin/students"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg transition-colors ${
                  isActive ? 'bg-gold/10 text-gold font-medium' : 'text-ink-muted hover:text-ink'
                }`
              }
            >
              O'quvchilar
            </NavLink>
            <NavLink
              to="/admin/groups"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg transition-colors ${
                  isActive ? 'bg-gold/10 text-gold font-medium' : 'text-ink-muted hover:text-ink'
                }`
              }
            >
              Guruhlar
            </NavLink>
            <NavLink
              to="/admin/subjects"
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg transition-colors ${
                  isActive ? 'bg-gold/10 text-gold font-medium' : 'text-ink-muted hover:text-ink'
                }`
              }
            >
              Fanlar & O'qituvchilar
            </NavLink>
          </nav>
        </div>
      </div>
    </header>
  );
}