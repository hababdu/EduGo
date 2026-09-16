// src/pages/student/GroupDetailPage.tsx
import { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api-client';
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

interface GroupDetail {
  id: string;
  name: string;
  description?: string | null;
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
        <div className="h-40 bg-surface/20 rounded-3xl animate-pulse border border-white/5" />
        <div className="h-32 bg-surface/20 rounded-3xl animate-pulse border border-white/5" />
      </div>
    );
  }

  /* ---------- Error ---------- */
  if (error || !group) {
    return (
      <div className="p-4 max-w-4xl mx-auto pb-24">
        <div className="text-center py-14 bg-surface/20 rounded-3xl border border-white/5 space-y-3">
          <p className="text-sm font-semibold text-ink">
            Guruh topilmadi
          </p>
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

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-5 pb-24">
      {/* ============ BACK BUTTON ============ */}
      <button
        type="button"
        onClick={() => {
          haptic('light');
          navigate('/groups');
        }}
        className="text-xs text-ink-muted hover:text-ink bg-surface/30 px-3 py-2 rounded-xl border border-white/5 w-fit min-h-[40px]"
      >
        ← Orqaga
      </button>

      {/* ============ HEADER ============ */}
      <div className="bg-surface/20 p-5 rounded-3xl border border-white/5 backdrop-blur-md space-y-3">
        <h1 className="font-display text-xl sm:text-2xl text-ink break-words">
          {group.name}
        </h1>

        {group.description && (
          <p className="text-xs text-ink-muted leading-relaxed">
            {group.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {teacherName && (
            <span className="bg-surface/40 px-2.5 py-1.5 rounded-lg text-ink-muted">
              👤 {teacherName}
            </span>
          )}
          <span className="bg-surface/40 px-2.5 py-1.5 rounded-lg text-ink-muted">
            👥 {memberCount} a'zo
          </span>
          <span className="bg-surface/40 px-2.5 py-1.5 rounded-lg text-ink-muted">
            📚 {assignmentCount} material
          </span>
        </div>
      </div>

      {/* ============ MEMBERS ============ */}
      <section className="bg-surface/20 p-5 rounded-3xl border border-white/5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">
            Guruh a'zolari
          </h2>
          <span className="text-xs text-ink-muted">
            {memberCount} ta
          </span>
        </div>

        {members.length === 0 ? (
          <div className="text-center py-8 bg-surface/30 rounded-2xl border border-white/5">
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
                  className="flex items-center gap-3 p-2.5 bg-surface/30 rounded-2xl"
                >
                  <div className="w-9 h-9 rounded-xl bg-gold/10 text-gold flex items-center justify-center font-display text-sm shrink-0">
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

      {/* ============ PLACEHOLDER: Materials + Tests ============ */}
      <section className="bg-surface/20 p-5 rounded-3xl border border-white/5 space-y-3">
        <h2 className="text-sm font-semibold text-ink">
          Materiallar va testlar
        </h2>

        <div className="text-center py-8 bg-surface/30 rounded-2xl border border-white/5">
          <p className="text-xs text-ink-muted">
            Materiallar va testlar tez orada qo'shiladi
          </p>
          <p className="text-[11px] text-ink-faint mt-1">
            Hozircha bu guruhda {assignmentCount} ta material biriktirilgan
          </p>
        </div>
      </section>
    </div>
  );
}

export default GroupDetailPage;