// src/pages/teacher/TeacherOverview.tsx
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api-client';
import { useTelegram } from '../../hooks/useTelegram';

/* ============================================================
   TYPES
   ============================================================ */
interface OverviewData {
  groupsCount: number;
  studentsCount: number;
  assignedTestsCount: number;
  assignmentsCount: number;
  totalAttempts: number;
  averageScore: number;
  groups: { id: string; name: string; studentsCount: number }[];
  recentAssignments: {
    id: string;
    testId: string;
    testTitle: string;
    groupId?: string;
    groupName: string;
    assignedAt: string;
  }[];
  charts: {
    dailyActivity: { date: string; count: number; avgPercent: number }[];
  };
  topStudents: {
    id: string;
    firstName: string;
    lastName: string;
    username?: string;
    totalScore: number;
    level: number;
  }[];
}

/* ============================================================
   HOOK
   ============================================================ */
function useTeacherOverview() {
  return useQuery({
    queryKey: ['teacher', 'overview'],
    queryFn: () => apiFetch<OverviewData>('/api/v1/teacher/overview'),
    staleTime: 30_000,
  });
}

/* ============================================================
   COMPONENT
   ============================================================ */
export function TeacherOverview() {
  const { data, isLoading, error } = useTeacherOverview();
  const navigate = useNavigate();
  const { haptic, user } = useTelegram();

  const [searchQuery, setSearchQuery] = useState('');
  const [isGroupsModalOpen, setIsGroupsModalOpen] = useState(false);

  const filteredGroups = useMemo(() => {
    if (!data?.groups) return [];
    const q = searchQuery.trim().toLowerCase();
    return data.groups.filter((g) => !q || g.name.toLowerCase().includes(q));
  }, [data?.groups, searchQuery]);

  /* ---------- Loading ---------- */
  if (isLoading) {
    return (
      <div className="p-4 max-w-5xl mx-auto space-y-5 pb-32">
        <div className="h-12 w-64 bg-surface/30 animate-pulse rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-24 bg-surface/20 rounded-3xl animate-pulse border border-white/5"
            />
          ))}
        </div>
        <div className="h-64 bg-surface/20 rounded-3xl animate-pulse border border-white/5" />
      </div>
    );
  }

  /* ---------- Error ---------- */
  if (error) {
    return (
      <div className="p-4 max-w-5xl mx-auto pb-32">
        <div className="text-center py-14 bg-surface/20 rounded-3xl border border-white/5 space-y-3">
          <p className="text-sm font-semibold text-ink">
            Ma'lumotlarni yuklashda xatolik
          </p>
          <p className="text-xs text-ink-muted">
            {(error as any)?.response?.data?.message ||
              (error as any)?.message ||
              "Server bilan bog'lanishda muammo"}
          </p>
          <button
            type="button"
            onClick={() => {
              haptic('light');
              window.location.reload();
            }}
            className="mt-2 text-xs font-semibold text-gold bg-gold/10 px-4 py-2.5 rounded-2xl active:scale-[0.98] transition-transform"
          >
            🔄 Qayta yuklash
          </button>
        </div>
      </div>
    );
  }

  /* ---------- Bo'sh holat ---------- */
  if (!data) {
    return (
      <div className="p-4 max-w-5xl mx-auto pb-32">
        <div className="text-center py-14 bg-surface/20 rounded-3xl border border-white/5">
          <p className="text-xs text-ink-muted">Ma'lumot topilmadi</p>
        </div>
      </div>
    );
  }

  /* ---------- Handlers ---------- */
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
      {/* ============ HEADER ============ */}
      <div>
        <h1 className="font-display text-xl sm:text-2xl text-ink">
          {user?.first_name
            ? `Salom, ${user.first_name}`
            : 'Mening ish maydonim'}
        </h1>
        <p className="text-xs text-ink-muted mt-1">
          O'qituvchi boshqaruv paneli
        </p>
      </div>

      {/* ============ STATS CARDS ============ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Groups — clickable */}
        <button
          type="button"
          onClick={openGroups}
          className="relative bg-surface/20 p-4 rounded-3xl border border-white/5 active:scale-[0.98] transition-transform text-left overflow-hidden group min-h-[100px]"
        >
          <span className="text-[11px] text-ink-muted font-medium">
            Guruhlar
          </span>
          <div className="font-display text-2xl text-gold tabular-nums mt-2">
            {data.groupsCount}
          </div>
          <div className="absolute right-2 bottom-1 text-white/5 font-display text-4xl pointer-events-none">
            📁
          </div>
        </button>

        {/* Students */}
        <div className="relative bg-surface/20 p-4 rounded-3xl border border-white/5 overflow-hidden min-h-[100px]">
          <span className="text-[11px] text-ink-muted font-medium">
            Talabalar
          </span>
          <div className="font-display text-2xl text-gold tabular-nums mt-2">
            {data.studentsCount}
          </div>
          <div className="absolute right-2 bottom-1 text-white/5 font-display text-4xl pointer-events-none">
            👥
          </div>
        </div>

        {/* Tests */}
        <div className="relative bg-surface/20 p-4 rounded-3xl border border-white/5 overflow-hidden min-h-[100px]">
          <span className="text-[11px] text-ink-muted font-medium">
            Testlar
          </span>
          <div className="font-display text-2xl text-gold tabular-nums mt-2">
            {data.assignedTestsCount}
          </div>
          <div className="absolute right-2 bottom-1 text-white/5 font-display text-4xl pointer-events-none">
            📝
          </div>
        </div>

        {/* Avg score */}
        <div className="relative bg-surface/20 p-4 rounded-3xl border border-white/5 overflow-hidden min-h-[100px]">
          <span className="text-[11px] text-ink-muted font-medium">
            O'rtacha ball
          </span>
          <div className="font-display text-2xl text-teal tabular-nums mt-2">
            {data.averageScore}%
          </div>
          <div className="absolute right-2 bottom-1 text-white/5 font-display text-4xl pointer-events-none">
            📊
          </div>
        </div>
      </div>

      {/* ============ CHART ============ */}
      <section className="bg-surface/20 p-5 rounded-3xl border border-white/5 space-y-4 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-ink">
              Oxirgi 7 kunlik faollik
            </h2>
            <p className="text-[11px] text-ink-muted">
              Talabalar topshirgan testlar
            </p>
          </div>
          <span className="text-[10px] text-ink-muted bg-surface/40 px-2 py-1 rounded-lg">
            Jami: {data.totalAttempts} ta
          </span>
        </div>

        <DailyChart data={data.charts.dailyActivity} />
      </section>

      {/* ============ TOP STUDENTS ============ */}
      {data.topStudents.length > 0 && (
        <section className="bg-surface/20 p-5 rounded-3xl border border-white/5 space-y-4 backdrop-blur-md">
          <div>
            <h2 className="text-sm font-semibold text-ink">
              🏆 Eng yaxshi talabalar
            </h2>
            <p className="text-[11px] text-ink-muted">Ball bo'yicha top 5</p>
          </div>

          <div className="space-y-2">
            {data.topStudents.map((s, i) => (
              <div
                key={s.id}
                className="flex items-center gap-3 p-3 bg-surface/30 rounded-2xl"
              >
                <span className="text-lg w-7 text-center">
                  {['🥇', '🥈', '🥉'][i] ?? i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">
                    {s.firstName} {s.lastName}
                  </p>
                  {s.username && (
                    <p className="text-[11px] text-ink-muted truncate">
                      @{s.username}
                    </p>
                  )}
                </div>
                <span className="text-sm font-semibold text-gold tabular-nums shrink-0">
                  {s.totalScore}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ============ RECENT ASSIGNMENTS ============ */}
      <section className="bg-surface/20 p-5 rounded-3xl border border-white/5 space-y-4 backdrop-blur-md">
        <div>
          <h2 className="text-sm font-semibold text-ink">
            So'nggi biriktirilgan testlar
          </h2>
          <p className="text-[11px] text-ink-muted">
            Guruhlarga berilgan oxirgi vazifalar
          </p>
        </div>

        {data.recentAssignments.length === 0 ? (
          <div className="text-center py-8 bg-surface/30 rounded-2xl border border-white/5">
            <p className="text-xs text-ink-muted">
              Hali test biriktirilmagan.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.recentAssignments.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  haptic('light');
                  navigate(`/teacher/tests/${a.testId}`);
                }}
                className="w-full text-left p-3.5 bg-surface/30 hover:bg-white/[0.05] rounded-2xl flex items-center justify-between gap-3 active:scale-[0.99] transition-all"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium text-ink truncate">
                    {a.testTitle}
                  </p>
                  <p className="text-[11px] text-ink-muted truncate">
                    Guruh: <span className="text-ink">{a.groupName}</span>
                  </p>
                </div>
                <span className="text-[10px] text-gold bg-gold/10 px-2.5 py-1 rounded-lg font-semibold shrink-0">
                  Faol
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ============ GROUPS MODAL ============ */}
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
                  <p className="text-xs text-ink-muted">Guruh topilmadi</p>
                </div>
              ) : (
                filteredGroups.map((g) => (
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

/* ============================================================
   DAILY CHART — SVG-based, kutubxonasiz
   ============================================================ */
function DailyChart({
  data,
}: {
  data: { date: string; count: number; avgPercent: number }[];
}) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-xs text-ink-muted">
        Ma'lumot yo'q
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const width = 320;
  const height = 120;
  const padding = { top: 10, bottom: 20, left: 8, right: 8 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const points = data.map((d, i) => {
    const x =
      data.length === 1
        ? padding.left + chartWidth / 2
        : padding.left + (i / (data.length - 1)) * chartWidth;
    const y =
      padding.top + chartHeight - (d.count / maxCount) * chartHeight;
    return { x, y, ...d };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${
    padding.top + chartHeight
  } L ${points[0].x} ${padding.top + chartHeight} Z`;

  return (
    <div className="w-full overflow-x-auto -mx-1 px-1">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full min-w-[320px] h-32"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="rgb(212, 175, 55)"
              stopOpacity="0.3"
            />
            <stop
              offset="100%"
              stopColor="rgb(212, 175, 55)"
              stopOpacity="0"
            />
          </linearGradient>
        </defs>

        <path d={areaD} fill="url(#chartGradient)" />

        <path
          d={pathD}
          fill="none"
          stroke="rgb(212, 175, 55)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="3"
            fill="rgb(212, 175, 55)"
          />
        ))}

        {points.map((p, i) => {
          const day = new Date(p.date).toLocaleDateString('uz-UZ', {
            day: 'numeric',
            month: 'numeric',
          });
          return (
            <text
              key={i}
              x={p.x}
              y={height - 4}
              textAnchor="middle"
              className="fill-ink-muted"
              style={{ fontSize: '8px' }}
            >
              {day}
            </text>
          );
        })}
      </svg>

      <div className="flex justify-between text-[10px] text-ink-muted mt-1">
        <span>Faol talabalar / kun</span>
        <span>Maks: {maxCount}</span>
      </div>
    </div>
  );
}

export default TeacherOverview;