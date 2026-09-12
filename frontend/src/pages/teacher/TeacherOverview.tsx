import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeacherOverview } from '../../hooks/useTeacher';
import { useTelegram } from '../../hooks/useTelegram';

export function TeacherOverview() {
  const { data, isLoading } = useTeacherOverview();
  const navigate = useNavigate();
  const { haptic, user } = useTelegram();

  const [searchQuery, setSearchQuery] = useState('');
  const [isGroupsModalOpen, setIsGroupsModalOpen] = useState(false);

  const filteredGroups = useMemo(() => {
    if (!data?.groups) return [];
    const q = searchQuery.trim().toLowerCase();
    return data.groups.filter(
      (g: any) => !q || g.name.toLowerCase().includes(q)
    );
  }, [data?.groups, searchQuery]);

  if (isLoading || !data) {
    return (
      <div className="p-4 max-w-5xl mx-auto space-y-5">
        <div className="h-12 w-64 bg-surface/30 animate-pulse rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-32 bg-surface/20 rounded-3xl animate-pulse border border-white/5"
            />
          ))}
        </div>
      </div>
    );
  }

  const openGroups = () => {
    haptic('light');
    setIsGroupsModalOpen(true);
  };

  const closeGroups = () => {
    haptic('light');
    setIsGroupsModalOpen(false);
    setSearchQuery('');
  };

  const goToGroup = (id: string) => {
    haptic('light');
    setIsGroupsModalOpen(false);
    navigate(`/teacher/groups/${id}`);
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6 pb-32">
      {/* Header */}
      <div>
        <h1 className="font-display text-xl sm:text-2xl text-ink">
          {user?.first_name ? `Salom, ${user.first_name}` : 'Mening ish maydonim'}
        </h1>
        <p className="text-xs text-ink-muted mt-1">
          O'qituvchi boshqaruv paneli
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Groups card — clickable */}
        <button
          type="button"
          onClick={openGroups}
          className="relative bg-surface/20 p-5 rounded-3xl border border-white/5 active:scale-[0.98] transition-transform text-left overflow-hidden group min-h-[120px]"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-muted font-medium group-active:text-gold transition-colors">
              Faol guruhlar
            </span>
            <span className="text-xs text-gold opacity-0 group-hover:opacity-100 transition-opacity">
              Ko'rish →
            </span>
          </div>
          <div className="font-display text-3xl text-gold tabular-nums mt-2">
            {data.groupsCount}
          </div>
          <div className="absolute right-3 bottom-2 text-white/5 font-display text-5xl pointer-events-none">
            📁
          </div>
        </button>

        {/* Students card */}
        <div className="relative bg-surface/20 p-5 rounded-3xl border border-white/5 overflow-hidden min-h-[120px]">
          <span className="text-xs text-ink-muted font-medium">
            Jami talabalar
          </span>
          <div className="font-display text-3xl text-gold tabular-nums mt-2">
            {data.studentsCount}
          </div>
          <div className="absolute right-3 bottom-2 text-white/5 font-display text-5xl pointer-events-none">
            👥
          </div>
        </div>

        {/* Tests card */}
        <div className="relative bg-surface/20 p-5 rounded-3xl border border-white/5 overflow-hidden min-h-[120px]">
          <span className="text-xs text-ink-muted font-medium">
            Biriktirilgan testlar
          </span>
          <div className="font-display text-3xl text-gold tabular-nums mt-2">
            {data.assignedTestsCount}
          </div>
          <div className="absolute right-3 bottom-2 text-white/5 font-display text-5xl pointer-events-none">
            📝
          </div>
        </div>
      </div>

      {/* Recent assignments */}
      <section className="bg-surface/20 p-5 rounded-3xl border border-white/5 space-y-4 backdrop-blur-md">
        <div>
          <h2 className="text-sm font-semibold text-ink">
            So'nggi biriktirilgan testlar
          </h2>
          <p className="text-xs text-ink-muted">
            Guruhlarga berilgan oxirgi vazifalar
          </p>
        </div>

        {data.recentAssignments.length === 0 ? (
          <div className="text-center py-8 bg-surface/30 rounded-2xl border border-white/5">
            <p className="text-xs text-ink-muted">Hali test biriktirilmagan.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.recentAssignments.map((a: any) => (
              <div
                key={a.id}
                className="p-3.5 bg-surface/30 rounded-2xl flex items-center justify-between gap-3"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium text-ink truncate">
                    {a.testTitle}
                  </p>
                  <p className="text-xs text-ink-muted truncate">
                    Guruh: <span className="text-ink">{a.groupName}</span>
                  </p>
                </div>
                <span className="text-[10px] text-gold bg-gold/10 px-2.5 py-1 rounded-lg font-semibold shrink-0">
                  Faol
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Groups modal */}
      {isGroupsModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-50"
          onClick={closeGroups}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-surface border border-white/10 rounded-3xl p-5 w-full max-w-2xl space-y-4 shadow-2xl max-h-[85vh] flex flex-col"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-ink">
                  Mening guruhlarim
                </h3>
                <p className="text-xs text-ink-muted">
                  O'tish uchun guruhni tanlang
                </p>
              </div>
              <button
                type="button"
                onClick={closeGroups}
                className="text-ink-muted hover:text-ink text-sm p-2 rounded-xl bg-white/5 min-h-[40px]"
              >
                ✕
              </button>
            </div>

            <input
              type="text"
              placeholder="🔍 Guruhni qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 text-sm bg-surface/50 border border-white/5 rounded-2xl text-ink outline-none focus:border-gold/50 min-h-[44px]"
            />

            <div className="overflow-y-auto space-y-2 flex-1 -mx-1 px-1">
              {filteredGroups.length === 0 ? (
                <div className="text-center py-10 bg-surface/30 rounded-2xl border border-white/5">
                  <p className="text-xs text-ink-muted">
                    Guruh topilmadi
                  </p>
                </div>
              ) : (
                filteredGroups.map((g: any) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => goToGroup(g.id)}
                    className="w-full p-4 bg-surface/30 hover:bg-white/[0.05] border border-white/5 rounded-2xl transition-colors flex items-center justify-between gap-3 active:scale-[0.99] text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink truncate">
                        {g.name}
                      </p>
                      <p className="text-xs text-ink-muted">
                        {g.studentsCount} nafar talaba
                      </p>
                    </div>
                    <span className="text-xs px-2.5 py-1 bg-surface rounded-lg border border-white/5 text-ink-muted shrink-0">
                      Ochish →
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeacherOverview;