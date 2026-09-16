// src/components/student/ScoreHero.tsx
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '../../hooks/useTelegram';

interface ScoreHeroProps {
  firstName: string;
  totalScore: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  unreadCount?: number;
}

/**
 * Sahifaning "hero" qismi — karta ichiga o'ralmagan, orqa fonda
 * yumshoq oltin nurlanish (radial glow) bilan ajratilgan.
 * Fraunces serifi bilan yozilgan raqam — sahifadagi yagona "dadil" element.
 */
export function ScoreHero({
  firstName,
  totalScore,
  level,
  xpIntoLevel,
  xpForNextLevel,
  unreadCount = 0,
}: ScoreHeroProps) {
  const navigate = useNavigate();
  const { haptic } = useTelegram();

  const progressPercent = Math.min(
    100,
    Math.round((xpIntoLevel / Math.max(xpForNextLevel, 1)) * 100),
  );

  const handleNotifications = () => {
    haptic('light');
    navigate('/notifications');
  };

  return (
    <section className="relative px-5 pt-6 pb-8 text-center overflow-hidden">
      {/* Radial gold glow */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 -z-10"
        style={{
          background:
            'radial-gradient(circle at 50% 0%, rgba(255,176,32,0.16), transparent 70%)',
        }}
        aria-hidden="true"
      />

      {/* Notifications button */}
      <button
        type="button"
        onClick={handleNotifications}
        className="absolute top-5 right-5 text-lg w-10 h-10 flex items-center justify-center rounded-xl active:scale-[0.95] transition-transform"
        aria-label="Bildirishnomalar"
      >
        <span className="relative">
          🔔
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-coral text-[10px] font-semibold flex items-center justify-center text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </span>
      </button>

      {/* Greeting */}
      <p className="text-sm text-ink-muted">Salom, {firstName || 'Talaba'}</p>

      {/* Score */}
      <p className="mt-3 font-display text-7xl leading-none text-gold tabular-nums">
        {totalScore.toLocaleString('uz-UZ')}
      </p>
      <p className="mt-1 text-sm text-ink-muted">umumiy ball</p>

      {/* Level progress */}
      <div className="mt-6 mx-auto max-w-[220px]">
        <div className="flex items-center justify-between text-xs text-ink-muted mb-1.5">
          <span className="font-semibold">{level}-daraja</span>
          <span className="tabular-nums">
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

export default ScoreHero;