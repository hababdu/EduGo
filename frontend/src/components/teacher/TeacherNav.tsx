
// src/components/navigation/TeacherNav.tsx
import { useLocation, useNavigate } from 'react-router-dom';
import { useTelegram } from '../../hooks/useTelegram';

/* ============================================================
   TYPES
   ============================================================ */

type IconProps = {
  size?: number;
  active?: boolean;
};

interface NavItem {
  key: string;
  label: string;
  path: string;
  match: (pathname: string) => boolean;
  Icon: React.ComponentType<IconProps>;
}

/* ============================================================
   CUSTOM SVG ICONS
   ============================================================ */

function HomeIcon({ size = 23, active = false }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M3.5 10.7L12 3.8L20.5 10.7V19.2C20.5 19.75 20.05 20.2 19.5 20.2H4.5C3.95 20.2 3.5 19.75 3.5 19.2V10.7Z"
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M9 20.2V14.2C9 13.65 9.45 13.2 10 13.2H14C14.55 13.2 15 13.65 15 14.2V20.2"
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {active && (
        <circle
          cx="18"
          cy="7"
          r="1.2"
          fill="currentColor"
        />
      )}
    </svg>
  );
}

function GroupsIcon({ size = 23, active = false }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Main person */}
      <circle
        cx="12"
        cy="8"
        r="3"
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.7}
      />

      <path
        d="M6.5 20C6.5 16.75 8.95 14.5 12 14.5C15.05 14.5 17.5 16.75 17.5 20"
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.7}
        strokeLinecap="round"
      />

      {/* Left person */}
      <path
        d="M7.2 6.1C6.75 5.7 6.15 5.5 5.5 5.5C3.85 5.5 2.5 6.85 2.5 8.5C2.5 9.85 3.4 10.95 4.65 11.35"
        stroke="currentColor"
        strokeWidth={active ? 1.8 : 1.5}
        strokeLinecap="round"
      />

      {/* Right person */}
      <path
        d="M16.8 6.1C17.25 5.7 17.85 5.5 18.5 5.5C20.15 5.5 21.5 6.85 21.5 8.5C21.5 9.85 20.6 10.95 19.35 11.35"
        stroke="currentColor"
        strokeWidth={active ? 1.8 : 1.5}
        strokeLinecap="round"
      />

      {active && (
        <circle
          cx="19"
          cy="18"
          r="1.2"
          fill="currentColor"
        />
      )}
    </svg>
  );
}

function MaterialsIcon({ size = 23, active = false }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Book */}
      <path
        d="M4 5.5C4 4.67 4.67 4 5.5 4H10.5C11.33 4 12 4.67 12 5.5V19.5C12 18.67 11.33 18 10.5 18H5.5C4.67 18 4 18.67 4 19.5V5.5Z"
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.7}
        strokeLinejoin="round"
      />

      <path
        d="M20 5.5C20 4.67 19.33 4 18.5 4H13.5C12.67 4 12 4.67 12 5.5V19.5C12 18.67 12.67 18 13.5 18H18.5C19.33 18 20 18.67 20 19.5V5.5Z"
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.7}
        strokeLinejoin="round"
      />

      {/* Lines */}
      <path
        d="M6.8 8H9.5M6.8 11H9.5M14.5 8H17.2M14.5 11H17.2"
        stroke="currentColor"
        strokeWidth={active ? 1.7 : 1.4}
        strokeLinecap="round"
      />

      {active && (
        <path
          d="M8 15.2H16"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

function TestsIcon({ size = 23, active = false }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Document */}
      <path
        d="M7 3.5H14.2L19 8.3V19.2C19 20 18.35 20.5 17.5 20.5H7C6.15 20.5 5.5 19.85 5.5 19V5C5.5 4.15 6.15 3.5 7 3.5Z"
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.7}
        strokeLinejoin="round"
      />

      {/* Fold */}
      <path
        d="M14 3.8V8.5H18.7"
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.7}
        strokeLinejoin="round"
      />

      {/* Check */}
      <path
        d="M8.3 13.2L10.3 15.2L15.8 9.9"
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {active && (
        <circle
          cx="18"
          cy="17.8"
          r="1"
          fill="currentColor"
        />
      )}
    </svg>
  );
}

