import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api-client';
import { useTelegram } from '../../hooks/useTelegram';
import { toast } from '../../components/ui/Toast';

/* ============================================================
   TYPES
   ============================================================ */
interface GroupMemberStudent {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  status?: string | null;
  studentProfile?: {
    totalScore: number;
    level: number;
  } | null;
}

interface GroupMember {
  id: string;
  studentId: string;
  student: GroupMemberStudent;
}

interface GroupDetail {
  id: string;
  name: string;
  description?: string | null;
  teacherId?: string | null;
  members: GroupMember[];
  _count?: {
    members?: number;
    assignments?: number;
  };
}

interface StudentListItem {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
}

interface AssignmentTest {
  id: string;
  question: string;
  options: string[];
  correctOption: number;
  order: number;
}

interface AssignmentItem {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  category: string;
  mediaUrl?: string | null;
  groupId: string;
  createdAt: string;
  tests?: AssignmentTest[];
}

/* ============================================================
   CONSTANTS
   ============================================================ */
const CATEGORY_META: Record<string, { label: string; short: string; badge: string }> = {
  LESSON: {
    label: 'Dars mavzusi',
    short: 'Dars',
    badge: 'bg-gold/10 text-gold',
  },
  HOMEWORK: {
    label: 'Uy vazifasi',
    short: 'Uy vazifasi',
    badge: 'bg-coral/10 text-coral',
  },
  RESOURCE: {
    label: "Qo'shimcha",
    short: "Qo'shimcha",
    badge: 'bg-sky-500/10 text-sky-400',
  },
};

const CONTENT_META: Record<string, { label: string; emoji: string }> = {
  TEXT: { label: 'Matn', emoji: '📄' },
  IMAGE: { label: 'Rasm', emoji: '🖼️' },
  PDF: { label: 'PDF fayl', emoji: '📑' },
  VIDEO: { label: 'Video', emoji: '📹' },
};

/* ============================================================
   HOOKS
   ============================================================ */
function useGroupDetail(groupId: string) {
  return useQuery({
    queryKey: ['teacher', 'group', groupId],
    queryFn: () => apiFetch<GroupDetail>(`/api/v1/groups/${groupId}`),
    enabled: !!groupId,
  });
}

function useGroupAssignments(groupId: string) {
  return useQuery({
    queryKey: ['teacher', 'assignments', 'group', groupId],
    queryFn: () =>
      apiFetch<AssignmentItem[]>(
        `/api/v1/teacher/assignments?groupId=${groupId}`,
      ),
    enabled: !!groupId,
  });
}

function useUpdateGroup(groupId: string) {
  const qc = useQueryClient();

  return useMutation<
    unknown,                                      // 👈 TData
    Error,                                        // 👈 TError
    { name?: string; description?: string }       // 👈 TVariables — MANA SHU
  >({
    mutationFn: (data) =>
      apiFetch(`/api/v1/groups/${groupId}`, {
        method: 'PATCH',
        data,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher', 'group', groupId] });
      qc.invalidateQueries({ queryKey: ['teacher', 'overview'] });
      qc.invalidateQueries({ queryKey: ['teacher', 'groups'] });
    },
  });
}

function useAddStudent(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (studentId: string) =>
      apiFetch(`/api/v1/groups/${groupId}/students`, {
        method: 'POST',
        data: { studentId },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher', 'group', groupId] });
      qc.invalidateQueries({ queryKey: ['teacher', 'overview'] });
    },
  });
}

