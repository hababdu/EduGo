// src/pages/student/GroupDetailPage.tsx
import { StaffHero } from '../../components/staff';
import { IMAGES } from '../../design/images';
import { MyPaymentsCard } from '../../components/group/MyPaymentsCard';
import { ScheduleBadge } from '../../components/group/ScheduleBadge';
import { CapacityBar } from '../../components/group/CapacityBar';
import { TelegramLinkButton } from '../../components/group/TelegramLinkButton';
import { LessonLogPanel } from '../../components/group/LessonLogPanel';
import { MyAttendanceCard } from '../../components/group/MyAttendanceCard';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api-client';
import { getFullUrl } from '../../hooks/useImageUpload';
import { useTelegram } from '../../hooks/useTelegram';

/* ============================================================
   TYPES
   ============================================================ */
interface Teacher {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
}

interface GroupMember {
  id: string;
  student: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    username?: string | null;
  };
}

interface GroupAssignment { id: string; title: string; description?: string | null; category: string; groupId: string; type: string; dueAt?: string | null; }
interface GroupTest { testId: string; title: string; groupId: string; groupName: string; durationSeconds: number; deadline?: string | null; status: string; score?: number; maxScore?: number; passed?: boolean; }
interface GroupDetail {
  id: string;
  name: string;
  description?: string | null;
  posterUrl?: string | null;
  maxCapacity?: number | null;
  telegramChatUrl?: string | null;
  lessonDays?: number[] | null;
  lessonStartTime?: string | null;
  lessonEndTime?: string | null;
  room?: string | null;
  teacher?: Teacher | null;
  members?: GroupMember[];
  _count?: {
    members?: number;
    assignments?: number;
  };
}

/* ============================================================
   HOOK
   ============================================================ */
function useGroupDetail(groupId: string) {
  return useQuery({
    queryKey: ['student', 'group', groupId],
    queryFn: () => apiFetch<GroupDetail>(`/api/v1/groups/${groupId}`),
    enabled: !!groupId,
    staleTime: 60_000,
  });
}

/* ============================================================
   COMPONENT
   ============================================================ */
