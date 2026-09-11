import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api-client';
import { useRemoveStudentFromGroup } from '../../hooks/useGroups';

export function TeacherStudentDetail() {
  const { groupId, studentId } = useParams<{ groupId: string; studentId: string }>();
  const navigate = useNavigate();
  const { mutate: removeStudent, isPending: isRemoving } = useRemoveStudentFromGroup();

  // Talaba ma'lumotlarini olish uchun query (agar alohida endpoint bo'lsa)
  const { data: student, isLoading } = useQuery({
    queryKey: ['student-detail', studentId],
    queryFn: () => apiFetch<any>(`/api/v1/users/${studentId}`),
    enabled: !!studentId,
  });

  const handleRemoveFromGroup = () => {
    if (!groupId || !studentId) return;
    if (confirm("Haqiqatan ham bu talabani guruhdan chiqarmoqchimisiz?")) {
      removeStudent(
        { groupId, studentId },
        {
          onSuccess: () => {
            alert("Talaba guruhdan chiqarib yuborildi.");
            navigate(`/teacher/groups/${groupId}`);
          },
          onError: (err: any) => {
            alert(err?.message || "Xatolik yuz berdi");
          }
        }
      );
    }
  };

  if (isLoading) {
    return <div className="p-6 animate-pulse h-40 bg-surface rounded-2xl m-6 border border-white/5" />;
  }

  const fullName = `${student?.firstName || ''} ${student?.lastName || ''}`.trim();

  return (
    <div className="p-6 max-w-2xl mx-auto pb-16 space-y-6">
      {/* Orqaga qaytish */}
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-ink-muted hover:text-ink transition-colors flex items-center gap-1"
      >
        ← Orqaga
      </button>

      {/* Talaba profili kartasi */}
      <div className="bg-surface p-6 rounded-2xl border border-white/5 shadow-sm space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-display text-xl">
            {fullName ? fullName[0].toUpperCase() : 'T'}
          </div>
          <div>
            <h1 className="font-display text-xl text-ink">{fullName || "Noma'lum talaba"}</h1>
            <p className="text-xs text-ink-muted">@{student?.username || 'username_yoq'}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5 text-xs">
          <div>
            <span className="text-ink-muted block mb-1">Rol</span>
            <span className="font-medium text-ink">{student?.role || 'STUDENT'}</span>
          </div>
          <div>
            <span className="text-ink-muted block mb-1">Telefon / Aloqa</span>
            <span className="font-medium text-ink">{student?.phone || 'Kiritilmagan'}</span>
          </div>
        </div>
      </div>

      {/* Guruhdan chiqarish harakati */}
      <div className="bg-surface p-6 rounded-2xl border border-coral/20 bg-coral/5 space-y-3">
        <h3 className="text-sm font-medium text-coral">Xavfli zona</h3>
        <p className="text-xs text-ink-muted">
          Talabani ushbu guruhdan chetlashtirish uning guruhdagi darslar va vazifalarga bo'lgan kirishini yopadi.
        </p>
        <button
          onClick={handleRemoveFromGroup}
          disabled={isRemoving}
          className="px-4 py-2 text-xs font-medium bg-coral text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isRemoving ? "Chiqarilmoqda..." : "Guruhdan chiqarish"}
        </button>
      </div>
    </div>
  );
}