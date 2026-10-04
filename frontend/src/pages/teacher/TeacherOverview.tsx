// src/pages/teacher/TeacherOverview.tsx
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api-client';
import { useTelegram } from '../../hooks/useTelegram';
import { ListRow, EmptyState, Skeleton, CardList } from '../../components/ui';
import { StaffHero, Panel, PanelLink, KpiCard, MiniBars, Avatar, TodayLessons } from '../../components/staff';
import { IMAGES } from '../../design/images';
import {
  Users,
  FileText,
  BarChart3,
  FolderOpen,
  Search,
  X,
  RotateCw,
  Plus,
  Trophy,
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

  const name = user?.first_name;
  const days = (data.charts.dailyActivity ?? []).map((d) => {
    const dt = new Date(d.date);
    return { label: `${dt.getDate()}/${dt.getMonth() + 1}`, value: d.count, title: `${d.date}: ${d.count} ta faol, o'rtacha ${d.avgPercent}%` };
  });

  return (
    <div className={PAGE_WIDE}>
      <StaffHero
        accent="gold"
        image={IMAGES.sciencePhysics}
        eyebrow="O'qituvchi paneli"
        title={name ? `Salom, ${name}!` : 'Ish maydonim'}
        subtitle="Guruhlaringiz, testlar va talabalar natijalarini bir joyda kuzating."
        actions={
          <>
            <button type="button" onClick={() => { haptic('light'); navigate('/teacher/tests'); }} className={CONTROL.buttonPrimary}>
              <Plus className={ICON.sm} /> Test
            </button>
            <button type="button" onClick={() => { haptic('light'); navigate('/teacher/groups'); }} className={CONTROL.buttonGhost}>
              Guruhlar
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Guruhlar" value={data.groupsCount} icon={FolderOpen} accent="gold" hint="barchasini ko'rish" onClick={() => { haptic('light'); setGroupsModal(true); }} />
        <KpiCard label="Talabalar" value={data.studentsCount} icon={Users} accent="teal" hint="faol tinglovchilar" />
        <KpiCard label="Biriktirilgan testlar" value={data.assignedTestsCount} icon={FileText} accent="sky" />
        <KpiCard label="O'rtacha natija" value={`${data.averageScore}%`} icon={BarChart3} accent="coral" hint={`${data.totalAttempts} ta urinish`} />
      </div>

      <TodayLessons basePath="/teacher/groups" openAttendanceTab />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Panel title="Oxirgi 7 kun faolligi" icon={BarChart3} accent="gold" className="lg:col-span-3">
          <MiniBars data={days} color="gold" />
        </Panel>

        <Panel title="Eng yaxshi talabalar" icon={Trophy} accent="gold" className="lg:col-span-2" flush>
          {data.topStudents.length === 0 ? (
            <p className="px-5 pb-5 text-xs text-ink-muted">Hozircha ma'lumot yo'q</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {data.topStudents.map((s, i) => (
                <li key={s.id} className="flex items-center gap-3 px-5 py-2.5">
                  <span className={`w-5 text-center font-display text-sm tabular-nums ${i === 0 ? 'text-gold' : 'text-ink-muted'}`}>{i + 1}</span>
                  <Avatar name={`${s.firstName} ${s.lastName ?? ''}`} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{s.firstName} {s.lastName}</p>
                    <p className="text-[11px] text-ink-muted">{s.level}-daraja</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-gold">{s.totalScore}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel
        title="So'nggi biriktirilgan testlar"
        icon={FileText}
        accent="sky"
        flush
        action={data.recentAssignments.length > 3 ? <PanelLink onClick={() => { haptic('light'); navigate('/teacher/tests'); }}>Barchasi</PanelLink> : undefined}
      >
        {data.recentAssignments.length === 0 ? (
          <EmptyState icon={FileText} title="Hali test biriktirilmagan" />
        ) : (
          <div className="divide-y divide-white/5">
            {data.recentAssignments.slice(0, 3).map((a) => (
              <ListRow
                key={a.id}
                title={a.testTitle}
                subtitle={a.groupName}
                onClick={() => { haptic('light'); navigate(`/teacher/tests/${a.testId}`); }}
              />
            ))}
          </div>
        )}
      </Panel>

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