function QuestionsIcon({ size = 23, active = false }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Message */}
      <path
        d="M4 5.5C4 4.67 4.67 4 5.5 4H18.5C19.33 4 20 4.67 20 5.5V14C20 14.83 19.33 15.5 18.5 15.5H11L7 19V15.5H5.5C4.67 15.5 4 14.83 4 14V5.5Z"
        stroke="currentColor"
        strokeWidth={active ? 2 : 1.7}
        strokeLinejoin="round"
      />

      {/* Dots */}
      <circle
        cx="8"
        cy="9.8"
        r="1"
        fill="currentColor"
      />

      <circle
        cx="12"
        cy="9.8"
        r="1"
        fill="currentColor"
      />

      <circle
        cx="16"
        cy="9.8"
        r="1"
        fill="currentColor"
      />

      {active && (
        <path
          d="M17.5 18.2L19 19.7L21.2 17.5"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

/* ============================================================
   NAV ITEMS
   ============================================================ */

const NAV_ITEMS: NavItem[] = [
  {
    key: 'overview',
    label: 'Asosiy',
    Icon: HomeIcon,
    path: '/teacher',
    match: (p) => p === '/teacher' || p === '/teacher/',
  },

  {
    key: 'groups',
    label: 'Guruhlar',
    Icon: GroupsIcon,
    path: '/teacher/groups',
    match: (p) => p.startsWith('/teacher/groups'),
  },

  {
    key: 'materials',
    label: 'Materiallar',
    Icon: MaterialsIcon,
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
    Icon: TestsIcon,
    path: '/teacher/tests',
    match: (p) => p.startsWith('/teacher/tests'),
  },

  {
    key: 'questions',
    label: 'Savollar',
    Icon: QuestionsIcon,
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
      className="
        fixed
        bottom-0
        left-0
        right-0
        z-40
        bg-surface/90
        backdrop-blur-xl
        border-t
        border-white/5
      "
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      aria-label="Asosiy navigatsiya"
    >
      <div className="max-w-4xl mx-auto grid grid-cols-5">
        {NAV_ITEMS.map((item) => {
          const isActive = item.match(location.pathname);
          const Icon = item.Icon;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => handleNavigate(item)}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              className={`
                relative
                flex
                flex-col
                items-center
                justify-center
                gap-1
                py-2.5
                min-h-[56px]
                transition-all
                duration-200
                active:scale-95
                ${
                  isActive
                    ? 'text-gold'
                    : 'text-ink-muted hover:text-ink'
                }
              `}
            >
              {/* Active indicator */}
              {isActive && (
                <span
                  className="
                    absolute
                    top-0
                    left-1/2
                    -translate-x-1/2
                    w-8
                    h-0.5
                    bg-gold
                    rounded-full
                    shadow-[0_0_10px_rgba(212,175,55,0.45)]
                  "
                  aria-hidden="true"
                />
              )}

              {/* Icon */}
              <span
                className={`
                  flex
                  items-center
                  justify-center
                  transition-all
                  duration-200
                  ${
                    isActive
                      ? 'scale-110 -translate-y-0.5'
                      : 'scale-100'
                  }
                `}
              >
                <Icon
                  size={23}
                  active={isActive}
                />
              </span>

              {/* Label */}
              <span
                className={`
                  text-[10px]
                  font-semibold
                  leading-none
                  tracking-[-0.01em]
                  transition-colors
                  duration-200
                  ${
                    isActive
                      ? 'text-gold'
                      : 'text-ink-muted'
                  }
                `}
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
