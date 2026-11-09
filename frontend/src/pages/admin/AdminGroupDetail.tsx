// src/pages/admin/AdminGroupDetail.tsx
import { ScheduleBadge } from '../../components/group/ScheduleBadge';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api-client';
import { getFullUrl } from '../../hooks/useImageUpload';
import {
  useAddStudentToGroup,
  useAddStudentsToGroup,
  useRemoveStudentFromGroup,
  useAssignGroupTeacher,
  useTeachersList,
} from '../../hooks/useGroups';
import { useTelegram } from '../../hooks/useTelegram';
import { toast } from '../../components/ui/Toast';
import { CapacityBar } from '../../components/group/CapacityBar';
import { TelegramLinkButton } from '../../components/group/TelegramLinkButton';
import { GroupSettingsForm } from '../../components/group/GroupSettingsForm';
import { LessonLogPanel } from '../../components/group/LessonLogPanel';
import { AttendancePanel } from '../../components/group/AttendancePanel';
import { StaffHero, Panel, KpiCard, Avatar } from '../../components/staff';
import { EmptyState, Skeleton } from '../../components/ui';
import { IMAGES } from '../../design/images';
import { PAGE_WIDE, CONTROL } from '../../design/tokens';
import { ArrowLeft, Users, Calendar, GraduationCap, Plus, X, Search, ClipboardCheck, ShieldCheck, Wallet } from '../../design/icons';


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
  const [studentSearch, setStudentSearch] = useState('');
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const { data: availableStudentsData, isLoading: availableStudentsLoading, isFetching: availableStudentsFetching, error: availableStudentsError, refetch: refetchAvailableStudents } = useQuery({
    queryKey: ['group-available-students', id, studentSearch.trim()],
    queryFn: () => apiFetch<{ items: any[]; total: number }>(`/api/v1/groups/${id}/available-students${studentSearch.trim() ? `?search=${encodeURIComponent(studentSearch.trim())}` : ''}`),
    enabled: !!id && showStudentPicker,
    staleTime: 15_000,
  });
  const availableStudents = availableStudentsData?.items ?? [];

  /* ---------- Teachers list ---------- */
  const { data: teachers, isLoading: teachersLoading } = useTeachersList();

  /* ---------- Mutations ---------- */
  const addStudent = useAddStudentToGroup();
  const addStudentsBulk = useAddStudentsToGroup();
  const removeStudent = useRemoveStudentFromGroup();
  const assignTeacher = useAssignGroupTeacher();

  /* ---------- Local state ---------- */
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
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
      navigate('/admin/school?tab=groups');
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
          setStudentSearch('');
          refetchAvailableStudents();
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

  /* ---------- Handle: Bulk add students ---------- */
  const handleBulkAddStudents = () => {
    if (!selectedStudentIds.length) return;
    haptic('light');
    addStudentsBulk.mutate(
      { groupId: id, studentIds: selectedStudentIds },
      {
        onSuccess: (result) => {
          hapticNotify(result.addedCount > 0 ? 'success' : 'error');
          if (result.skippedCount === 0) {
            toast('success', `${result.addedCount} ta talaba guruhga qo'shildi!`);
          } else {
            toast('info', `${result.addedCount} ta qo'shildi, ${result.skippedCount} ta o'tkazib yuborildi.`);
          }
          setSelectedStudentIds([]);
          setSelectedStudentId('');
          setStudentSearch('');
          refetchAvailableStudents();
          refetchStudents();
          refetchGroup();
          if (result.skippedCount > 0) {
            console.warn('Guruhga qo‘shilmagan talabalar:', result.skipped);
          }
        },
        onError: (err: any) => {
          hapticNotify('error');
          toast('error', err?.response?.data?.message || err?.message || "Ommaviy qo'shishda xatolik");
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
              navigate('/admin/school?tab=groups');
            }}
            className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink bg-tint/5 px-3 py-2 rounded-xl border border-tint/10 min-h-[36px] transition"
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
            <button
              type="button"
              onClick={() => navigate(`/admin/payments/${id}`)}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-gold/20 bg-gold/10 px-4 text-xs font-semibold text-gold transition active:scale-95"
            >
              <Wallet className="h-4 w-4" aria-hidden="true" /> To'lovlar
            </button>
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
        key={`${group.monthlyFee ?? ''}|${group.maxCapacity ?? ''}|${group.telegramChatUrl ?? ''}|${(group.lessonDays ?? []).join('')}|${group.lessonStartTime ?? ''}|${group.lessonEndTime ?? ''}|${group.room ?? ''}`}
        groupId={id}
        maxCapacity={group.maxCapacity}
        telegramChatUrl={group.telegramChatUrl}
        schedule={group}
        canEditFee
        monthlyFee={group.monthlyFee}
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
        <Panel title="Guruhga talaba qo'shish" icon={Plus} accent="teal" className="h-full">
          <div className="space-y-3">
            <p className="text-xs text-ink-muted">Faqat ushbu maktabga faol a'zo bo'lgan va hali guruhga kiritilmagan talabalar ko'rsatiladi.</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                <input value={studentSearch} onChange={e => { setStudentSearch(e.target.value); setSelectedStudentId(''); setShowStudentPicker(true); }} onFocus={() => setShowStudentPicker(true)} placeholder="Ism, familiya yoki username bo'yicha qidirish" className={`${CONTROL.input} w-full pl-9`} aria-label="Talabalarni qidirish" />
              </div>
              <button type="button" onClick={() => { setShowStudentPicker(true); refetchAvailableStudents(); }} className={`${CONTROL.buttonGhost} shrink-0`}>Yangilash</button>
            </div>
            {showStudentPicker && <div className="max-h-72 space-y-1 overflow-y-auto rounded-xl border border-tint/10 bg-surface/40 p-2">
              {availableStudentsLoading || availableStudentsFetching ? <p className="p-3 text-xs text-ink-muted">Talabalar yuklanmoqda...</p>
                : availableStudentsError ? <div className="p-3 text-xs text-coral">Ro'yxatni yuklab bo'lmadi. <button type="button" onClick={() => refetchAvailableStudents()} className="underline">Qayta urinish</button></div>
                : availableStudents.length === 0 ? <p className="p-3 text-xs text-ink-muted">{studentSearch.trim() ? "Qidiruv bo'yicha talaba topilmadi." : "Bu maktabda guruhga qo'shish mumkin bo'lgan talabalar yo'q."}</p>
                : <>
                  <div className="flex items-center justify-between gap-2 border-b border-tint/10 px-2 pb-2">
                    <span className="text-xs text-ink-muted">{availableStudents.length} ta natija</span>
                    <button type="button" onClick={() => {
                      const visibleIds = availableStudents.map((student: any) => student.id);
                      const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((studentId: string) => selectedStudentIds.includes(studentId));
                      setSelectedStudentIds(allVisibleSelected ? selectedStudentIds.filter(studentId => !visibleIds.includes(studentId)) : [...new Set([...selectedStudentIds, ...visibleIds])]);
                    }} className="text-xs font-semibold text-accent">
                      {availableStudents.length > 0 && availableStudents.every((student: any) => selectedStudentIds.includes(student.id)) ? 'Tanlovni bekor qilish' : 'Barchasini tanlash'}
                    </button>
                  </div>
                  {availableStudents.map((student: any) => <label key={student.id} className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-surface/80">
                    <input type="checkbox" checked={selectedStudentIds.includes(student.id)} onChange={e => setSelectedStudentIds(current => e.target.checked ? [...current, student.id] : current.filter(studentId => studentId !== student.id))} className="h-4 w-4 rounded accent-current" />
                    <Avatar name={`${student.firstName} ${student.lastName || ''}`} />
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-ink">{student.firstName} {student.lastName || ''}</p><p className="truncate text-xs text-ink-muted">{student.username ? `@${student.username}` : student.phone || 'EduGo talabasi'}</p></div>
                    {selectedStudentIds.includes(student.id) && <span className="text-xs font-semibold text-teal">Tanlandi</span>}
                  </label>)}
                  {availableStudentsData && availableStudentsData.total > availableStudents.length && <p className="p-2 text-center text-[11px] text-ink-muted">Birinchi {availableStudents.length} / {availableStudentsData.total} ta natija. Aniqroq qidiruv kiriting.</p>}
                </>
              }
            </div>}
            <div className="flex flex-col gap-2 border-t border-tint/10 pt-3">
              <div className="flex items-center justify-between text-xs"><span className="text-ink-muted">Tanlangan talabalar</span><strong className="text-ink">{selectedStudentIds.length} ta</strong></div>
              <button type="button" onClick={handleBulkAddStudents} disabled={addStudentsBulk.isPending || selectedStudentIds.length === 0} className={`${CONTROL.buttonPrimary} w-full justify-center disabled:opacity-50`}>
                {addStudentsBulk.isPending ? "Talabalar qo'shilmoqda..." : `Tanlangan ${selectedStudentIds.length} ta talabani guruhga qo'shish`}
              </button>
            </div>
          </div>
        </Panel>
      </div>

      {/* ============ DAVOMAT ============ */}
      <Panel title="Davomat" icon={ClipboardCheck} accent="sky">
        <>
          <AttendancePanel groupId={id} />
          <LessonLogPanel groupId={id} canEdit />
        </>
      </Panel>

      {/* ============ STUDENTS LIST ============ */}
      <Panel
        title="Guruhdagi talabalar"
        icon={GraduationCap}
        accent="teal"
        flush
        action={
          <span className="rounded-full bg-tint/5 px-2 py-0.5 text-[10px] text-ink-muted">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-tint/5">
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
