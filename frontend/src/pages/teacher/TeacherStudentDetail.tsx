import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api-client';
import { useRemoveStudentFromGroup } from '../../hooks/useGroups';
import { useTelegram } from '../../hooks/useTelegram';
import { toast } from '../../components/ui/Toast';

export function TeacherStudentDetail() {
  const { groupId, studentId } = useParams<{
    groupId: string;
    studentId: string;
  }>();
  const navigate = useNavigate();

  const {
    haptic,
    hapticNotify,
    showConfirm,
    showBackButton,
    hideBackButton,
  } = useTelegram();

  const { mutate: removeStudent, isPending: isRemoving } =
    useRemoveStudentFromGroup();

  const { data: student, isLoading } = useQuery({
    queryKey: ['student-detail', studentId],
    queryFn: () => apiFetch<any>(`/api/v1/users/${studentId}`),
    enabled: !!studentId,
  });

  /* ---------- BackButton ---------- */
  useEffect(() => {
    const handleBack = () => {
      haptic('light');
      navigate(-1);
    };
    const cleanup = showBackButton(handleBack);
    return () => {
      cleanup?.();
      hideBackButton();
    };
  }, [showBackButton, hideBackButton, navigate, haptic]);

  /* ---------- Remove handler ---------- */
  const handleRemoveFromGroup = async () => {
    if (!groupId || !studentId) return;

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
          navigate(`/teacher/groups/${groupId}`);
        },
        onError: (err: any) => {
          hapticNotify('error');
          toast('error', err?.message || 'Xatolik yuz berdi');
        },
      }
    );
  };

  /* ---------- Loading ---------- */
  if (isLoading) {
    return (
      <div className="p-4 max-w-2xl mx-auto space-y-4">
        <div className="h-10 w-24 bg-surface/30 rounded-2xl animate-pulse" />
        <div className="h-40 bg-surface/20 rounded-3xl animate-pulse border border-white/5" />
      </div>
    );
  }

  const fullName = `${student?.firstName || ''} ${student?.lastName || ''}`.trim();

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto pb-32 space-y-5">
      {/* Back button */}
      <button
        type="button"
        onClick={() => {
          haptic('light');
          navigate(-1);
        }}
        className="text-xs text-ink-muted hover:text-ink bg-surface/30 px-3 py-2 rounded-xl border border-white/5 w-fit min-h-[40px]"
      >
        ← Orqaga
      </button>

      {/* Profile card */}
      <div className="bg-surface/20 p-5 rounded-3xl border border-white/5 space-y-4 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-3xl bg-gold/10 text-gold flex items-center justify-center font-display text-2xl shrink-0">
            {fullName ? fullName[0].toUpperCase() : 'T'}
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-xl text-ink truncate">
              {fullName || "Noma'lum talaba"}
            </h1>
            <p className="text-xs text-ink-muted truncate">
              @{student?.username || 'username_yoq'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
          <div className="bg-surface/40 p-3 rounded-2xl">
            <span className="text-[10px] text-ink-muted uppercase tracking-wider block mb-1">
              Rol
            </span>
            <span className="text-sm font-medium text-ink">
              {student?.role || 'STUDENT'}
            </span>
          </div>
          <div className="bg-surface/40 p-3 rounded-2xl">
            <span className="text-[10px] text-ink-muted uppercase tracking-wider block mb-1">
              Telefon
            </span>
            <span className="text-sm font-medium text-ink">
              {student?.phone || 'Kiritilmagan'}
            </span>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-red-500/5 p-5 rounded-3xl border border-red-500/20 space-y-3">
        <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2">
          ⚠️ Xavfli zona
        </h3>
        <p className="text-xs text-ink-muted leading-relaxed">
          Talabani ushbu guruhdan chetlashtirish uning guruhdagi darslar va
          vazifalarga bo'lgan kirishini yopadi.
        </p>
        <button
          type="button"
          onClick={handleRemoveFromGroup}
          disabled={isRemoving}
          className="w-full py-3.5 rounded-2xl bg-red-500/20 text-red-400 font-semibold text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
        >
          {isRemoving ? 'Chiqarilmoqda...' : 'Guruhdan chiqarish'}
        </button>
      </div>
    </div>
  );
}

export default TeacherStudentDetail;