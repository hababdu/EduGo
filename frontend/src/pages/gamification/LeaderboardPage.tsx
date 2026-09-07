import React from 'react';
import { useLeaderboard } from '../../hooks/useGamification';

export const LeaderboardPage: React.FC = () => {
  const { data: leaderboard = [], isLoading, error } = useLeaderboard();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-400 bg-slate-900 min-h-screen">
        Reyting ma'lumotlarini yuklashda xatolik yuz berdi.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            🏆 Yetakchilar Safi (Leaderboard)
          </h1>
          <p className="text-sm text-slate-400">Eng ko'p ball to'plagan faol talabalar</p>
        </div>
      </div>

      <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden">
        <div className="divide-y divide-slate-700/60">
          {leaderboard.map((user, index) => {
            const rank = index + 1;
            let rankBadge = <span className="font-bold text-slate-400">#{rank}</span>;

            if (rank === 1) rankBadge = <span className="text-xl">🥇</span>;
            if (rank === 2) rankBadge = <span className="text-xl">🥈</span>;
            if (rank === 3) rankBadge = <span className="text-xl">🥉</span>;

            return (
              <div
                key={user.id}
                className={`p-4 flex items-center justify-between transition-colors ${
                  rank <= 3 ? 'bg-slate-800/90' : 'hover:bg-slate-700/30'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 text-center">{rankBadge}</div>

                  <div className="w-10 h-10 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center font-bold text-indigo-300">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.firstName} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      user.firstName.charAt(0).toUpperCase()
                    )}
                  </div>

                  <div>
                    <h3 className="font-semibold text-white">
                      {user.firstName} {user.lastName || ''}
                    </h3>
                    <span className="text-xs text-indigo-400 font-medium">
                      {user.level}-daraja (Level)
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-lg font-bold text-emerald-400">
                    {user.totalScore.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-400 block">ball</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};