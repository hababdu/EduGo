// src/pages/student/ProfilePage.tsx
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api-client';
import { useTelegram } from '../../hooks/useTelegram';

interface ProfileData {
  id: string;
  firstName: string;
  lastName?: string;
  username?: string;
  phone?: string;
  totalScore: number;
  level: number;
  xp: number;
  rank: number;
  streak: {
    currentStreak: number;
    longestStreak: number;
  } | null;
  _count?: {
    testAttempts?: number;
    achievements?: number;
  };
}

function useProfile() {
  return useQuery({
    queryKey: ['student', 'profile'],
    queryFn: () => apiFetch<ProfileData>('/api/v1/students/me'),
    staleTime: 60_000,
  });
}

export function ProfilePage() {
  const navigate = useNavigate();
  const { haptic, user: tgUser } = useTelegram();
  const { data, isLoading, error } = useProfile();

  if (isLoading) {
    return (
      <div className="p-4 max-w-2xl mx-auto space-y-4 pb-24">
        <div className="h-40 bg-surface/30 rounded-3xl animate-pulse" />
        <div className="h-32 bg-surface/20 rounded-3xl animate-pulse border border-white/5" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 max-w-2xl mx-auto pb-24">
        <div className="text-center py-14 bg-surface/20 rounded-3xl border border-white/5">
          <p className="text-sm font-semibold text-ink">Xatolik</p>
          <p className="text-xs text-ink-muted mt-2">
            {(error as any)?.message || "Server bilan bog'lanishda muammo"}
          </p>
        </div>
      </div>
    );
  }

  const fullName =
    `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Talaba';
  const initial = fullName[0]?.toUpperCase() || 'T';

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-5 pb-24">
      {/* Profile card */}
      <div className="bg-surface/20 p-5 rounded-3xl border border-white/5 space-y-4 backdrop-blur-md">
        <div className="flex items-center gap-4">
          {tgUser?.photo_url ? (
            <img
              src={tgUser.photo_url}
              alt=""
              className="w-16 h-16 rounded-3xl object-cover shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-3xl bg-gold/10 text-gold flex items-center justify-center font-display text-2xl shrink-0">
              {initial}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-display text-xl text-ink truncate">
              {fullName}
            </h1>
            <p className="text-xs text-ink-muted truncate">
              {data.username ? `@${data.username}` : 'Telegram foydalanuvchi'}
            </p>
          </div>
        </div>

        {/* Level bar */}
        <div className="pt-4 border-t border-white/5">
          <div className="flex items-center justify-between text-xs text-ink-muted mb-1.5">
            <span className="text-gold font-semibold">
              {data.level}-daraja
            </span>
            <span>{data.xp} XP</span>
          </div>
          <div className="h-2 rounded-full bg-surface overflow-hidden">
            <div
              className="h-full rounded-full bg-gold transition-all duration-700"
              style={{ width: `${Math.min(100, data.xp % 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface/20 p-4 rounded-3xl border border-white/5">
          <span className="text-[10px] text-ink-muted uppercase tracking-wider block">
            Umumiy ball
          </span>
          <p className="text-2xl font-display text-gold mt-1 tabular-nums">
            {data.totalScore.toLocaleString('uz-UZ')}
          </p>
        </div>
        <div className="bg-surface/20 p-4 rounded-3xl border border-white/5">
          <span className="text-[10px] text-ink-muted uppercase tracking-wider block">
            Reyting
          </span>
          <p className="text-2xl font-display text-teal mt-1 tabular-nums">
            #{data.rank}
          </p>
        </div>
        <div className="bg-surface/20 p-4 rounded-3xl border border-white/5">
          <span className="text-[10px] text-ink-muted uppercase tracking-wider block">
            🔥 Streak
          </span>
          <p className="text-2xl font-display text-coral mt-1 tabular-nums">
            {data.streak?.currentStreak ?? 0}
            <span className="text-ink-muted text-base"> kun</span>
          </p>
        </div>
        <div className="bg-surface/20 p-4 rounded-3xl border border-white/5">
          <span className="text-[10px] text-ink-muted uppercase tracking-wider block">
            Testlar
          </span>
          <p className="text-2xl font-display text-ink mt-1 tabular-nums">
            {data._count?.testAttempts ?? 0}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-surface/20 rounded-3xl border border-white/5 divide-y divide-white/5 overflow-hidden">
        <button
          type="button"
          onClick={() => {
            haptic('light');
            navigate('/notifications');
          }}
          className="w-full text-left p-4 hover:bg-white/[0.02] transition-colors flex items-center justify-between"
        >
          <span className="text-sm text-ink">🔔 Bildirishnomalar</span>
          <span className="text-ink-muted text-xs">›</span>
        </button>
        <button
          type="button"
          onClick={() => {
            haptic('light');
            navigate('/ranking');
          }}
          className="w-full text-left p-4 hover:bg-white/[0.02] transition-colors flex items-center justify-between"
        >
          <span className="text-sm text-ink">🏆 Reyting</span>
          <span className="text-ink-muted text-xs">›</span>
        </button>
        <button
          type="button"
          onClick={() => {
            haptic('light');
            const tg = (window as any).Telegram?.WebApp;
            if (tg?.close) tg.close();
          }}
          className="w-full text-left p-4 hover:bg-white/[0.02] transition-colors flex items-center justify-between"
        >
          <span className="text-sm text-red-400">🚪 Yopish</span>
          <span className="text-ink-muted text-xs">›</span>
        </button>
      </div>
    </div>
  );
}

export default ProfilePage;