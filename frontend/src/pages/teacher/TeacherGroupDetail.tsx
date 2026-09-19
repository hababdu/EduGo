// src/pages/teacher/TeacherGroupDetail.tsx
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTelegram } from '../../hooks/useTelegram';
import { getFullUrl } from '../../hooks/useImageUpload';
import {
  useTeacherGroup,
  useTeacherAssignments,
} from '../../hooks/useTeacherAssignments';

/* ============================================================
   CONSTANTS
   ============================================================ */
const CATEGORY_META: Record<string, { label: string; badge: string }> = {
  LESSON: { label: 'Dars mavzusi', badge: 'bg-gold/10 text-gold' },
  HOMEWORK: { label: 'Uy vazifasi', badge: 'bg-coral/10 text-coral' },
  RESOURCE: { label: "Qo'shimcha", badge: 'bg-sky-500/10 text-sky-400' },
};

const CONTENT_META: Record<string, { label: string; emoji: string }> = {
  TEXT: { label: 'Matn', emoji: '📄' },
  IMAGE: { label: 'Rasm', emoji: '🖼️' },
  PDF: { label: 'PDF fayl', emoji: '📑' },
  VIDEO: { label: 'Video', emoji: '📹' },
};

/* ============================================================
   COMPONENT
   ============================================================ */
