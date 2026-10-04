// src/pages/teacher/TeacherStudentDetail.tsx
import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api-client';
import { useRemoveStudentFromGroup } from '../../hooks/useGroups';
import { useTelegram } from '../../hooks/useTelegram';
import { toast } from '../../components/ui/Toast';
import { Skeleton } from '../../components/ui';
import { StaffHero, Panel, Avatar } from '../../components/staff';
import { BackButton } from '../../components/teacher/BackButton';
import { IMAGES } from '../../design/images';
import { AlertTriangle, Trash2 } from '../../design/icons';
import { User } from 'lucide-react';
import { TEXT, CONTROL, PAGE_WIDE } from '../../design/tokens';

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
      <div className={PAGE_WIDE}>
        <Skeleton className="h-40 rounded-3xl" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  const fullName = `${student?.firstName || ''} ${student?.lastName || ''}`.trim();

  return (
    <div className={PAGE_WIDE}>
      <StaffHero
        accent="gold"
        image={IMAGES.hero}
        eyebrow="Talaba profili"
        title={fullName || "Noma'lum talaba"}
        subtitle={`@${student?.username || 'username_yoq'}`}
        top={
          <BackButton
            onClick={() => {
              haptic('light');
              navigate(-1);
            }}
          />
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Panel title="Ma'lumotlar" icon={User} accent="teal" className="lg:col-span-3">
          <div className="flex items-center gap-4">
            <Avatar name={fullName || 'T'} size="lg" src={student?.avatarUrl} />
            <div className="min-w-0">
              <h2 className="font-display text-lg text-ink truncate">
                {fullName || "Noma'lum talaba"}
              </h2>
              <p className={TEXT.bodySm}>@{student?.username || 'username_yoq'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4 mt-4 border-t border-white/5">
            <div className="bg-surface/50 border border-white/10 rounded-2xl p-3">
              <span className={TEXT.tiny + ' block mb-1'}>Rol</span>
              <span className="text-sm font-medium text-ink">
                {student?.role || 'STUDENT'}
              </span>
            </div>
            <div className="bg-surface/50 border border-white/10 rounded-2xl p-3">
              <span className={TEXT.tiny + ' block mb-1'}>Telefon</span>
              <span className="text-sm font-medium text-ink truncate block">
                {student?.phone || '—'}
              </span>
            </div>
          </div>
        </Panel>

        <Panel title="Xavfli zona" icon={AlertTriangle} accent="coral" className="lg:col-span-2">
          <div className="bg-coral/5 border border-coral/20 rounded-2xl p-4 space-y-3">
            <p className={TEXT.bodySm + ' leading-relaxed'}>
              Talabani guruhdan chiqarish uning darslar va vazifalarga kirishini
              yopadi.
            </p>
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
        </Panel>
      </div>
    </div>
  );
}

export default TeacherStudentDetail;