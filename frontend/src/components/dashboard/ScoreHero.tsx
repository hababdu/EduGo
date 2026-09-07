import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';

interface ScoreHeroProps {
  firstName: string;
  totalScore: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
}

/**
 * Bu sahifaning "hero"si — karta ichiga o'ralmagan, orqa fonda
 * yumshoq oltin nurlanish (radial glow) bilan ajratilgan.
 * Fraunces serifi bilan yozilgan raqam butun sahifadagi
 * yagona "dadil" element — qolgan hammasi tinch.
 */
export function ScoreHero({
  firstName,
  totalScore,
  level,
  xpIntoLevel,
  xpForNextLevel,
}: ScoreHeroProps) {
  const progressPercent = Math.min(100, Math.round((xpIntoLevel / xpForNextLevel) * 100));
  const navigate = useNavigate();
  const { data: notifications } = useNotifications();
  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  return (
    <section className="relative px-5 pt-6 pb-8 text-center overflow-hidden">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 -z-10"
        style={{
          background:
            'radial-gradient(circle at 50% 0%, rgba(255,176,32,0.16), transparent 70%)',
        }}
      />

      <button
        onClick={() => navigate('/notifications')}
        className="absolute top-5 right-5 text-lg"
        aria-label="Bildirishnomalar"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-coral text-[10px] flex items-center justify-center text-ink">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <p className="text-sm text-ink-muted">Salom, {firstName}</p>

      <p className="mt-3 font-display text-7xl leading-none text-gold tabular-nums">
        {totalScore.toLocaleString('uz-UZ')}
      </p>
      <p className="mt-1 text-sm text-ink-muted">umumiy ball</p>

      <div className="mt-6 mx-auto max-w-[220px]">
        <div className="flex items-center justify-between text-xs text-ink-muted mb-1.5">
          <span>{level}-daraja</span>
          <span>
            {xpIntoLevel}/{xpForNextLevel} XP
          </span>
        </div>
        <div className="h-2 rounded-full bg-surfaceRaised overflow-hidden">
          <div
            className="h-full rounded-full bg-teal transition-all duration-700"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </section>
  );
}
