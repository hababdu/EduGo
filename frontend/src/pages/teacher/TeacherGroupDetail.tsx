// src/pages/teacher/TeacherGroupDetail.tsx
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTelegram } from '../../hooks/useTelegram';
import { getFullUrl } from '../../hooks/useImageUpload';
import {
  useTeacherGroup,
  useTeacherAssignments,
} from '../../hooks/useTeacherAssignments';
import {
  PageHeader,
  Section,
  CardList,
  ListRow,
  EmptyState,
  Skeleton,
} from '../../components/ui';
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
import { TEXT, CONTROL, PAGE } from '../../design/tokens';
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
  RESOURCE: { label: "Qo'shimcha", cls: 'bg-sky-500/10 text-sky-400', Icon: FolderOpen },
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

  const [tab, setTab] = useState<'students' | 'materials' | 'attendance'>('students');

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
      <div className={PAGE}>
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-56" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  /* ---------- Error ---------- */
  if (groupError || !group) {
    return (
      <div className={PAGE}>
        <div className="bg-surface/20 border border-white/5 rounded-2xl">
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
    <div className={PAGE}>
      <PageHeader
        title={group.name}
        subtitle={group.description || undefined}
        onBack={() => {
          haptic('light');
          navigate('/teacher/groups');
        }}
      />

      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden border border-white/5">
        {poster ? (
          <div className="relative w-full h-48 sm:h-56">
            <img
              src={poster}
              alt={group.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          </div>
        ) : (
          <div className="w-full h-32 bg-gradient-to-br from-gold/15 to-teal/10 flex items-center justify-center">
            <FolderOpen className="w-10 h-10 text-gold/40" />
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface/20 border border-white/5 rounded-2xl p-4">
          <span className={TEXT.label}>O'rtacha ball</span>
          <p className="font-display text-2xl text-gold tabular-nums mt-2">
            {stats.avg}
          </p>
        </div>
        <div className="bg-surface/20 border border-white/5 rounded-2xl p-4">
          <span className={TEXT.label}>Jami ball</span>
          <p className="font-display text-2xl text-teal tabular-nums mt-2">
            {stats.total}
          </p>
        </div>
      </div>

      {/* Sig'im, Telegram havola, sozlamalar */}
      <div className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <CapacityBar count={members.length} max={group.maxCapacity} className="flex-1" />
          <TelegramLinkButton url={group.telegramChatUrl} />
        </div>
        <GroupSettingsForm
          key={`${group.maxCapacity ?? ''}|${group.telegramChatUrl ?? ''}`}
          groupId={groupId}
          maxCapacity={group.maxCapacity}
          telegramChatUrl={group.telegramChatUrl}
          memberCount={members.length}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5">
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
          <div className="bg-surface/20 border border-white/5 rounded-2xl">
            <EmptyState icon={Users} title="Talabalar yo'q" />
          </div>
        ) : (
          <CardList>
            {members.map((m: any) => {
              const s = m.student || {};
              const name =
                `${s.firstName || ''} ${s.lastName || ''}`.trim() ||
                s.username ||
                "Noma'lum";
              const initial = name[0]?.toUpperCase() || 'T';
              const status = s.status || 'ACTIVE';
              const statusCls =
                status === 'ACTIVE'
                  ? 'bg-teal/15 text-teal'
                  : status === 'BLOCKED'
                  ? 'bg-red-500/15 text-red-400'
                  : 'bg-gold/15 text-gold';
              const statusLabel =
                status === 'ACTIVE'
                  ? 'Faol'
                  : status === 'BLOCKED'
                  ? 'Blok'
                  : status;

              return (
                <ListRow
                  key={m.id}
                  leading={
                    <div className="w-10 h-10 rounded-xl bg-gold/10 text-gold flex items-center justify-center font-display text-base shrink-0">
                      {initial}
                    </div>
                  }
                  title={name}
                  subtitle={
                    s.username ? `@${s.username}` : `ID: ${s.id || m.studentId}`
                  }
                  trailing={
                    <div className="flex items-center gap-2 shrink-0">
                      {s.studentProfile && (
                        <span className="text-xs font-semibold text-gold tabular-nums">
                          {s.studentProfile.totalScore}
                        </span>
                      )}
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-md font-semibold ${statusCls}`}
                      >
                        {statusLabel}
                      </span>
                    </div>
                  }
                  onClick={() => {
                    haptic('light');
                    navigate(
                      `/teacher/groups/${groupId}/students/${
                        s.id || m.studentId
                      }`,
                    );
                  }}
                />
              );
            })}
          </CardList>
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
          <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4">
            <p className="text-sm font-semibold text-red-400">
              Yuklashda xatolik
            </p>
            <p className={TEXT.tiny + ' mt-1'}>
              {(assignmentsError as any)?.message}
            </p>
          </div>
        ) : !assignments || assignments.length === 0 ? (
          <div className="bg-surface/20 border border-white/5 rounded-2xl">
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
          <div className="space-y-2">
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
                  className="w-full text-left bg-surface/20 hover:bg-surface/30 border border-white/5 rounded-2xl p-3.5 active:scale-[0.99] transition"
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