function useRemoveStudent(groupId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (studentId: string) =>
      apiFetch(`/api/v1/groups/${groupId}/students/${studentId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher', 'group', groupId] });
      qc.invalidateQueries({ queryKey: ['teacher', 'overview'] });
    },
  });
}

function useAllStudents() {
  return useQuery({
    queryKey: ['admin', 'students', 'for-picker'],
    queryFn: () =>
      apiFetch<{ items?: StudentListItem[]; data?: StudentListItem[] } | StudentListItem[]>(
        '/api/v1/admin/students?page=1&pageSize=50',
      ),
    staleTime: 60_000,
  });
}

/* ============================================================
   COMPONENT
   ============================================================ */
export function TeacherGroupDetail() {
  const { groupId = '' } = useParams<{ groupId: string }>();
  const navigate = useNavigate();

  const {
    haptic,
    hapticNotify,
    showConfirm,
    showBackButton,
    hideBackButton,
  } = useTelegram();

  const { data: group, isLoading, error } = useGroupDetail(groupId);
  const { data: assignments, isLoading: assignmentsLoading } = useGroupAssignments(groupId);
  const updateGroup = useUpdateGroup(groupId);
  const addStudent = useAddStudent(groupId);
  const removeStudent = useRemoveStudent(groupId);
  const { data: allStudentsData } = useAllStudents();

  const [activeTab, setActiveTab] = useState<'students' | 'materials' | 'edit'>(
    'students',
  );
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  useEffect(() => {
    if (group) {
      setEditName(group.name || '');
      setEditDescription(group.description || '');
    }
  }, [group]);

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
      return {
        avg: 0,
        total: 0,
        studentsCount: 0,
        activeCount: 0,
      };
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
      activeCount: members.filter((m) => m.student?.status === 'ACTIVE').length,
    };
  }, [group?.members]);

  /* ---------- Remove ---------- */
  const handleRemove = async (studentId: string, name: string) => {
    haptic('medium');
    const confirmed = await showConfirm(`${name} ni guruhdan chiqarmoqchimisiz?`);
    if (!confirmed) return;

    removeStudent.mutate(studentId, {
      onSuccess: () => {
        hapticNotify('success');
        toast('success', 'Talaba guruhdan chiqarildi');
      },
      onError: (err: any) => {
        hapticNotify('error');
        toast('error', err?.response?.data?.message || err?.message || 'Xatolik');
      },
    });
  };

  /* ---------- Add ---------- */
  const handleAddSubmit = () => {
    if (!selectedStudentId) return;
    haptic('light');
    addStudent.mutate(selectedStudentId, {
      onSuccess: () => {
        hapticNotify('success');
        toast('success', "Talaba guruhga qo'shildi!");
        setSelectedStudentId('');
        setIsAddModalOpen(false);
        setSearchQuery('');
      },
      onError: (err: any) => {
        hapticNotify('error');
        toast('error', err?.response?.data?.message || err?.message || 'Xatolik');
      },
    });
  };

  /* ---------- Update ---------- */
  const handleUpdate = () => {
    if (!editName.trim()) {
      hapticNotify('error');
      toast('error', 'Guruh nomini kiriting!');
      return;
    }
    haptic('light');
    updateGroup.mutate(
      {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      },
      {
        onSuccess: () => {
          hapticNotify('success');
          toast('success', "Guruh ma'lumotlari saqlandi");
        },
        onError: (err: any) => {
          hapticNotify('error');
          toast('error', err?.response?.data?.message || err?.message || 'Xatolik');
        },
      },
    );
  };

  /* ---------- Students for modal ---------- */
  const allStudents: StudentListItem[] = useMemo(() => {
    if (!allStudentsData) return [];
    if (Array.isArray(allStudentsData)) return allStudentsData;
    return allStudentsData.items || allStudentsData.data || [];
  }, [allStudentsData]);

  const currentMemberIds = useMemo(
    () => new Set((group?.members ?? []).map((m) => m.studentId)),
    [group?.members],
  );

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allStudents.filter((s) => {
      if (currentMemberIds.has(s.id)) return false;
      if (!q) return true;
      const name = `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase();
      const username = (s.username || '').toLowerCase();
      return name.includes(q) || username.includes(q);
    });
  }, [allStudents, searchQuery, currentMemberIds]);

  /* ---------- Loading / Error ---------- */
  if (!groupId) {
    return <div className="p-6 text-center text-coral">Guruh ID topilmadi.</div>;
  }

  if (isLoading) {
    return (
      <div className="p-4 max-w-4xl mx-auto space-y-4 pb-32">
        <div className="h-10 w-24 bg-surface/30 rounded-2xl animate-pulse" />
        <div className="h-40 bg-surface/20 rounded-3xl animate-pulse border border-white/5" />
        <div className="h-32 bg-surface/20 rounded-3xl animate-pulse border border-white/5" />
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="text-center py-14 bg-surface/20 rounded-3xl border border-white/5 space-y-3">
          <p className="text-sm font-semibold text-ink">Guruh topilmadi</p>
          <p className="text-xs text-ink-muted">
            Guruh o'chirilgan yoki sizga tegishli emas
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

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto pb-32 space-y-5">
      {/* ============ HEADER ============ */}
      <div className="bg-surface/20 p-5 rounded-3xl border border-white/5 backdrop-blur-md space-y-3">
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

        <h1 className="font-display text-xl sm:text-2xl text-ink break-words">
          {group.name}
        </h1>

        {group.description && (
          <p className="text-xs text-ink-muted">{group.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="bg-surface/40 px-2.5 py-1.5 rounded-lg text-ink-muted">
            👥 {groupStats.studentsCount} ta talaba
          </span>
          <span className="bg-surface/40 px-2.5 py-1.5 rounded-lg text-ink-muted">
            ✅ {groupStats.activeCount} ta faol
          </span>
          <span className="bg-surface/40 px-2.5 py-1.5 rounded-lg text-ink-muted">
            📚 {assignments?.length ?? group._count?.assignments ?? 0} ta material
          </span>
        </div>
      </div>

      {/* ============ STATS ============ */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-surface/20 p-4 rounded-3xl border border-white/5">
          <span className="text-[10px] text-ink-muted uppercase tracking-wider block">
            O'rtacha ball
          </span>
          <p className="text-2xl font-display text-gold mt-1 tabular-nums">
            {groupStats.avg}
          </p>
        </div>
        <div className="bg-surface/20 p-4 rounded-3xl border border-white/5">
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
        {(
          [
            { key: 'students', label: 'Talabalar', icon: '👥' },
            { key: 'materials', label: 'Materiallar', icon: '📚' },
            { key: 'edit', label: 'Tahrirlash', icon: '✏️' },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              haptic('light');
              setActiveTab(t.key);
            }}
            className={`shrink-0 px-3.5 py-2.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 min-h-[40px] ${
              activeTab === t.key
                ? 'bg-gold text-base'
                : 'bg-white/5 text-ink-muted hover:bg-white/10'
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
            {t.key === 'students' && (
              <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded-full">
                {groupStats.studentsCount}
              </span>
            )}
            {t.key === 'materials' && (
              <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded-full">
                {assignments?.length ?? 0}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ============ TAB: STUDENTS ============ */}
      {activeTab === 'students' && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-muted">
              Guruh a'zolari ({groupStats.studentsCount})
            </h2>
            <button
              type="button"
              onClick={() => {
                haptic('light');
                setIsAddModalOpen(true);
              }}
              className="text-xs bg-gold text-base px-3.5 py-2 rounded-xl font-semibold active:scale-[0.98] transition-transform"
            >
              + Talaba qo'shish
            </button>
          </div>

          {members.length === 0 ? (
            <div className="text-center py-12 bg-surface/20 rounded-3xl border border-white/5">
              <p className="text-xs text-ink-muted">
                Bu guruhda hozircha talabalar yo'q.
              </p>
            </div>
          ) : (
            <div className="bg-surface/20 rounded-3xl border border-white/5 divide-y divide-white/5 overflow-hidden">
              {members.map((m) => {
                const s = m.student;
                const fullName =
                  `${s?.firstName || ''} ${s?.lastName || ''}`.trim() ||
                  s?.username ||
                  "Noma'lum";
                const initial = fullName[0]?.toUpperCase() || 'T';
                const status = s?.status || 'ACTIVE';
                const statusColor =
                  status === 'ACTIVE'
                    ? 'bg-teal/15 text-teal'
                    : status === 'BLOCKED'
                    ? 'bg-red-500/15 text-red-400'
                    : 'bg-gold/15 text-gold';

                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 p-3.5 hover:bg-white/[0.02] transition-colors"
                  >
                    <div
                      onClick={() => {
                        haptic('light');
                        navigate(
                          `/teacher/groups/${groupId}/students/${s.id}`,
                        );
                      }}
                      className="w-10 h-10 rounded-2xl bg-gold/10 text-gold flex items-center justify-center font-display text-base shrink-0 cursor-pointer"
                    >
                      {initial}
                    </div>

                    <div
                      onClick={() => {
                        haptic('light');
                        navigate(
                          `/teacher/groups/${groupId}/students/${s.id}`,
                        );
                      }}
                      className="flex-1 min-w-0 cursor-pointer"
                    >
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
                        {s?.username ? `@${s.username}` : `ID: ${s?.id}`}
                        {s?.studentProfile && (
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

                    <button
                      type="button"
                      onClick={() => handleRemove(s.id, fullName)}
                      disabled={removeStudent.isPending}
                      className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-xl font-semibold active:scale-[0.98] transition-transform disabled:opacity-50 shrink-0"
                    >
                      ✕
                    </button>
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
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-muted">
              Materiallar ({assignments?.length ?? 0})
            </h2>
            <button
              type="button"
              onClick={() => {
                haptic('light');
                navigate(`/teacher/content/courses`);
              }}
              className="text-xs bg-gold text-base px-3.5 py-2 rounded-xl font-semibold active:scale-[0.98] transition-transform"
            >
              + Material qo'shish
            </button>
          </div>

          {assignmentsLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-20 bg-surface/20 rounded-3xl animate-pulse border border-white/5"
                />
              ))}
            </div>
          ) : !assignments || assignments.length === 0 ? (
            <div className="text-center py-12 bg-surface/20 rounded-3xl border border-white/5 space-y-3">
              <p className="text-xs text-ink-muted">
                Bu guruhga hali material biriktirilmagan
              </p>
              <button
                type="button"
                onClick={() => {
                  haptic('light');
                  navigate('/teacher/content/courses');
                }}
                className="text-xs font-semibold text-gold bg-gold/10 px-4 py-2.5 rounded-2xl active:scale-[0.98] transition-transform"
              >
                + Birinchi materialni qo'shish
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map((a) => {
                const cat = CATEGORY_META[a.category] ?? CATEGORY_META.LESSON;
                const content = CONTENT_META[a.type] ?? CONTENT_META.TEXT;

                return (
                  <div
                    key={a.id}
                    className="bg-surface/20 hover:bg-surface/40 p-4 rounded-3xl border border-white/5 transition-all"
                  >
                    <div
                      onClick={() => {
                        haptic('light');
                        navigate(`/teacher/assignments/${a.id}`);
                      }}
                      className="space-y-2 cursor-pointer"
                    >
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

                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                      <button
                        type="button"
                        onClick={() => {
                          haptic('light');
                          navigate(`/teacher/assignments/${a.id}`);
                        }}
                        className="flex-1 text-xs font-semibold text-gold bg-gold/10 px-3 py-2.5 rounded-xl active:scale-[0.98] transition-transform min-h-[40px]"
                      >
                        Ochish →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ============ TAB: EDIT ============ */}
      {activeTab === 'edit' && (
        <section className="space-y-4">
          <div className="bg-surface/30 p-5 rounded-3xl border border-white/5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-ink-muted font-medium">
                Guruh nomi *
              </label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={100}
                className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink focus:border-gold/50 min-h-[44px]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-ink-muted font-medium">
                Tavsif
              </label>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                maxLength={500}
                rows={3}
                className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink resize-none focus:border-gold/50"
              />
            </div>

            <button
              type="button"
              onClick={handleUpdate}
              disabled={updateGroup.isPending}
              className="w-full py-3.5 rounded-2xl bg-gold text-base font-semibold text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              {updateGroup.isPending
                ? 'Saqlanmoqda...'
                : "O'zgarishlarni saqlash"}
            </button>
          </div>
        </section>
      )}

      {/* ============ MODAL: Add student ============ */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-50"
          onClick={() => {
            haptic('light');
            setIsAddModalOpen(false);
            setSearchQuery('');
            setSelectedStudentId('');
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-surface border border-white/10 rounded-3xl p-5 w-full max-w-md space-y-4 shadow-2xl max-h-[85vh] flex flex-col"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-ink">
                Guruhga talaba qo'shish
              </h3>
              <button
                type="button"
                onClick={() => {
                  haptic('light');
                  setIsAddModalOpen(false);
                  setSearchQuery('');
                  setSelectedStudentId('');
                }}
                className="text-ink-muted hover:text-ink text-sm p-2 rounded-xl bg-white/5 min-h-[40px]"
              >
                ✕
              </button>
            </div>

            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Talabani qidirish..."
              className="w-full bg-surface/50 rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink min-h-[44px]"
            />

            <div className="flex-1 overflow-y-auto space-y-2">
              {filteredStudents.length === 0 ? (
                <p className="text-xs text-ink-muted text-center py-6">
                  {allStudents.length === 0
                    ? "Talabalar ro'yxati yuklanmoqda..."
                    : "Talaba topilmadi"}
                </p>
              ) : (
                filteredStudents.map((s) => {
                  const isSelected = selectedStudentId === s.id;
                  const fullName =
                    `${s.firstName || ''} ${s.lastName || ''}`.trim() ||
                    'Talaba';
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        haptic('light');
                        setSelectedStudentId(s.id);
                      }}
                      className={`w-full text-left p-3 rounded-2xl border transition-colors ${
                        isSelected
                          ? 'bg-gold/10 border-gold/40'
                          : 'bg-surface/50 border-white/5 hover:bg-white/[0.05]'
                      }`}
                    >
                      <p className="text-sm font-medium text-ink">{fullName}</p>
                      <p className="text-xs text-ink-muted">
                        {s.username ? `@${s.username}` : s.id}
                      </p>
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  haptic('light');
                  setIsAddModalOpen(false);
                  setSearchQuery('');
                  setSelectedStudentId('');
                }}
                className="flex-1 py-3 rounded-2xl bg-white/5 text-ink-muted text-sm font-semibold active:scale-[0.98] transition-transform"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={handleAddSubmit}
                disabled={addStudent.isPending || !selectedStudentId}
                className="flex-1 py-3 rounded-2xl bg-gold text-base text-sm font-semibold active:scale-[0.98] transition-transform disabled:opacity-50"
              >
                {addStudent.isPending ? "Qo'shilmoqda..." : "Qo'shish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeacherGroupDetail;