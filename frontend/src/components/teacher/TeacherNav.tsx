import { NavLink } from 'react-router-dom';

export function TeacherNav() {
  return (
    <nav className="border-b border-white/5 px-6 flex gap-1">
      <NavLink
        to="/teacher"
        end
        className={({ isActive }) =>
          `flex items-center gap-2 px-3 py-3.5 text-sm border-b-2 -mb-px ${
            isActive ? 'border-gold text-ink' : 'border-transparent text-ink-muted'
          }`
        }
      >
        <span aria-hidden="true">🏫</span>
        Mening ish maydonim
      </NavLink>
    </nav>
  );
}
