// src/pages/teacher/TeacherStudentDetail.tsx
import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api-client';
import { useRemoveStudentFromGroup } from '../../hooks/useGroups';
import { useTelegram } from '../../hooks/useTelegram';
import { toast } from '../../components/ui/Toast';
import { PageHeader, Section, Skeleton } from '../../components/ui';
import { AlertTriangle, Trash2,  } from '../../design/icons';
import { TEXT, CONTROL, PAGE_NARROW } from '../../design/tokens';

export function TeacherStudentDetail() {
  const { groupId, studentId } = useParams<{ groupId: string; studentId: string }>();
  const navigate = useNavigate();
  const { haptic, hapticNotify, showConfirm, showBackButton, hideBackButton } =
    useTelegram();

  const { mutate: removeStudent, isPending } = useRemoveStudentFromGroup();

  const { data: student, isLoading } = useQuery({
    queryKey: ['student-detail', studentId],
    queryFn: () => apiFetch<any>(`/api/v1/users/${studentId}`),
    enabled: !!studentId,
  });

  useEffect(() => {
    const cleanup = showBackButton(() => {
      haptic('light');
      navigate(-1);
    });
    return () => {
      cleanup?.();
      hideBackButton();
    };
  }, [showBackButton, hideBackButton, navigate, haptic]);

  const handleRemove = async () => {
    if (!groupId || !studentId) return;
    haptic('medium');
    const ok = await showConfirm("Talabani guruhdan chiqarishni tasdiqlaysizmi?");
    if (!ok) return;

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
          toast('error', err?.message || 'Xatolik');
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className={PAGE_NARROW}>
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  const fullName = `${student?.firstName || ''} ${student?.lastName || ''}`.trim();
  const initial = fullName ? fullName[0].toUpperCase() : 'T';

  return (
    <div className={PAGE_NARROW}>
      <PageHeader
        title="Talaba profili"
        onBack={() => {
          haptic('light');
          navigate(-1);
        }}
      />

      {/* Profile */}
      <div className="bg-surface/20 border border-white/5 rounded-2xl p-5 space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gold/10 text-gold flex items-center justify-center font-display text-2xl shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-lg text-ink truncate">
              {fullName || "Noma'lum talaba"}
            </h2>
            <p className={TEXT.bodySm}>@{student?.username || 'username_yoq'}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
          <div className="bg-surface/40 rounded-xl p-3">
            <span className={TEXT.tiny + ' block mb-1'}>Rol</span>
            <span className="text-sm font-medium text-ink">
              {student?.role || 'STUDENT'}
            </span>
          </div>
          <div className="bg-surface/40 rounded-xl p-3">
            <span className={TEXT.tiny + ' block mb-1'}>Telefon</span>
            <span className="text-sm font-medium text-ink truncate">
              {student?.phone || '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Danger */}
      <Section title="Xavfli zona">
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className={TEXT.bodySm + ' leading-relaxed'}>
              Talabani guruhdan chiqarish uning darslar va vazifalarga kirishini
              yopadi.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            disabled={isPending}
            className={CONTROL.buttonDanger + ' w-full disabled:opacity-50'}
          >
            <Trash2 className="w-4 h-4" />
            {isPending ? 'Chiqarilmoqda...' : 'Guruhdan chiqarish'}
          </button>
        </div>
      </Section>
    </div>
  );
}

export default TeacherStudentDetail;