export function TeacherGroupDetail() {
  const { groupId = '' } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { haptic, showBackButton, hideBackButton } = useTelegram();

  const { data: group, isLoading: groupLoading, error: groupError } =
    useTeacherGroup(groupId);
  const {
    data: assignments,
    isLoading: assignmentsLoading,
    error: assignmentsError,
  } = useTeacherAssignments(groupId);

  const [activeTab, setActiveTab] = useState<'students' | 'materials'>(
    'students',
  );

  /* ---------- BackButton ---------- */
  useEffect(() => {
    const handleBack = () => {
      haptic('light');
      navigate('/teacher/groups');
    };
    const cleanup = showBackButton(handleBack);
    return () => {
      cleanup?.();
      hideBackButton();
    };
  }, [showBackButton, hideBackButton, navigate, haptic]);

  /* ---------- Statistics ---------- */
  const groupStats = useMemo(() => {
    const members = group?.members ?? [];
    if (members.length === 0) {
      return { avg: 0, total: 0, studentsCount: 0, activeCount: 0 };
    }

    const scores: number[] = [];
    for (const m of members) {
      const score = m.student?.studentProfile?.totalScore;
      if (typeof score === 'number') scores.push(score);
    }

    return {
      avg:
        scores.length > 0
          ? Math.round(scores.reduce((s, x) => s + x, 0) / scores.length)
          : 0,
      total: scores.reduce((s, x) => s + x, 0),
      studentsCount: members.length,
      activeCount: members.filter((m: any) => m.student?.status === 'ACTIVE')
        .length,
    };
  }, [group?.members]);

  /* ---------- Loading ---------- */
  if (groupLoading) {
    return (
      <div className="p-4 max-w-4xl mx-auto space-y-4 pb-32">
        <div className="h-10 w-24 bg-surface/30 rounded-2xl animate-pulse" />
        <div className="h-56 bg-surface/20 rounded-3xl animate-pulse border border-white/5" />
        <div className="h-32 bg-surface/20 rounded-3xl animate-pulse border border-white/5" />
      </div>
    );
  }

  /* ---------- Error ---------- */
  if (groupError || !group) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="text-center py-14 bg-surface/20 rounded-3xl border border-white/5 space-y-3">
          <div className="text-4xl">❌</div>
          <p className="text-sm font-semibold text-ink">Guruh topilmadi</p>
          <p className="text-xs text-ink-muted">
            {(groupError as any)?.response?.data?.message ||
              (groupError as any)?.message ||
              "Guruh o'chirilgan yoki sizga tegishli emas"}
          </p>
          <button
            type="button"
            onClick={() => {
              haptic('light');
              navigate('/teacher/groups');
            }}
            className="mt-2 text-xs font-semibold text-gold bg-gold/10 px-4 py-2.5 rounded-2xl"
          >
            ← Orqaga qaytish
          </button>
        </div>
      </div>
    );
  }

  const members = group.members ?? [];
  const materialsCount = assignments?.length ?? 0;
  const posterFullUrl = (group as any).posterUrl
    ? getFullUrl((group as any).posterUrl)
    : null;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto pb-32 space-y-5">
      {/* ============ BACK ============ */}
      <button
        type="button"
        onClick={() => {
          haptic('light');
          navigate('/teacher/groups');
        }}
        className="text-xs text-ink-muted hover:text-ink bg-surface/30 px-3 py-2 rounded-xl border border-white/5 w-fit min-h-[40px]"
      >
        ← Orqaga
      </button>

      {/* ============ POSTER HERO ============ */}
      <div className="relative rounded-3xl overflow-hidden border border-white/5 shadow-lg">
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

      {/* ============ STATS ============ */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-gold/10 to-surface/20 p-4 rounded-3xl border border-white/5">
          <span className="text-[10px] text-ink-muted uppercase tracking-wider block">
            O'rtacha ball
          </span>
          <p className="text-2xl font-display text-gold mt-1 tabular-nums">
            {groupStats.avg}
          </p>
        </div>
        <div className="bg-gradient-to-br from-teal/10 to-surface/20 p-4 rounded-3xl border border-white/5">
          <span className="text-[10px] text-ink-muted uppercase tracking-wider block">
            Jami ball
          </span>
          <p className="text-2xl font-display text-teal mt-1 tabular-nums">
            {groupStats.total}
          </p>
        </div>
      </div>

      {/* ============ TABS ============ */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <button
          type="button"
          onClick={() => {
            haptic('light');
            setActiveTab('students');
          }}
          className={`shrink-0 px-3.5 py-2.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 min-h-[40px] ${
            activeTab === 'students'
              ? 'bg-gold text-base'
              : 'bg-white/5 text-ink-muted hover:bg-white/10'
          }`}
        >
          <span>👥</span>
          <span>Talabalar</span>
          <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded-full">
            {groupStats.studentsCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            haptic('light');
            setActiveTab('materials');
          }}
          className={`shrink-0 px-3.5 py-2.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 min-h-[40px] ${
            activeTab === 'materials'
              ? 'bg-gold text-base'
              : 'bg-white/5 text-ink-muted hover:bg-white/10'
          }`}
        >
          <span>📚</span>
          <span>Materiallar</span>
          <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded-full">
            {materialsCount}
          </span>
        </button>
      </div>

      {/* ============ TAB: STUDENTS ============ */}
      {activeTab === 'students' && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-ink-muted">
            Guruh a'zolari ({groupStats.studentsCount})
          </h2>

          {members.length === 0 ? (
            <div className="text-center py-12 bg-surface/20 rounded-3xl border border-white/5">
              <div className="text-4xl mb-2">👥</div>
              <p className="text-xs text-ink-muted">
                Bu guruhda hozircha talabalar yo'q.
              </p>
            </div>
          ) : (
            <div className="bg-surface/20 rounded-3xl border border-white/5 divide-y divide-white/5 overflow-hidden">
              {members.map((m: any) => {
                const s = m.student || {};
                const fullName =
                  `${s.firstName || ''} ${s.lastName || ''}`.trim() ||
                  s.username ||
                  "Noma'lum talaba";
                const initial = fullName[0]?.toUpperCase() || 'T';
                const status = s.status || 'ACTIVE';
                const statusColor =
                  status === 'ACTIVE'
                    ? 'bg-teal/15 text-teal'
                    : status === 'BLOCKED'
                    ? 'bg-red-500/15 text-red-400'
                    : 'bg-gold/15 text-gold';

                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      haptic('light');
                      navigate(
                        `/teacher/groups/${groupId}/students/${
                          s.id || m.studentId
                        }`,
                      );
                    }}
                    className="flex items-center gap-3 p-3.5 hover:bg-white/[0.02] transition-colors cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-gold/20 to-teal/20 text-gold flex items-center justify-center font-display text-base shrink-0">
                      {initial}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-ink truncate">
                          {fullName}
                        </p>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-md font-semibold shrink-0 ${statusColor}`}
                        >
                          {status === 'ACTIVE'
                            ? 'Faol'
                            : status === 'BLOCKED'
                            ? 'Bloklangan'
                            : status}
                        </span>
                      </div>
                      <p className="text-xs text-ink-muted truncate">
                        {s.username
                          ? `@${s.username}`
                          : `ID: ${s.id || m.studentId}`}
                        {s.studentProfile && (
                          <>
                            {' · '}
                            <span className="text-gold">
                              {s.studentProfile.totalScore} ball
                            </span>
                            {' · L'}
                            {s.studentProfile.level}
                          </>
                        )}
                      </p>
                    </div>

                    <span className="text-ink-muted text-xs shrink-0">›</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ============ TAB: MATERIALS ============ */}
      {activeTab === 'materials' && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-ink-muted">
            Materiallar ({materialsCount})
          </h2>

          {assignmentsLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-20 bg-surface/20 rounded-3xl animate-pulse border border-white/5"
                />
              ))}
            </div>
          ) : assignmentsError ? (
            <div className="text-center py-10 bg-red-500/5 rounded-3xl border border-red-500/20 space-y-2">
              <p className="text-sm font-semibold text-red-400">
                Materiallarni yuklashda xatolik
              </p>
              <p className="text-xs text-ink-muted">
                {(assignmentsError as any)?.response?.data?.message ||
                  (assignmentsError as any)?.message ||
                  'Server xatosi'}
              </p>
            </div>
          ) : !assignments || assignments.length === 0 ? (
            <div className="text-center py-12 bg-surface/20 rounded-3xl border border-white/5 space-y-3">
              <div className="text-4xl mb-2">📚</div>
              <p className="text-sm font-semibold text-ink">Materiallar yo'q</p>
              <p className="text-xs text-ink-muted">
                Bu guruhga hali material biriktirilmagan
              </p>
              <button
                type="button"
                onClick={() => {
                  haptic('light');
                  navigate('/teacher/content/courses');
                }}
                className="mt-2 text-xs font-semibold text-gold bg-gold/10 px-4 py-2.5 rounded-2xl active:scale-[0.98] transition-transform"
              >
                + Material qo'shish
              </button>
            </div>
          ) : (
            <div className="space-y-3">
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
                    className="w-full text-left bg-surface/20 hover:bg-surface/40 p-4 rounded-3xl border border-white/5 active:scale-[0.99] transition-all"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${cat.badge}`}
                        >
                          {cat.label}
                        </span>
                        <span className="text-[10px] px-2.5 py-1 rounded-full font-semibold bg-white/5 text-ink-muted">
                          {content.emoji} {content.label}
                        </span>
                        {a.tests && a.tests.length > 0 && (
                          <span className="text-[10px] px-2.5 py-1 rounded-full font-semibold bg-gold/10 text-gold">
                            🧠 {a.tests.length} ta test
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-semibold text-ink truncate">
                        {a.title}
                      </h3>

                      {a.description && (
                        <p className="text-xs text-ink-muted line-clamp-2">
                          {a.description}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default TeacherGroupDetail;