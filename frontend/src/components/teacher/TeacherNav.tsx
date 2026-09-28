// src/components/navigation/AdminNav.tsx
import { useLocation, useNavigate } from 'react-router-dom';
import { useTelegram } from '../../hooks/useTelegram';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  FileText,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
  key: string;
  label: string;
  Icon: LucideIcon;
  path: string;
  match: (pathname: string) => boolean;
}

const ADMIN_NAV: NavItem[] = [
  {
    key: 'dashboard',
    label: 'Boshqaruv',
    Icon: LayoutDashboard,
    path: '/admin',
    match: (p) => p === '/admin' || p === '/admin/',
  },
  {
    key: 'users',
    label: 'Foydalanuvchi',
    Icon: Users,
    path: '/admin/users',
    match: (p) => p.startsWith('/admin/users'),
  },
  {
    key: 'content',
    label: 'Kontent',
    Icon: BookOpen,
    path: '/admin/content',
    match: (p) => p.startsWith('/admin/content'),
  },
  {
    key: 'tests',
    label: 'Testlar',
    Icon: FileText,
    path: '/admin/tests',
    match: (p) => p.startsWith('/admin/tests'),
  },
  {
    key: 'ai',
    label: 'AI',
    Icon: MessageSquare,
    path: '/admin/questions',
    match: (p) => p.startsWith('/admin/questions'),
  },
];

export function AdminNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { haptic } = useTelegram();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-surface/90 backdrop-blur-xl border-t border-white/5"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Admin navigatsiya"
    >
      <div className="max-w-4xl mx-auto grid grid-cols-5">
        {ADMIN_NAV.map((item) => {
          const isActive = item.match(location.pathname);
          const { Icon } = item;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                haptic('light');
                navigate(item.path);
              }}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center gap-1 py-2.5 min-h-[56px] transition-colors ${
                isActive ? 'text-gold' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gold rounded-full" />
              )}
              <Icon
                className={`w-5 h-5 transition-transform ${isActive ? 'scale-105' : ''}`}
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

export default AdminNav;