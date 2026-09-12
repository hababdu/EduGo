import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useGroup,
  useGroupMembers,
  useAddStudentToGroup,
  useRemoveStudentFromGroup,
} from '../../hooks/useGroups';
import { useAdminStudents } from '../../hooks/useAdmin';
import { useTelegram } from '../../hooks/useTelegram';
import { toast } from '../../components/ui/Toast';

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

  const { data: group, isLoading: groupLoading, error: groupError } = useGroup(groupId);
  const { data: members, isLoading: membersLoading, refetch: refetchMembers } =
    useGroupMembers(groupId);
  const { mutate: removeStudent, isPending: isRemoving } = useRemoveStudentFromGroup();
  const { mutate: addStudent, isPending: isAdding } = useAddStudentToGroup();

  const { data: allStudentsData } = useAdminStudents({ page: 1 });
  const studentsList = Array.isArray(allStudentsData)
    ? allStudentsData
    : (allStudentsData as any)?.items ||
      (allStudentsData as any)?.students ||
      (allStudentsData as any)?.data ||
      [];

  const [activeTab, setActiveTab] = useState<'students' | 'lessons'>('students');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  /* ---------- Telegram BackButton ---------- */
  useEffect(() => {
    const handleBack = () => {
      haptic('light');
      navigate('/teacher');
    };
    const cleanup = showBackButton(handleBack);
    return () => {
      cleanup?.();
      hideBackButton();
    };
  }, [showBackButton, hideBackButton, navigate, haptic]);

  /* ---------- Remove student ---------- */
  const handleRemove = async (studentId: string) => {
    if (!studentId) {
      hapticNotify('error');
      toast('error', 'Talaba ID topilmadi');
      return;
    }

    haptic('medium');
    const confirmed = await showConfirm(
      "Haqiqatan ham bu talabani guruhdan chiqarmoqchimisiz?"
    );
    if (!confirmed) return;

    removeStudent(
      { groupId, studentId },
      {
        onSuccess: () => {
          hapticNotify('success');
          toast('success', 'Talaba guruhdan chiqarildi');
          refetchMembers();
        },
        onError: (err: any) => {
          hapticNotify('error');
          toast('error', err?.message || 'Xatolik yuz berdi');
        },
      }
    );
  };

  /* ---------- Add student ---------- */
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;

    haptic('light');
    addStudent(
      { groupId, studentId: selectedStudentId },
      {
        onSuccess: () => {
          hapticNotify('success');
          toast('success', "Talaba guruhga qo'shildi!");
          setSelectedStudentId('');
          setIsAddModalOpen(false);
          refetchMembers();
        },
        onError: (err: any) => {
          hapticNotify('error');
          toast('error', err?.message || "Qo'shishda xatolik");
        },
      }
    );
  };

  /* ---------- Loading / Error ---------- */
  if (!groupId) {
    return (
      <div className="p-6 text-center text-coral">
        Guruh ID topilmadi.
        <button
          onClick={() => navigate('/teacher')}
          className="block mx-auto mt-4 text-xs underline"
        >
          Orqaga qaytish
        </button>
      </div>
    );
  }

  if (groupLoading) {
    return (
      <div className="p-4 max-w-4xl mx-auto space-y-4">
        <div className="h-10 w-24 bg-surface/30 rounded-2xl animate-pulse" />
        <div className="h-40 bg-surface/20 rounded-3xl animate-pulse border border-white/5" />
      </div>
    );
  }

  if (groupError) {
    return (
      <div className="p-6 text-center text-coral bg-surface/20 rounded-3xl border border-white/5 m-6">
        Guruh ma'lumotlarini yuklashda xatolik.
      </div>
    );
  }

  const groupData = group as any;

  /* ---------- Filtered students for modal ---------- */
  const filteredStudents = studentsList.filter((s: any) => {
    const name = `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase();
    const username = (s.username || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return !q || name.includes(q) || username.includes(q);
  });

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto pb-32 space-y-5">
      {/* Header */}
      <div className="bg-surface/20 p-5 rounded-3xl border border-white/5 backdrop-blur-md space-y-4">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              haptic('light');
              navigate('/teacher');
            }}
            className="text-xs text-ink-muted hover:text-ink bg-surface/30 px-3 py-2 rounded-xl border border-white/5 shrink-0 min-h-[40px]"
          >
            ← Orqaga
          </button>
        </div>

        <h1 className="font-display text-xl sm:text-2xl text-ink break-words">
          {groupData?.name || 'Guruh'}
        </h1>

        <p className="text-xs text-ink-muted">
          {groupData?.description || 'Tavsif mavjud emas'}
        </p>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="bg-surface/40 px-2.5 py-1.5 rounded-lg text-ink-muted">
            👥 {Array.isArray(members) ? members.length : 0} ta talaba
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <button
          type="button"
          onClick={() => {
            haptic('light');
            setActiveTab('students');
          }}
          className={`shrink-0 px-3.5 py-2.5 rounded-full text-xs font-semibold transition-colors min-h-[40px] ${
            activeTab === 'students'
              ? 'bg-gold text-base'
              : 'bg-white/5 text-ink-muted hover:bg-white/10'
          }`}
        >
          Talabalar
        </button>
        <button
          type="button"
          onClick={() => {
            haptic('light');
            setActiveTab('lessons');
          }}
          className={`shrink-0 px-3.5 py-2.5 rounded-full text-xs font-semibold transition-colors min-h-[40px] ${
            activeTab === 'lessons'
              ? 'bg-gold text-base'
              : 'bg-white/5 text-ink-muted hover:bg-white/10'
          }`}
        >
          Darslar va Materiallar
        </button>
      </div>

      {/* Students tab */}
      {activeTab === 'students' && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-muted">Guruh a'zolari</h2>
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

          {membersLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-16 bg-surface/30 rounded-2xl animate-pulse border border-white/5"
                />
              ))}
            </div>
          ) : !members || members.length === 0 ? (
            <div className="text-center py-12 bg-surface/20 rounded-3xl border border-white/5">
              <p className="text-xs text-ink-muted">
                Bu guruhda hozircha talabalar yo'q.
              </p>
            </div>
          ) : (
            <div className="bg-surface/20 rounded-3xl border border-white/5 divide-y divide-white/5 overflow-hidden">
              {members.map((m: any) => {
                const studentData = m?.student || m?.user || m;
                const firstName = studentData?.firstName || studentData?.name || '';
                const lastName = studentData?.lastName || '';
                const fullName = `${firstName} ${lastName}`.trim();
                const targetStudentId = studentData?.id || studentData?._id || m?.studentId;

                return (
                  <div
                    key={m.id || targetStudentId}
                    className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
                  >
                    <div
                      onClick={() => {
                        haptic('light');
                        navigate(
                          `/teacher/groups/${groupId}/students/${targetStudentId}`
                        );
                      }}
                      className="flex-1 min-w-0 cursor-pointer"
                    >
                      <p className="text-sm font-medium text-ink truncate">
                        {fullName || studentData?.username || "Noma'lum talaba"}
                      </p>
                      <p className="text-xs text-ink-muted truncate">
                        {studentData?.username
                          ? `@${studentData.username}`
                          : targetStudentId
                          ? `ID: ${targetStudentId}`
                          : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemove(targetStudentId)}
                      disabled={isRemoving}
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

      {/* Lessons tab */}
      {activeTab === 'lessons' && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-muted">Darslar ro'yxati</h2>
            <button
              type="button"
              onClick={() => {
                haptic('light');
                toast('info', 'Tez orada qo\'shiladi');
              }}
              className="text-xs bg-gold text-base px-3.5 py-2 rounded-xl font-semibold active:scale-[0.98] transition-transform"
            >
              + Dars qo'shish
            </button>
          </div>

          <div className="text-center py-12 bg-surface/20 rounded-3xl border border-white/5">
            <p className="text-xs text-ink-muted">
              Hozircha bu guruhga darslar kiritilmagan.
            </p>
          </div>
        </section>
      )}

      {/* Add student modal */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-50"
          onClick={() => setIsAddModalOpen(false)}
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
                }}
                className="text-ink-muted hover:text-ink text-sm p-2 rounded-xl bg-white/5"
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
                  Talaba topilmadi
                </p>
              ) : (
                filteredStudents.map((s: any) => {
                  const sId = s.id || s._id || s.studentId;
                  const isSelected = selectedStudentId === sId;
                  return (
                    <button
                      key={sId}
                      type="button"
                      onClick={() => {
                        haptic('light');
                        setSelectedStudentId(sId);
                      }}
                      className={`w-full text-left p-3 rounded-2xl border transition-colors ${
                        isSelected
                          ? 'bg-gold/10 border-gold/40'
                          : 'bg-surface/50 border-white/5 hover:bg-white/[0.05]'
                      }`}
                    >
                      <p className="text-sm font-medium text-ink">
                        {s.firstName || 'Talaba'} {s.lastName || ''}
                      </p>
                      <p className="text-xs text-ink-muted">
                        {s.username ? `@${s.username}` : sId}
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
                }}
                className="flex-1 py-3 rounded-2xl bg-white/5 text-ink-muted text-sm font-semibold active:scale-[0.98] transition-transform"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={handleAddSubmit as any}
                disabled={isAdding || !selectedStudentId}
                className="flex-1 py-3 rounded-2xl bg-gold text-base text-sm font-semibold active:scale-[0.98] transition-transform disabled:opacity-50"
              >
                {isAdding ? "Qo'shilmoqda..." : "Qo'shish"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeacherGroupDetail;