// src/pages/teacher/TeacherGroupDetail.tsx
import { ScheduleBadge } from '../../components/group/ScheduleBadge';
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTelegram } from '../../hooks/useTelegram';
import { getFullUrl } from '../../hooks/useImageUpload';
import {
  useTeacherGroup,
  useTeacherAssignments,
} from '../../hooks/useTeacherAssignments';
import { EmptyState, Skeleton } from '../../components/ui';
import { StaffHero, Panel, KpiCard, Avatar } from '../../components/staff';
import { BackButton } from '../../components/teacher/BackButton';
import { IMAGES } from '../../design/images';
import {
  Users,
  FileText,
  FolderOpen,
  AlertTriangle,
  BookOpen,
  ClipboardList,
  Video,
  Image as ImageIcon,
  FileType,
  Plus,
} from '../../design/icons';
import { BarChart3, Trophy, Settings } from 'lucide-react';
import { TEXT, CONTROL, PAGE_WIDE } from '../../design/tokens';
import { CapacityBar } from '../../components/group/CapacityBar';
import { TelegramLinkButton } from '../../components/group/TelegramLinkButton';
import { GroupSettingsForm } from '../../components/group/GroupSettingsForm';
import { AttendancePanel } from '../../components/group/AttendancePanel';


/* ============================================================
   META
   ============================================================ */
const CATEGORY_META: Record<
  string,
  { label: string; cls: string; Icon: any }
> = {
  LESSON: { label: 'Dars', cls: 'bg-gold/10 text-gold', Icon: BookOpen },
  HOMEWORK: { label: 'Uy vazifasi', cls: 'bg-coral/10 text-coral', Icon: ClipboardList },
  RESOURCE: { label: "Qo'shimcha", cls: 'bg-sky/10 text-sky', Icon: FolderOpen },
};

const CONTENT_META: Record<string, { label: string; Icon: any }> = {
  TEXT: { label: 'Matn', Icon: FileText },
  IMAGE: { label: 'Rasm', Icon: ImageIcon },
  PDF: { label: 'PDF', Icon: FileType },
  VIDEO: { label: 'Video', Icon: Video },
};

/* ============================================================
   COMPONENT
   ============================================================ */
