import { useLiveRanking } from '../../hooks/useLiveRanking';
import { useAuthStore } from '../../store/auth.store';

const MEDALS = ['🥇', '🥈', '🥉'];

export function RankingPage() {
  const { top, yourRank, isLoading, isLive } = useLiveRanking();
  const currentUserId = useAuthStore((s) => s.user?.id);

  return (
    <div className="pb-24 px-5 pt-6">
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-display text-2xl">Reyting</h1>
        <span
          className={`flex items-center gap-1.5 text-xs ${isLive ? 'text-teal' : 'text-ink-faint'}`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-teal' : 'bg-ink-faint'}`}
            aria-hidden="true"
          />
          {isLive ? 'Jonli' : 'Ulanmoqda...'}
        </span>
      </div>

      {yourRank !== null && (
        <p className="text-sm text-ink-muted mb-6">
          Sizning o'rningiz: <span className="text-gold font-semibold">#{yourRank}</span>
        </p>
      )}

      {isLoading ? (
        <div className="space-y-2 mt-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-14 bg-surface rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="divide-y divide-white/5">
          {top.map((entry) => {
            const isSelf = entry.studentId === currentUserId;
            return (
              <div
                key={entry.studentId}
                className={`flex items-center gap-3 py-3 ${isSelf ? 'bg-gold-soft -mx-2 px-2 rounded-lg' : ''}`}
              >
                <span className="w-7 text-center text-sm text-ink-muted">
                  {MEDALS[entry.rank - 1] ?? entry.rank}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {entry.firstName}
                    {isSelf && <span className="text-xs text-gold ml-1.5">(siz)</span>}
                  </p>
                  {entry.username && <p className="text-xs text-ink-muted">@{entry.username}</p>}
                </div>
                <span className="text-sm font-semibold tabular-nums">{entry.totalScore}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
