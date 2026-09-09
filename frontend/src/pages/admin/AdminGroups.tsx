import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api-client';
import { useGroups, useAddStudentToGroup } from '../../hooks/useGroups';
import { useAdminStudents } from '../../hooks/useAdmin';

export default function AdminGroups()  {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: groups } = useGroups();
  const group = groups?.find((g: any) => g.id === id);

  // Guruhga biriktirilgan talabalar ro'yxatini olish
  const { data: groupStudents, isLoading: isLoadingGroupStudents } = useQuery({
    queryKey: ['group-students', id],
    queryFn: () => apiFetch<any[]>(`/api/v1/groups/${id}/students`),
    enabled: !!id,
  });

  // Barcha talabalar (dropdown uchun)
  const { data: allStudentsData } = useAdminStudents({ page: 1 });
  
  // --- KONSOLEGA TO'LIQ MA'LUMOTNI CHIQARISH ---
  console.log("🔥 [DEBUG] allStudentsData (Barcha talabalar javobi):", allStudentsData);
  console.log("🔥 [DEBUG] groupStudents (Guruh talabalari javobi):", groupStudents);

  // Talabalar massivini har qanday formatdan xavfsiz ajratib olish
  const studentsList = Array.isArray(allStudentsData)
    ? allStudentsData
    : (allStudentsData as any)?.students || 
      (allStudentsData as any)?.data || 
      (allStudentsData as any)?.items || [];

  console.log("🔥 [DEBUG] studentsList (Dropdown uchun tayyor massiv):", studentsList);

  const addStudent = useAddStudentToGroup();
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;
    setError(null);

    addStudent.mutate(
      { groupId: id, studentId: selectedStudentId },
      {
        onSuccess: () => setSelectedStudentId(''),
        onError: (err: any) => setError(err.message || 'Xatolik yuz berdi'),
      }
    );
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6 pb-16">
      <button 
        onClick={() => navigate(-1)} 
        className="text-sm text-ink-muted hover:text-ink transition-colors"
      >
        ← Orqaga
      </button>

      <div>
        <h1 className="font-display text-2xl text-ink">{group?.name || 'Guruh'}</h1>
        <p className="text-xs text-ink-muted mt-1">{group?.description || 'Tavsif mavjud emas'}</p>
      </div>

      {/* Talaba qo'shish formasi */}
      <form onSubmit={handleAdd} className="bg-surface/30 p-4 rounded-2xl border border-white/5 space-y-3">
        <h3 className="text-sm font-medium text-ink">Guruhga talaba qo'shish</h3>
        <div className="flex gap-2">
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="flex-1 bg-surface text-xs rounded-xl px-3 py-2 outline-none border border-white/5 text-ink cursor-pointer"
          >
            <option value="">Talabani tanlang...</option>
            {studentsList.map((s: any) => (
              <option key={s.id || s.studentId} value={s.id || s.studentId}>
                {s.firstName || s.user?.firstName || 'Talaba'} {s.lastName || s.user?.lastName || ''} 
                ({s.username ? `@${s.username}` : s.user?.username ? `@${s.user.username}` : 'id'})
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={addStudent.isPending || !selectedStudentId}
            className="bg-gold text-base text-xs font-semibold px-4 py-2 rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {addStudent.isPending ? 'Qo\'shilmoqda...' : 'Qo\'shish'}
          </button>
        </div>
        {error && <p className="text-xs text-coral">{error}</p>}
      </form>

      {/* Guruhdagi talabalar ro'yxati */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-ink">Guruhdagi talabalar</h3>
        {isLoadingGroupStudents ? (
          <p className="text-xs text-ink-muted">Yuklanmoqda...</p>
        ) : !groupStudents || groupStudents.length === 0 ? (
          <div className="text-center py-8 bg-surface/20 rounded-2xl border border-white/5">
            <p className="text-xs text-ink-muted">Bu guruhda hali talabalar yo'q.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5 bg-surface/20 rounded-2xl border border-white/5 px-4">
            {groupStudents.map((member: any) => {
              const student = member.student || member;
              return (
                <div key={member.id || student.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {student.firstName || 'Ism yo\'q'} {student.lastName || ''}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {student.username ? `@${student.username}` : 'Username yo\'q'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}