export function TeacherGroupDetail() {
  const { groupId = '' } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { haptic, showBackButton, hideBackButton } = useTelegram();

  const {
    data: group,
    isLoading: groupLoading,
    error: groupError,
  } = useTeacherGroup(groupId);

  const {
    data: assignments,
    isLoading: assignmentsLoading,
    error: assignmentsError,
  } = useTeacherAssignments(groupId);

  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<'students' | 'materials' | 'attendance'>(
    searchParams.get('tab') === 'attendance' ? 'attendance' : 'students',
  );

  useEffect(() => {
    const cleanup = showBackButton(() => {
      haptic('light');
      navigate('/teacher/groups');
    });
    return () => {
      cleanup?.();
      hideBackButton();
    };
  }, [showBackButton, hideBackButton, navigate, haptic]);

  /* ---------- Stats — TYPE SAFE ---------- */
  const stats = useMemo(() => {
    const members: any[] = group?.members ?? [];

    const scores: number[] = members
      .map((m: any) => m?.student?.studentProfile?.totalScore)
      .filter((x: unknown): x is number => typeof x === 'number' && !isNaN(x));

    const total: number = scores.reduce<number>((sum, val) => sum + val, 0);
    const avg: number = scores.length > 0 ? Math.round(total / scores.length) : 0;
    const activeCount = members.filter(
      (m: any) => m?.student?.status === 'ACTIVE',
    ).length;

    return {
      avg,
      total,
      studentsCount: members.length,
      activeCount,
    };
  }, [group?.members]);

  /* ---------- Loading ---------- */
  if (groupLoading) {
    return (
      <div className={PAGE_WIDE}>
        <Skeleton className="h-44 rounded-3xl" />
        <Skeleton className="h-24" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  /* ---------- Error ---------- */
  if (groupError || !group) {
    return (
      <div className={PAGE_WIDE}>
        <div className="bg-surface/40 border border-white/10 rounded-3xl">
          <EmptyState
            icon={AlertTriangle}
            title="Guruh topilmadi"
            subtitle={
              (groupError as any)?.response?.data?.message ||
              (groupError as any)?.message ||
              "Guruh o'chirilgan yoki sizga tegishli emas"
            }
            action={{
              label: 'Orqaga',
              onClick: () => {
                haptic('light');
                navigate('/teacher/groups');
              },
            }}
          />
        </div>
      </div>
    );
  }

  const members: any[] = group.members ?? [];
  const materialsCount = assignments?.length ?? 0;
  const poster = (group as any).posterUrl
    ? getFullUrl((group as any).posterUrl)
    : null;

  return (
    <div className={PAGE_WIDE}>
      <StaffHero
        accent="gold"
        image={poster || IMAGES.sciencePhysics}
        eyebrow="Guruh"
        title={group.name}
        subtitle={group.description || undefined}
        top={
          <BackButton
            onClick={() => {
              haptic('light');
              navigate('/teacher/groups');
            }}
          />
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Talabalar" value={stats.studentsCount} icon={Users} accent="gold" hint={`${stats.activeCount} ta faol`} />
        <KpiCard label="Materiallar" value={materialsCount} icon={FileText} accent="sky" />
        <KpiCard label="O'rtacha ball" value={stats.avg} icon={BarChart3} accent="teal" />
        <KpiCard label="Jami ball" value={stats.total} icon={Trophy} accent="coral" />
      </div>

      {/* Sig'im, Telegram havola, sozlamalar */}
      <Panel title="Guruh sozlamalari" icon={Settings} accent="teal">
       <div className="space-y-3">
        <ScheduleBadge schedule={group} className="text-xs" />
        <div className="flex items-end justify-between gap-3">
          <CapacityBar count={members.length} max={group.maxCapacity} className="flex-1" />
          <TelegramLinkButton url={group.telegramChatUrl} />
        </div>
        <GroupSettingsForm
          key={`${group.maxCapacity ?? ''}|${group.telegramChatUrl ?? ''}|${(group.lessonDays ?? []).join('')}|${group.lessonStartTime ?? ''}|${group.lessonEndTime ?? ''}|${group.room ?? ''}`}
          groupId={groupId}
          maxCapacity={group.maxCapacity}
          telegramChatUrl={group.telegramChatUrl}
          schedule={group}
          memberCount={members.length}
        />
       </div>
      </Panel>

      {/* Tabs */}
      <div className="flex gap-1.5 rounded-2xl border border-white/10 bg-surface/40 p-1.5">
        <button
          type="button"
          onClick={() => {
            haptic('light');
            setTab('students');
          }}
          className={`${CONTROL.chip} flex-1 flex items-center justify-center gap-1.5 ${
            tab === 'students' ? CONTROL.chipActive : CONTROL.chipInactive
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Talabalar
          <span className="opacity-70">· {stats.studentsCount}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            haptic('light');
            setTab('materials');
          }}
          className={`${CONTROL.chip} flex-1 flex items-center justify-center gap-1.5 ${
            tab === 'materials' ? CONTROL.chipActive : CONTROL.chipInactive
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Materiallar
          <span className="opacity-70">· {materialsCount}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            haptic('light');
            setTab('attendance');
          }}
          className={`${CONTROL.chip} flex-1 flex items-center justify-center gap-1.5 ${
            tab === 'attendance' ? CONTROL.chipActive : CONTROL.chipInactive
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5" />
          Davomat
        </button>
      </div>

      {/* Tab: Attendance */}
      {tab === 'attendance' && <AttendancePanel groupId={groupId} />}

      {/* Tab: Students */}
      {tab === 'students' &&
        (members.length === 0 ? (
          <div className="bg-surface/40 border border-white/10 rounded-3xl">
            <EmptyState icon={Users} title="Talabalar yo'q" />
          </div>
        ) : (
          <Panel title="Talabalar" icon={Users} accent="gold" flush>
            <ul className="divide-y divide-white/5">
              {members.map((m: any) => {
                const s = m.student || {};
                const name =
                  `${s.firstName || ''} ${s.lastName || ''}`.trim() ||
                  s.username ||
                  "Noma'lum";
                const status = s.status || 'ACTIVE';
                const statusLabel =
                  status === 'ACTIVE' ? 'Faol' : status === 'BLOCKED' ? 'Blok' : status;
                const statusCls =
                  status === 'ACTIVE'
                    ? 'bg-teal/15 text-teal'
                    : status === 'BLOCKED'
                    ? 'bg-coral/15 text-coral'
                    : 'bg-gold/15 text-gold';
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => {
                        haptic('light');
                        navigate(`/teacher/groups/${groupId}/students/${s.id || m.studentId}`);
                      }}
                      className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-white/5 active:bg-white/10 transition"
                    >
                      <Avatar name={name} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{name}</p>
                        <p className="truncate text-[11px] text-ink-muted">
                          {s.username ? `@${s.username}` : `ID: ${s.id || m.studentId}`}
                        </p>
                      </div>
                      {s.studentProfile && (
                        <span className="text-xs font-semibold text-gold tabular-nums shrink-0">
                          {s.studentProfile.totalScore}
                        </span>
                      )}
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold shrink-0 ${statusCls}`}>
                        {statusLabel}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Panel>
        ))}

      {/* Tab: Materials */}
      {tab === 'materials' &&
        (assignmentsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : assignmentsError ? (
          <div className="bg-coral/5 border border-coral/20 rounded-2xl p-4">
            <p className="text-sm font-semibold text-coral">
              Yuklashda xatolik
            </p>
            <p className={TEXT.tiny + ' mt-1'}>
              {(assignmentsError as any)?.message}
            </p>
          </div>
        ) : !assignments || assignments.length === 0 ? (
          <div className="bg-surface/40 border border-white/10 rounded-3xl">
            <EmptyState
              icon={FileText}
              title="Materiallar yo'q"
              subtitle="Bu guruhga hali material biriktirilmagan"
              action={{
                label: "Material qo'shish",
                icon: Plus,
                onClick: () => {
                  haptic('light');
                  navigate('/teacher/assignments');
                },
              }}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {assignments.map((a) => {
              const cat = CATEGORY_META[a.category] ?? CATEGORY_META.LESSON;
              const content = CONTENT_META[a.type] ?? CONTENT_META.TEXT;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    haptic('light');
                    navigate(`/teacher/assignments/${a.id}`);
                  }}
                  className="w-full text-left bg-surface/50 hover:bg-surface/70 border border-white/10 rounded-2xl p-4 active:scale-[0.99] transition"
                >
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-semibold ${cat.cls}`}
                    >
                      <cat.Icon className="w-3 h-3" />
                      {cat.label}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md font-semibold bg-white/5 text-ink-muted">
                      <content.Icon className="w-3 h-3" />
                      {content.label}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-ink truncate">
                    {a.title}
                  </h3>
                  {a.description && (
                    <p className="text-xs text-ink-muted line-clamp-2 mt-1">
                      {a.description}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        ))}
    </div>
  );
}

export default TeacherGroupDetail;