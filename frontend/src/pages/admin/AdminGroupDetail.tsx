// src/pages/admin/AdminGroupDetail.tsx
import { ScheduleBadge } from '../../components/group/ScheduleBadge';
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
import { CapacityBar } from '../../components/group/CapacityBar';
import { TelegramLinkButton } from '../../components/group/TelegramLinkButton';
import { GroupSettingsForm } from '../../components/group/GroupSettingsForm';
import { AttendancePanel } from '../../components/group/AttendancePanel';
import { StaffHero, Panel, KpiCard, Avatar } from '../../components/staff';
import { EmptyState, Skeleton } from '../../components/ui';
import { IMAGES } from '../../design/images';
import { PAGE_WIDE, CONTROL } from '../../design/tokens';
import { ArrowLeft, Users, Calendar, GraduationCap, Plus, X, ClipboardCheck, ShieldCheck } from '../../design/icons';


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
      <div className={PAGE_WIDE}>
        <Skeleton className="h-44 rounded-3xl" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-40 rounded-3xl" />
      </div>
    );
  }

  const posterFullUrl = group.posterUrl ? getFullUrl(group.posterUrl) : null;
  const teacherName = group.teacher
    ? `${group.teacher.firstName || ''} ${group.teacher.lastName || ''}`.trim() ||
      group.teacher.username
    : null;
  const memberCount = Array.isArray(groupStudents) ? groupStudents.length : 0;

  return (
    <div className={PAGE_WIDE}>
      {/* ============ HERO ============ */}
      <StaffHero
        accent="sky"
        image={posterFullUrl || IMAGES.hero}
        eyebrow="Guruh"
        title={group.name}
        subtitle={group.description || undefined}
        top={
          <button
            type="button"
            onClick={() => {
              haptic('light');
              navigate('/admin/groups');
            }}
            className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink bg-white/5 px-3 py-2 rounded-xl border border-white/10 min-h-[36px] transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Orqaga
          </button>
        }
        footer={
          <div className="space-y-3 pt-1">
            <ScheduleBadge schedule={group} className="text-xs" />
            <CapacityBar count={memberCount} max={group.maxCapacity} />
            <TelegramLinkButton url={group.telegramChatUrl} />
          </div>
        }
      />

      {/* ============ KPI ============ */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KpiCard label="Talabalar" value={memberCount} icon={Users} accent="teal" hint={group.maxCapacity ? `sig'im: ${group.maxCapacity}` : 'guruh a\'zolari'} />
        <KpiCard label="Asosiy ustoz" value={teacherName || '—'} icon={ShieldCheck} accent="gold" hint={teacherName ? 'biriktirilgan' : 'biriktirilmagan'} />
        <KpiCard
          label="Yaratilgan"
          value={group.createdAt ? new Date(group.createdAt).toLocaleDateString('uz-UZ') : '—'}
          icon={Calendar}
          accent="sky"
        />
      </div>

      <GroupSettingsForm
        key={`${group.maxCapacity ?? ''}|${group.telegramChatUrl ?? ''}|${(group.lessonDays ?? []).join('')}|${group.lessonStartTime ?? ''}|${group.lessonEndTime ?? ''}|${group.room ?? ''}`}
        groupId={id}
        maxCapacity={group.maxCapacity}
        telegramChatUrl={group.telegramChatUrl}
        schedule={group}
        memberCount={memberCount}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ============ TEACHER ASSIGN ============ */}
        <form onSubmit={handleAssignTeacher}>
          <Panel title="Asosiy ustoz" icon={ShieldCheck} accent="gold" className="h-full">
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                disabled={teachersLoading}
                className={`${CONTROL.select} flex-1 disabled:opacity-50`}
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
                className={`${CONTROL.buttonPrimary} shrink-0 disabled:opacity-50`}
              >
                {assignTeacher.isPending ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </div>

            {!teacherName && (
              <p className="mt-2 text-[11px] text-ink-muted">Hozircha ustoz biriktirilmagan</p>
            )}
          </Panel>
        </form>

        {/* ============ ADD STUDENT ============ */}
        <form onSubmit={handleAddStudent}>
          <Panel title="Guruhga talaba qo'shish" icon={Plus} accent="teal" className="h-full">
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className={`${CONTROL.select} flex-1`}
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
                className={`${CONTROL.buttonPrimary} shrink-0 disabled:opacity-50`}
              >
                {addStudent.isPending ? "Qo'shilmoqda..." : "Qo'shish"}
              </button>
            </div>
          </Panel>
        </form>
      </div>

      {/* ============ DAVOMAT ============ */}
      <Panel title="Davomat" icon={ClipboardCheck} accent="sky">
        <AttendancePanel groupId={id} />
      </Panel>

      {/* ============ STUDENTS LIST ============ */}
      <Panel
        title="Guruhdagi talabalar"
        icon={GraduationCap}
        accent="teal"
        flush
        action={
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-ink-muted">
            Jami: {memberCount} ta
          </span>
        }
      >
        {studentsLoading ? (
          <div className="space-y-2 px-5 pb-5">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : !groupStudents || groupStudents.length === 0 ? (
          <EmptyState icon={Users} title="Bu guruhda hali talabalar mavjud emas." />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-white/5">
            {groupStudents.map((m: any) => {
              const s = m?.student || m?.user || m;
              const fullName =
                `${s?.firstName || ''} ${s?.lastName || ''}`.trim() ||
                s?.username ||
                "Noma'lum talaba";
              const targetId = s?.id || s?._id || m?.studentId;

              return (
                <div
                  key={m.id || targetId}
                  className="flex items-center gap-3 bg-surface/60 p-3.5 hover:bg-surface/90 transition-colors"
                >
                  <Avatar name={fullName} />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{fullName}</p>
                    <p className="text-xs text-ink-muted truncate">
                      {s?.username ? `@${s.username}` : targetId ? `ID: ${targetId}` : ''}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveStudent(targetId, fullName)}
                    disabled={removeStudent.isPending}
                    aria-label="Guruhdan chiqarish"
                    className="flex h-9 w-9 items-center justify-center text-coral bg-coral/10 rounded-xl active:scale-[0.98] transition-transform disabled:opacity-50 shrink-0"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}

export default AdminGroupDetail;
