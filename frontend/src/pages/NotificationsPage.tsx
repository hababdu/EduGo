import { useNavigate } from 'react-router-dom';
import { useNotifications, useMarkNotificationRead } from '../hooks/useNotifications';

const TYPE_ICONS: Record<string, string> = {
  TEST_ASSIGNED: '📝',
  TEST_RESULT: '🎉',
  RANKING_CHANGE: '🏆',
  DEADLINE_REMINDER: '⏰',
  NEW_LESSON: '📚',
  ANNOUNCEMENT: '📢',
  SYSTEM: 'ℹ️',
};

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'hozirgina';
  if (mins < 60) return `${mins} daq oldin`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} soat oldin`;
  return `${Math.floor(hours / 24)} kun oldin`;
}

export function NotificationsPage() {
  const { data: notifications, isLoading } = useNotifications();
  const markAsRead = useMarkNotificationRead();
  const navigate = useNavigate();

  return (
    <div className="pb-24 px-5 pt-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-ink-muted" aria-label="Orqaga">
          ←
        </button>
        <h1 className="font-display text-2xl">Bildirishnomalar</h1>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-surface rounded-lg animate-pulse" />
          ))}
        </div>
      ) : !notifications || notifications.length === 0 ? (
        <p className="text-sm text-ink-muted text-center py-16">
          Hozircha bildirishnomalar yo'q.
        </p>
      ) : (
        <div className="divide-y divide-white/5">
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => !n.isRead && markAsRead.mutate(n.id)}
              className="w-full text-left flex gap-3 py-3.5"
            >
              <span className="text-xl shrink-0" aria-hidden="true">
                {TYPE_ICONS[n.type] ?? '🔔'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm ${n.isRead ? 'text-ink-muted' : 'font-medium'}`}>
                    {n.title}
                  </p>
                  {!n.isRead && (
                    <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" aria-hidden="true" />
                  )}
                </div>
                <p className="text-xs text-ink-muted mt-0.5 line-clamp-2">{n.body}</p>
                <p className="text-[11px] text-ink-faint mt-1">{timeAgo(n.createdAt)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
