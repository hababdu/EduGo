import { useLocation, useNavigate } from 'react-router-dom';
import { useTelegram } from '../../hooks/useTelegram';

interface NavItem {
  key: string;
  label: string;
  icon: string;
  path: string;
  match: (pathname: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    key: 'overview',
    label: 'Asosiy',
    icon: '🏠',
    path: '/teacher',
    match: (p) => p === '/teacher' || p === '/teacher/',
  },
  {
    key: 'groups',
    label: 'Guruhlar',
    icon: '👥',
    path: '/teacher/groups',
    match: (p) => p.startsWith('/teacher/groups'),
  },
  {
    key: 'materials',
    label: 'Materiallar',
    icon: '📚',
    path: '/teacher/content/courses',
    match: (p) =>
      p.startsWith('/teacher/content') || p.startsWith('/teacher/assignments'),
  },
  {
    key: 'tests',
    label: 'Testlar',
    icon: '📝',
    path: '/teacher/tests',
    match: (p) => p.startsWith('/teacher/tests'),
  },
  {
    key: 'questions',
    label: 'Savollar',
    icon: '❓',
    path: '/teacher/questions',
    match: (p) => p.startsWith('/teacher/questions'),
  },
];

export function TeacherNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { haptic } = useTelegram();

  const handleNavigate = (item: NavItem) => {
    haptic('light');
    if (item.key === 'groups') {
      // Groups modal ochish uchun event
      navigate('/teacher', { state: { openGroups: true } });
    } else {
      navigate(item.path);
    }
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-surface/85 backdrop-blur-xl border-t border-white/5"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="max-w-4xl mx-auto grid grid-cols-5">
        {NAV_ITEMS.map((item) => {
          const isActive = item.match(location.pathname);
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => handleNavigate(item)}
              className={`relative flex flex-col items-center justify-center gap-0.5 py-2.5 min-h-[56px] transition-colors ${
                isActive ? 'text-gold' : 'text-ink-muted'
              }`}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gold rounded-full" />
              )}
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="text-[10px] font-semibold leading-none mt-0.5">
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