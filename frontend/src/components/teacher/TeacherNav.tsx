// src/components/navigation/TeacherNav.tsx
import { useLocation, useNavigate } from 'react-router-dom';
import { useTelegram } from '../../hooks/useTelegram';
import {
  Home,
  Users,
  BookOpen,
  FileText,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';

/* ============================================================
   TYPES
   ============================================================ */
interface NavItem {
  key: string;
  label: string;
  Icon: LucideIcon;
  path: string;
  match: (pathname: string) => boolean;
}

/* ============================================================
   NAV ITEMS
   ============================================================ */
const NAV_ITEMS: NavItem[] = [
  {
    key: 'overview',
    label: 'Asosiy',
    Icon: Home,
    path: '/teacher',
    match: (p) => p === '/teacher' || p === '/teacher/',
  },
  {
    key: 'groups',
    label: 'Guruhlar',
    Icon: Users,
    path: '/teacher/groups',
    match: (p) => p.startsWith('/teacher/groups'),
  },
  {
    key: 'materials',
    label: 'Materiallar',
    Icon: BookOpen,
    path: '/teacher/content/courses',
    match: (p) =>
      p.startsWith('/teacher/content') ||
      p.startsWith('/teacher/assignments') ||
      p.startsWith('/teacher/sections') ||
      p.startsWith('/teacher/topics') ||
      p.startsWith('/teacher/lessons'),
  },
  {
    key: 'tests',
    label: 'Testlar',
    Icon: FileText,
    path: '/teacher/tests',
    match: (p) => p.startsWith('/teacher/tests'),
  },
  {
    key: 'questions',
    label: 'Savollar',
    Icon: MessageSquare,
    path: '/teacher/questions',
    match: (p) => p.startsWith('/teacher/questions'),
  },
];

/* ============================================================
   COMPONENT
   ============================================================ */
export function TeacherNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { haptic } = useTelegram();

  const handleNavigate = (item: NavItem) => {
    haptic('light');
    navigate(item.path);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-surface/90 backdrop-blur-xl border-t border-white/5"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      aria-label="Asosiy navigatsiya"
    >
      <div className="max-w-4xl mx-auto grid grid-cols-5">
        {NAV_ITEMS.map((item) => {
          const isActive = item.match(location.pathname);
          const { Icon } = item;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => handleNavigate(item)}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] transition-colors ${
                isActive ? 'text-gold' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {/* Active indicator — yuqoridagi chiziq */}
              {isActive && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gold rounded-full"
                  aria-hidden="true"
                />
              )}

              <Icon
                className={`w-5 h-5 transition-transform ${
                  isActive ? 'scale-105' : ''
                }`}
                strokeWidth={isActive ? 2.5 : 2}
              />

              <span
                className={`text-[10px] font-semibold leading-none ${
                  isActive ? 'text-gold' : ''
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default TeacherNav;