import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api-client';
import { useGroups, useAddStudentToGroup } from '../../hooks/useGroups';
import { useAdminStudents } from '../../hooks/useAdmin';

export function AdminGroupDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: groups } = useGroups();
  const group = groups?.find((g: any) => g.id === id || g._id === id);

  // Guruhga biriktirilgan talabalar ro'yxatini olish
  const { data: groupStudents, isLoading: isLoadingGroupStudents } = useQuery({
    queryKey: ['group-students', id],
    queryFn: () => apiFetch<any[]>(`/api/v1/groups/${id}/students`),
    enabled: !!id,
  });

  // Barcha talabalar (dropdown uchun)
  const { data: allStudentsData } = useAdminStudents({ page: 1 });
  
  const studentsList = Array.isArray(allStudentsData)
    ? allStudentsData
    : (allStudentsData as any)?.items ||
      (allStudentsData as any)?.students || 
      (allStudentsData as any)?.data || [];

  const addStudent = useAddStudentToGroup();
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState(group?.teacherId || '');
  const [error, setError] = useState<string | null>(null);
  const [teacherSuccess, setTeacherSuccess] = useState(false);

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !selectedStudentId) return;
    setError(null);

    addStudent.mutate(
      { groupId: id, studentId: selectedStudentId },
      {
        onSuccess: () => setSelectedStudentId(''),
        onError: (err: any) => setError(err.message || 'Talaba qo\'shishda xatolik yuz berdi'),
      }
    );
  };

  // Guruhga ustoz biriktirish funksiyasi
  const handleAssignTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError(null);
    setTeacherSuccess(false);

    try {
      await apiFetch(`/api/v1/groups/${id}/teacher`, {
        method: 'PATCH',
        body: JSON.stringify({ teacherId: selectedTeacherId }),
      });
      setTeacherSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Ustozni biriktirishda xatolik yuz berdi');
    }
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

      {/* Ustoz biriktirish formasi */}
      <form onSubmit={handleAssignTeacher} className="bg-surface/30 p-4 rounded-2xl border border-white/5 space-y-3">
        <h3 className="text-sm font-medium text-ink">Guruhga ustoz biriktirish</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={selectedTeacherId}
            onChange={(e) => setSelectedTeacherId(e.target.value)}
            placeholder="Ustoz ID raqamini kiriting..."
            className="flex-1 bg-surface text-xs rounded-xl px-3 py-2 outline-none border border-white/5 text-ink"
          />
          <button
            type="submit"
            className="bg-gold text-base text-xs font-semibold px-4 py-2 rounded-xl hover:opacity-95 transition-opacity"
          >
            Saqlash
          </button>
        </div>
        {teacherSuccess && <p className="text-xs text-green-400">Ustoz muvaffaqiyatli biriktirildi!</p>}
      </form>

      {/* Talaba qo'shish formasi */}
      <form onSubmit={handleAddStudent} className="bg-surface/30 p-4 rounded-2xl border border-white/5 space-y-3">
        <h3 className="text-sm font-medium text-ink">Guruhga talaba qo'shish</h3>
        <div className="flex gap-2">
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="flex-1 bg-surface text-xs rounded-xl px-3 py-2 outline-none border border-white/5 text-ink cursor-pointer"
          >
            <option value="">Talabani tanlang...</option>
            {studentsList.map((s: any) => {
              const sId = s.id || s._id || s.studentId;
              const fName = s.firstName || s.user?.firstName || 'Talaba';
              const lName = s.lastName || s.user?.lastName || '';
              const uname = s.username || s.user?.username;
              return (
                <option key={sId} value={sId}>
                  {fName} {lName} ({uname ? `@${uname}` : sId})
                </option>
              );
            })}
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
              const student = member.student || member.user || member;
              const sName = student.firstName || member.firstName || 'Ism yo\'q';
              const sLastName = student.lastName || member.lastName || '';
              const sUsername = student.username || member.username;

              return (
                <div key={member.id || student.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {sName} {sLastName}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {sUsername ? `@${sUsername}` : 'Username yo\'q'}
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