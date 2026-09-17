// src/pages/admin/AdminGroupDetail.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api-client';
import { getFullUrl } from '../../hooks/useImageUpload';
import {
  useGroups,
  useAddStudentToGroup,
  useRemoveStudentFromGroup,
  useAssignGroupTeacher,
  useTeachersList,
} from '../../hooks/useGroups';
import { useAdminStudents } from '../../hooks/useAdmin';
import { useTelegram } from '../../hooks/useTelegram';
import { toast } from '../../components/ui/Toast';

/* ============================================================
   COMPONENT
   ============================================================ */
export function AdminGroupDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    haptic,
    hapticNotify,
    showConfirm,
    showBackButton,
    hideBackButton,
  } = useTelegram();

  /* ---------- Group detail ---------- */
  const { data: group, isLoading: groupLoading, refetch: refetchGroup } = useQuery({
    queryKey: ['admin', 'group', id],
    queryFn: () => apiFetch<any>(`/api/v1/groups/${id}`),
    enabled: !!id,
  });

  /* ---------- Group students ---------- */
  const {
    data: groupStudents,
    isLoading: studentsLoading,
    refetch: refetchStudents,
  } = useQuery({
    queryKey: ['group-students', id],
    queryFn: () => apiFetch<any[]>(`/api/v1/groups/${id}/students`),
    enabled: !!id,
  });

  /* ---------- All students (for picker) ---------- */
  const { data: allStudentsData } = useAdminStudents({ page: 1 });
  const allStudents = Array.isArray(allStudentsData)
    ? allStudentsData
    : (allStudentsData as any)?.items ||
      (allStudentsData as any)?.students ||
      (allStudentsData as any)?.data ||
      [];

  /* ---------- Teachers list ---------- */
  const { data: teachers, isLoading: teachersLoading } = useTeachersList();

  /* ---------- Mutations ---------- */
  const addStudent = useAddStudentToGroup();
  const removeStudent = useRemoveStudentFromGroup();
  const assignTeacher = useAssignGroupTeacher();

  /* ---------- Local state ---------- */
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');

  /* ---------- Form state ---------- */
  useEffect(() => {
    if (group?.teacherId) {
      setSelectedTeacherId(group.teacherId);
    } else if (group?.teacher?.id) {
      setSelectedTeacherId(group.teacher.id);
    }
  }, [group]);

  /* ---------- Telegram BackButton ---------- */
  useEffect(() => {
    const cleanup = showBackButton(() => {
      haptic('light');
      navigate('/admin/groups');
    });
    return () => {
      cleanup?.();
      hideBackButton();
    };
  }, [showBackButton, hideBackButton, navigate, haptic]);

  /* ---------- Handle: Add student ---------- */
  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      hapticNotify('error');
      toast('error', 'Talabani tanlang!');
      return;
    }

    haptic('light');
    addStudent.mutate(
      { groupId: id, studentId: selectedStudentId },
      {
        onSuccess: () => {
          hapticNotify('success');
          toast('success', "Talaba guruhga qo'shildi!");
          setSelectedStudentId('');
          refetchStudents();
          refetchGroup();
        },
        onError: (err: any) => {
          hapticNotify('error');
          toast(
            'error',
            err?.response?.data?.message ||
              err?.message ||
              "Qo'shishda xatolik",
          );
        },
      },
    );
  };

  /* ---------- Handle: Remove student ---------- */
  const handleRemoveStudent = async (studentId: string, name: string) => {
    if (!studentId) return;

    haptic('medium');
    const confirmed = await showConfirm(`${name} ni guruhdan chiqarmoqchimisiz?`);
    if (!confirmed) return;

    removeStudent.mutate(
      { groupId: id, studentId },
      {
        onSuccess: () => {
          hapticNotify('success');
          toast('success', 'Talaba chiqarildi');
          refetchStudents();
          refetchGroup();
        },
        onError: (err: any) => {
          hapticNotify('error');
          toast(
            'error',
            err?.response?.data?.message ||
              err?.message ||
              "Chiqarishda xatolik",
          );
        },
      },
    );
  };

  /* ---------- Handle: Assign teacher ---------- */
  const handleAssignTeacher = (e: React.FormEvent) => {
    e.preventDefault();

    haptic('light');
    assignTeacher.mutate(
      { groupId: id, teacherId: selectedTeacherId || null },
      {
        onSuccess: () => {
          hapticNotify('success');
          toast(
            'success',
            selectedTeacherId
              ? 'Ustoz muvaffaqiyatli biriktirildi!'
              : 'Ustoz olib tashlandi',
          );
          refetchGroup();
        },
        onError: (err: any) => {
          hapticNotify('error');
          toast(
            'error',
            err?.response?.data?.message ||
              err?.message ||
              'Biriktirishda xatolik',
          );
        },
      },
    );
  };

  /* ---------- Filter students (exclude existing members) ---------- */
  const existingStudentIds = new Set(
    (groupStudents ?? []).map((m: any) => {
      const s = m?.student || m?.user || m;
      return s?.id || s?._id || m?.studentId;
    }),
  );

  const availableStudents = allStudents.filter(
    (s: any) => !existingStudentIds.has(s.id || s._id || s.studentId),
  );

  /* ---------- Loading ---------- */
  if (groupLoading || !group) {
    return (
      <div className="p-4 max-w-2xl mx-auto space-y-4 pb-24">
        <div className="h-10 w-24 bg-surface/30 rounded-2xl animate-pulse" />
        <div className="h-40 bg-surface/20 rounded-3xl animate-pulse border border-white/5" />
        <div className="h-32 bg-surface/20 rounded-3xl animate-pulse border border-white/5" />
      </div>
    );
  }

  const posterFullUrl = group.posterUrl ? getFullUrl(group.posterUrl) : null;
  const teacherName = group.teacher
    ? `${group.teacher.firstName || ''} ${group.teacher.lastName || ''}`.trim() ||
      group.teacher.username
    : null;

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-5 pb-24">
      {/* ============ BACK BUTTON ============ */}
      <button
        type="button"
        onClick={() => {
          haptic('light');
          navigate('/admin/groups');
        }}
        className="text-xs text-ink-muted hover:text-ink bg-surface/30 px-3 py-2 rounded-xl border border-white/5 w-fit min-h-[40px]"
      >
        ← Orqaga
      </button>

      {/* ============ HEADER — POSTER + INFO ============ */}
      <div className="bg-surface/20 rounded-3xl border border-white/5 overflow-hidden backdrop-blur-md">
        {/* Poster */}
        {posterFullUrl ? (
          <div className="w-full h-48 bg-surface/50 overflow-hidden">
            <img
              src={posterFullUrl}
              alt={group.name}
              className="w-full h-48 object-cover"
            />
          </div>
        ) : (
          <div className="w-full h-32 bg-gradient-to-br from-gold/10 to-teal/10 flex items-center justify-center text-5xl">
            📁
          </div>
        )}

        {/* Info */}
        <div className="p-5 space-y-3">
          <h1 className="font-display text-xl sm:text-2xl text-ink break-words">
            {group.name}
          </h1>

          {group.description && (
            <p className="text-xs text-ink-muted leading-relaxed">
              {group.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="bg-surface/40 px-2.5 py-1.5 rounded-lg text-ink-muted">
              👥 {Array.isArray(groupStudents) ? groupStudents.length : 0} talaba
            </span>
            {teacherName && (
              <span className="bg-surface/40 px-2.5 py-1.5 rounded-lg text-ink-muted">
                👤 {teacherName}
              </span>
            )}
            {group.createdAt && (
              <span className="bg-surface/40 px-2.5 py-1.5 rounded-lg text-ink-muted">
                📅 {new Date(group.createdAt).toLocaleDateString('uz-UZ')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ============ TEACHER ASSIGN ============ */}
      <form
        onSubmit={handleAssignTeacher}
        className="bg-surface/30 p-5 rounded-3xl border border-white/5 space-y-3"
      >
        <h3 className="text-sm font-semibold text-ink">
          👤 Asosiy ustoz
        </h3>

        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={selectedTeacherId}
            onChange={(e) => setSelectedTeacherId(e.target.value)}
            disabled={teachersLoading}
            className="flex-1 bg-surface text-sm rounded-2xl px-4 py-3 outline-none border border-white/5 text-ink min-h-[44px] disabled:opacity-50"
          >
            <option value="">Ustozni tanlang...</option>
            {teachersLoading ? (
              <option>Yuklanmoqda...</option>
            ) : !teachers || teachers.length === 0 ? (
              <option disabled>O'qituvchilar topilmadi</option>
            ) : (
              teachers.map((t: any) => (
                <option key={t.id || t._id} value={t.id || t._id}>
                  {t.firstName} {t.lastName}
                  {t.username ? ` (@${t.username})` : ''}
                </option>
              ))
            )}
          </select>

          <button
            type="submit"
            disabled={assignTeacher.isPending}
            className="bg-gold text-base text-sm font-semibold px-5 py-3 rounded-2xl active:scale-[0.98] transition-transform disabled:opacity-50 min-h-[44px] shrink-0"
          >
            {assignTeacher.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>

        {!teacherName && (
          <p className="text-[10px] text-ink-muted">
            ℹ️ Hozircha ustoz biriktirilmagan
          </p>
        )}
      </form>

      {/* ============ ADD STUDENT ============ */}
      <form
        onSubmit={handleAddStudent}
        className="bg-surface/30 p-5 rounded-3xl border border-white/5 space-y-3"
      >
        <h3 className="text-sm font-semibold text-ink">
          ➕ Guruhga talaba qo'shish
        </h3>

        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="flex-1 bg-surface text-sm rounded-2xl px-4 py-3 outline-none border border-white/5 text-ink min-h-[44px]"
          >
            <option value="">Talabani tanlang...</option>
            {availableStudents.length === 0 ? (
              <option disabled>
                {allStudents.length === 0
                  ? "Talabalar ro'yxati yuklanmoqda..."
                  : "Barcha talabalar qo'shilgan"}
              </option>
            ) : (
              availableStudents.map((s: any) => {
                const sId = s.id || s._id || s.studentId;
                return (
                  <option key={sId} value={sId}>
                    {s.firstName || 'Talaba'} {s.lastName || ''}{' '}
                    {s.username ? `(@${s.username})` : ''}
                  </option>
                );
              })
            )}
          </select>

          <button
            type="submit"
            disabled={addStudent.isPending || !selectedStudentId}
            className="bg-gold text-base text-sm font-semibold px-5 py-3 rounded-2xl active:scale-[0.98] transition-transform disabled:opacity-50 min-h-[44px] shrink-0"
          >
            {addStudent.isPending ? "Qo'shilmoqda..." : "Qo'shish"}
          </button>
        </div>
      </form>

      {/* ============ STUDENTS LIST ============ */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink">
            👥 Guruhdagi talabalar
          </h3>
          <span className="text-xs text-ink-muted">
            Jami: {Array.isArray(groupStudents) ? groupStudents.length : 0} ta
          </span>
        </div>

        {studentsLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-16 bg-surface/30 rounded-2xl animate-pulse border border-white/5"
              />
            ))}
          </div>
        ) : !groupStudents || groupStudents.length === 0 ? (
          <div className="text-center py-10 bg-surface/20 rounded-3xl border border-white/5">
            <p className="text-xs text-ink-muted">
              Bu guruhda hali talabalar mavjud emas.
            </p>
          </div>
        ) : (
          <div className="bg-surface/20 rounded-3xl border border-white/5 divide-y divide-white/5 overflow-hidden">
            {groupStudents.map((m: any) => {
              const s = m?.student || m?.user || m;
              const fullName =
                `${s?.firstName || ''} ${s?.lastName || ''}`.trim() ||
                s?.username ||
                "Noma'lum talaba";
              const initial = fullName[0]?.toUpperCase() || 'T';
              const targetId =
                s?.id || s?._id || m?.studentId;

              return (
                <div
                  key={m.id || targetId}
                  className="flex items-center gap-3 p-3.5 hover:bg-white/[0.02] transition-colors"
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-2xl bg-gold/10 text-gold flex items-center justify-center font-display text-base shrink-0">
                    {initial}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">
                      {fullName}
                    </p>
                    <p className="text-xs text-ink-muted truncate">
                      {s?.username
                        ? `@${s.username}`
                        : targetId
                        ? `ID: ${targetId}`
                        : ''}
                    </p>
                  </div>

                  {/* Remove */}
                  <button
                    type="button"
                    onClick={() => handleRemoveStudent(targetId, fullName)}
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
      </div>
    </div>
  );
}

export default AdminGroupDetail;