export function GroupDetailPage() {
  const { groupId = '' } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { haptic, showBackButton, hideBackButton } = useTelegram();

  const { data: group, isLoading, error } = useGroupDetail(groupId);
  const [learningTab, setLearningTab] = useState<'lessons' | 'tests'>('lessons');
  const { data: assignments = [] } = useQuery({ queryKey: ['student','group',groupId,'assignments'], queryFn: () => apiFetch<GroupAssignment[]>('/api/v1/dashboard/assignments'), enabled: !!groupId });
  const { data: tests = [] } = useQuery({ queryKey: ['student','group',groupId,'tests'], queryFn: () => apiFetch<GroupTest[]>('/api/v1/tests/assigned/me'), enabled: !!groupId });

  /* ---------- Telegram BackButton ---------- */
  useEffect(() => {
    const handleBack = () => {
      haptic('light');
      navigate('/groups');
    };
    const cleanup = showBackButton(handleBack);
    return () => {
      cleanup?.();
      hideBackButton();
    };
  }, [showBackButton, hideBackButton, navigate, haptic]);

  /* ---------- Teacher name ---------- */
  const teacherName = useMemo(() => {
    const t = group?.teacher;
    if (!t) return null;
    return (
      `${t.firstName || ''} ${t.lastName || ''}`.trim() ||
      t.username ||
      "O'qituvchi"
    );
  }, [group?.teacher]);

  /* ---------- Loading ---------- */
  if (isLoading) {
    return (
      <div className="p-4 max-w-4xl mx-auto space-y-4 pb-24">
        <div className="h-10 w-24 bg-surface/30 rounded-2xl animate-pulse" />
        <div className="h-56 bg-surface/20 rounded-3xl animate-pulse border border-tint/5" />
        <div className="h-32 bg-surface/20 rounded-3xl animate-pulse border border-tint/5" />
      </div>
    );
  }

  /* ---------- Error ---------- */
  if (error || !group) {
    return (
      <div className="p-4 max-w-4xl mx-auto pb-24">
        <div className="text-center py-14 bg-surface/20 rounded-3xl border border-tint/5 space-y-3">
          <div className="text-4xl">❌</div>
          <p className="text-sm font-semibold text-ink">Guruh topilmadi</p>
          <p className="text-xs text-ink-muted">
            {(error as any)?.response?.data?.message ||
              (error as any)?.message ||
              "Guruh o'chirilgan yoki siz a'zo emassiz"}
          </p>
          <button
            type="button"
            onClick={() => {
              haptic('light');
              navigate('/groups');
            }}
            className="mt-2 text-xs font-semibold text-gold bg-gold/10 px-4 py-2.5 rounded-2xl active:scale-[0.98] transition-transform"
          >
            ← Guruhlarga qaytish
          </button>
        </div>
      </div>
    );
  }

  const members = group.members ?? [];
  const memberCount = group._count?.members ?? members.length;
  const assignmentCount = group._count?.assignments ?? 0;
  const posterFullUrl = group.posterUrl ? getFullUrl(group.posterUrl) : null;

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-5 pb-24">
      {/* ============ HERO ============ */}
      <StaffHero
        eyebrow="GURUH"
        title={group.name}
        subtitle={group.description ?? undefined}
        image={posterFullUrl ?? IMAGES.hero}
        accent="gold"
        top={
          <button
            type="button"
            onClick={() => {
              haptic('light');
              navigate('/groups');
            }}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-tint/10 text-ink-muted hover:text-ink active:scale-95 transition"
            aria-label="Orqaga"
          >
            ←
          </button>
        }
      />

      {/* ============ META ============ */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-surface/20 p-3 rounded-2xl border border-tint/5 text-center">
          <p className="text-[10px] text-ink-muted uppercase tracking-wider">
            A'zolar
          </p>
          <p className="text-lg font-display text-gold mt-1 tabular-nums">
            {memberCount}
          </p>
        </div>
        <div className="bg-surface/20 p-3 rounded-2xl border border-tint/5 text-center">
          <p className="text-[10px] text-ink-muted uppercase tracking-wider">
            Materiallar
          </p>
          <p className="text-lg font-display text-teal mt-1 tabular-nums">
            {assignmentCount}
          </p>
        </div>
        <div className="bg-surface/20 p-3 rounded-2xl border border-tint/5 text-center">
          <p className="text-[10px] text-ink-muted uppercase tracking-wider">
            Ustoz
          </p>
          <p className="text-xs font-medium text-ink mt-1.5 truncate">
            {teacherName || '—'}
          </p>
        </div>
      </div>

      {/* ============ SIG'IM, TELEGRAM, DAVOMAT ============ */}
      <ScheduleBadge schedule={group} className="text-xs" />
      {(group.maxCapacity || group.telegramChatUrl) && (
        <div className="flex items-end justify-between gap-3">
          <CapacityBar count={memberCount} max={group.maxCapacity} className="flex-1" />
          <TelegramLinkButton url={group.telegramChatUrl} />
        </div>
      )}
      <MyAttendanceCard groupId={group.id} />
      <LessonLogPanel groupId={group.id} canEdit={false} />
      <MyPaymentsCard groupId={group.id} />

      {/* ============ MEMBERS ============ */}
      <section className="bg-surface/20 p-5 rounded-3xl border border-tint/5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
            <span>👥</span>
            <span>Guruh a'zolari</span>
          </h2>
          <span className="text-xs text-ink-muted">{memberCount} ta</span>
        </div>

        {members.length === 0 ? (
          <div className="text-center py-8 bg-surface/30 rounded-2xl border border-tint/5">
            <p className="text-xs text-ink-muted">
              A'zolar ro'yxati mavjud emas
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {members.slice(0, 10).map((m) => {
              const s = m.student;
              const fullName =
                `${s?.firstName || ''} ${s?.lastName || ''}`.trim() ||
                s?.username ||
                "Noma'lum";
              const initial = fullName[0]?.toUpperCase() || 'T';

              return (
                <div
                  key={m.id}
                  className="flex items-center gap-3 p-2.5 bg-surface/30 rounded-2xl hover:bg-surface/50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold/20 to-teal/20 text-gold flex items-center justify-center font-display text-sm shrink-0">
                    {initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink truncate">
                      {fullName}
                    </p>
                    {s?.username && (
                      <p className="text-[11px] text-ink-muted truncate">
                        @{s.username}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {members.length > 10 && (
              <p className="text-xs text-ink-muted text-center pt-2">
                va yana {members.length - 10} ta a'zo...
              </p>
            )}
          </div>
        )}
      </section>

      {/* ============ GURUH DARSLARI VA TESTLARI ============ */}
      <section className="bg-surface/20 p-5 rounded-3xl border border-tint/5 space-y-4">
        <h2 className="text-sm font-semibold text-ink">Guruh ta'limi</h2>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setLearningTab('lessons')} className={`rounded-xl px-3 py-2.5 text-xs font-semibold ${learningTab === 'lessons' ? 'bg-accent text-base' : 'bg-tint/5 text-ink-muted'}`}>Darslar ({assignments.filter(a => a.groupId === group.id).length})</button>
          <button type="button" onClick={() => setLearningTab('tests')} className={`rounded-xl px-3 py-2.5 text-xs font-semibold ${learningTab === 'tests' ? 'bg-accent text-base' : 'bg-tint/5 text-ink-muted'}`}>Testlar ({tests.filter(t => t.groupId === group.id || !t.groupId).length})</button>
        </div>
        {learningTab === 'lessons' ? (
          assignments.filter(a => a.groupId === group.id).length ? (
            <div className="space-y-2">{assignments.filter(a => a.groupId === group.id).map(a => (
              <button key={a.id} type="button" onClick={() => navigate(`/lessons/${a.id}`)} className="w-full rounded-2xl bg-surface/40 p-3 text-left">
                <div className="text-sm font-semibold text-ink">{a.title}</div>
                <div className="mt-1 text-[11px] text-ink-muted">{a.category} · {a.type}</div>
              </button>
            ))}</div>
          ) : <p className="py-5 text-center text-xs text-ink-muted">Bu guruhda hali dars materiali yo'q</p>
        ) : (
          tests.filter(t => t.groupId === group.id || !t.groupId).length ? (
            <div className="space-y-2">{tests.filter(t => t.groupId === group.id || !t.groupId).map(t => (
              <button key={`${t.testId}-${t.groupId}`} type="button" onClick={() => navigate(`/tests/${t.testId}`)} className="w-full rounded-2xl bg-surface/40 p-3 text-left">
                <div className="text-sm font-semibold text-ink">{t.title}</div>
                <div className="mt-1 text-[11px] text-ink-muted">{Math.round(t.durationSeconds / 60)} daqiqa · {t.status}</div>
              </button>
            ))}</div>
          ) : <p className="py-5 text-center text-xs text-ink-muted">Bu guruhga hali test biriktirilmagan</p>
        )}
      </section>
    </div>
  );
}

export default GroupDetailPage;