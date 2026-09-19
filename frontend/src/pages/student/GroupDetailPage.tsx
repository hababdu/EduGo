// src/pages/student/GroupDetailPage.tsx
import { useEffect, useMemo } from 'react';
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

interface GroupDetail {
  id: string;
  name: string;
  description?: string | null;
  posterUrl?: string | null;
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
        <div className="h-56 bg-surface/20 rounded-3xl animate-pulse border border-white/5" />
        <div className="h-32 bg-surface/20 rounded-3xl animate-pulse border border-white/5" />
      </div>
    );
  }

  /* ---------- Error ---------- */
  if (error || !group) {
    return (
      <div className="p-4 max-w-4xl mx-auto pb-24">
        <div className="text-center py-14 bg-surface/20 rounded-3xl border border-white/5 space-y-3">
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

      {/* ============ POSTER HERO ============ */}
      <div className="relative rounded-3xl overflow-hidden border border-white/5 shadow-lg">
        {/* Poster */}
        {posterFullUrl ? (
          <div className="relative w-full h-56 sm:h-64">
            <img
              src={posterFullUrl}
              alt={group.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
          </div>
        ) : (
          <div className="w-full h-40 bg-gradient-to-br from-gold/20 via-gold/5 to-teal/10 flex items-center justify-center text-6xl">
            📁
          </div>
        )}

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-5 space-y-2">
          <h1 className="font-display text-2xl sm:text-3xl text-white break-words drop-shadow-lg">
            {group.name}
          </h1>
          {group.description && (
            <p className="text-xs text-white/80 leading-relaxed line-clamp-2">
              {group.description}
            </p>
          )}
        </div>
      </div>

      {/* ============ META ============ */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-surface/20 p-3 rounded-2xl border border-white/5 text-center">
          <p className="text-[10px] text-ink-muted uppercase tracking-wider">
            A'zolar
          </p>
          <p className="text-lg font-display text-gold mt-1 tabular-nums">
            {memberCount}
          </p>
        </div>
        <div className="bg-surface/20 p-3 rounded-2xl border border-white/5 text-center">
          <p className="text-[10px] text-ink-muted uppercase tracking-wider">
            Materiallar
          </p>
          <p className="text-lg font-display text-teal mt-1 tabular-nums">
            {assignmentCount}
          </p>
        </div>
        <div className="bg-surface/20 p-3 rounded-2xl border border-white/5 text-center">
          <p className="text-[10px] text-ink-muted uppercase tracking-wider">
            Ustoz
          </p>
          <p className="text-xs font-medium text-ink mt-1.5 truncate">
            {teacherName || '—'}
          </p>
        </div>
      </div>

      {/* ============ MEMBERS ============ */}
      <section className="bg-surface/20 p-5 rounded-3xl border border-white/5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
            <span>👥</span>
            <span>Guruh a'zolari</span>
          </h2>
          <span className="text-xs text-ink-muted">{memberCount} ta</span>
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

      {/* ============ MATERIALS PLACEHOLDER ============ */}
      <section className="bg-surface/20 p-5 rounded-3xl border border-white/5 space-y-3">
        <h2 className="text-sm font-semibold text-ink flex items-center gap-2">
          <span>📚</span>
          <span>Materiallar va testlar</span>
        </h2>

        <div className="text-center py-8 bg-surface/30 rounded-2xl border border-white/5">
          <div className="text-3xl mb-2">📚</div>
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