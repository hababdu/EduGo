// src/pages/teacher/TeacherOverview.tsx
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api-client';
import { useTelegram } from '../../hooks/useTelegram';
import {
  PageHeader,
  StatCard,
  Section,
  CardList,
  ListRow,
  EmptyState,
  Skeleton,
} from '../../components/ui';
import {
  Users,
  FileText,
  BarChart3,
  FolderOpen,
  Search,
  X,
  RotateCw,
} from '../../design/icons';
import { TEXT, CONTROL, ICON, PAGE_WIDE } from '../../design/tokens';

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

  const [groupsModal, setGroupsModal] = useState(false);

  if (isLoading) return <OverviewSkeleton />;

  if (error || !data) {
    return (
      <div className={PAGE_WIDE}>
        <CardList>
          <EmptyState
            icon={AlertTriangle}
            title="Ma'lumot yuklanmadi"
            subtitle={
              (error as any)?.response?.data?.message ||
              (error as any)?.message ||
              "Server bilan bog'lanishda muammo"
            }
            action={{
              label: 'Qayta yuklash',
              icon: RotateCw,
              onClick: () => window.location.reload(),
            }}
          />
        </CardList>
      </div>
    );
  }

  return (
    <div className={PAGE_WIDE}>
      {/* Header */}
      <PageHeader
        title={user?.first_name ? `Salom, ${user.first_name}` : 'Ish maydonim'}
        subtitle="O'qituvchi paneli"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Guruhlar"
          value={data.groupsCount}
          icon={FolderOpen}
          accent="gold"
          onClick={() => {
            haptic('light');
            setGroupsModal(true);
          }}
        />
        <StatCard label="Talabalar" value={data.studentsCount} icon={Users} accent="teal" />
        <StatCard label="Testlar" value={data.assignedTestsCount} icon={FileText} accent="gold" />
        <StatCard
          label="O'rtacha"
          value={`${data.averageScore}%`}
          icon={BarChart3}
          accent="teal"
        />
      </div>

      {/* Chart */}
      <Section title="Oxirgi 7 kun">
        <div className={`${'bg-surface/20 border border-white/5'} rounded-2xl p-4`}>
          <DailyChart data={data.charts.dailyActivity} total={data.totalAttempts} />
        </div>
      </Section>

      {/* Top students */}
      {data.topStudents.length > 0 && (
        <Section title="Eng yaxshi talabalar">
          <CardList>
            {data.topStudents.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3 p-3.5">
                <span
                  className={`text-sm font-display w-7 text-center tabular-nums ${
                    i === 0 ? 'text-gold' : 'text-ink-muted'
                  }`}
                >
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">
                    {s.firstName} {s.lastName}
                  </p>
                  {s.username && (
                    <p className="text-[11px] text-ink-muted truncate">@{s.username}</p>
                  )}
                </div>
                <span className="text-sm font-semibold text-gold tabular-nums shrink-0">
                  {s.totalScore}
                </span>
              </div>
            ))}
          </CardList>
        </Section>
      )}

      {/* Recent */}
      <Section
        title="So'nggi testlar"
        action={
          data.recentAssignments.length > 3 && (
            <button
              type="button"
              onClick={() => {
                haptic('light');
                navigate('/teacher/tests');
              }}
              className="text-[11px] text-gold font-medium"
            >
              Barchasi
            </button>
          )
        }
      >
        {data.recentAssignments.length === 0 ? (
          <CardList>
            <EmptyState icon={FileText} title="Hali test biriktirilmagan" />
          </CardList>
        ) : (
          <CardList>
            {data.recentAssignments.slice(0, 3).map((a) => (
              <ListRow
                key={a.id}
                title={a.testTitle}
                subtitle={a.groupName}
                onClick={() => {
                  haptic('light');
                  navigate(`/teacher/tests/${a.testId}`);
                }}
              />
            ))}
          </CardList>
        )}
      </Section>

      {/* Groups modal */}
      {groupsModal && (
        <GroupsModal
          groups={data.groups}
          onClose={() => {
            haptic('light');
            setGroupsModal(false);
          }}
          onSelect={(id) => {
            haptic('light');
            setGroupsModal(false);
            navigate(`/teacher/groups/${id}`);
          }}
        />
      )}
    </div>
  );
}

/* ============================================================
   GROUPS MODAL
   ============================================================ */
function GroupsModal({
  groups,
  onClose,
  onSelect,
}: {
  groups: { id: string; name: string; studentsCount: number }[];
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups.filter((g) => !q || g.name.toLowerCase().includes(q));
  }, [groups, query]);

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-white/10 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <div>
            <h3 className={TEXT.h2}>Guruhlar</h3>
            <p className={TEXT.tiny}>{groups.length} ta</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 text-ink-muted hover:text-ink min-h-[40px] min-w-[40px] flex items-center justify-center"
            aria-label="Yopish"
          >
            <X className={ICON.sm} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-white/5">
          <div className="relative">
            <Search
              className={`${ICON.sm} absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted`}
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Guruhni qidirish..."
              className={`${CONTROL.input} pl-10`}
            />
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {filtered.length === 0 ? (
            <EmptyState icon={FolderOpen} title="Guruh topilmadi" />
          ) : (
            <div className="divide-y divide-white/5">
              {filtered.map((g) => (
                <ListRow
                  key={g.id}
                  title={g.name}
                  subtitle={`${g.studentsCount} ta talaba`}
                  onClick={() => onSelect(g.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   DAILY CHART — kutubxonasiz
   ============================================================ */
function DailyChart({
  data,
  total,
}: {
  data: { date: string; count: number; avgPercent: number }[];
  total: number;
}) {
  if (!data || data.length === 0) {
    return <p className="text-center py-8 text-xs text-ink-muted">Ma'lumot yo'q</p>;
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const width = 320;
  const height = 110;
  const pad = { top: 8, bottom: 20, left: 8, right: 8 };
  const cw = width - pad.left - pad.right;
  const ch = height - pad.top - pad.bottom;

  const points = data.map((d, i) => {
    const x =
      data.length === 1 ? pad.left + cw / 2 : pad.left + (i / (data.length - 1)) * cw;
    const y = pad.top + ch - (d.count / maxCount) * ch;
    return { x, y, ...d };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${pad.top + ch} L ${
    points[0].x
  } ${pad.top + ch} Z`;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className={TEXT.tiny}>Faol talabalar / kun</span>
        <span className={TEXT.tiny}>Jami: {total}</span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-28"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(212, 175, 55)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="rgb(212, 175, 55)" stopOpacity="0" />
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
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="rgb(212, 175, 55)" />
        ))}
        {points.map((p, i) => {
          const d = new Date(p.date);
          return (
            <text
              key={i}
              x={p.x}
              y={height - 4}
              textAnchor="middle"
              fill="currentColor"
              className="text-ink-muted"
              style={{ fontSize: '8px' }}
            >
              {d.getDate()}/{d.getMonth() + 1}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

/* ============================================================
   SKELETON
   ============================================================ */
function OverviewSkeleton() {
  return (
    <div className={PAGE_WIDE}>
      <div className="h-10 w-48 bg-surface/30 rounded-2xl animate-pulse" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-48" />
    </div>
  );
}

// AlertTriangle import qo'shishni unutmang
import { AlertTriangle } from '../../design/icons';

export default TeacherOverview;