import { useState, useEffect } from 'react';
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
  const { data: groupStudents, isLoading: isLoadingGroupStudents, refetch: refetchGroupStudents } = useQuery({
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

  // Barcha userlarni olib, ichidan ustozlarni (TEACHER) ajratib olish
 const { data: allUsersData } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => apiFetch<any>('/api/v1/users'),
  });

  const usersList = Array.isArray(allUsersData)
    ? allUsersData
    : (allUsersData as any)?.items ||
      (allUsersData as any)?.users || 
      (allUsersData as any)?.data || [];

  const teachersList = usersList.filter((u: any) => u.role === 'TEACHER');

  const addStudent = useAddStudentToGroup();
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Guruh ma'lumotidan ustoz tanlangandayoq uni state'ga yozib qo'yish
  useEffect(() => {
    const g = group as any;
    if (g && (g.teacherId || g.teacher?._id || g.teacher?.id)) {
      setSelectedTeacherId(g.teacherId || g.teacher?._id || g.teacher?.id);
    }
  }, [group]);

  // Guruhga talaba qo'shish
  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !selectedStudentId) return;
    setError(null);
    setSuccessMessage(null);

    addStudent.mutate(
      { groupId: id, studentId: selectedStudentId },
      {
        onSuccess: () => {
          setSelectedStudentId('');
          setSuccessMessage('Talaba guruhga muvaffaqiyatli qo\'shildi!');
          refetchGroupStudents();
        },
        onError: (err: any) => setError(err.message || 'Talaba qo\'shishda xatolik yuz berdi'),
      }
    );
  };

  // Guruhga ustoz biriktirish funksiyasi
  const handleAssignTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError(null);
    setSuccessMessage(null);

    try {
      await apiFetch(`/api/v1/groups/${id}/teacher`, {
        method: 'PATCH',
        body: JSON.stringify({ teacherId: selectedTeacherId }),
      });
      setSuccessMessage('Ustoz guruhga muvaffaqiyatli biriktirildi!');
    } catch (err: any) {
      setError(err.message || 'Ustozni biriktirishda xatolik yuz berdi');
    }
  };

  const groupData = group as any;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6 pb-16">
      <button 
        onClick={() => navigate(-1)} 
        className="text-sm text-ink-muted hover:text-ink transition-colors flex items-center gap-1"
      >
        ← Orqaga
      </button>

      {/* Guruh umumiy ma'lumotlari */}
      <div className="bg-surface/20 p-5 rounded-2xl border border-white/5 space-y-2">
        <h1 className="font-display text-2xl text-ink">{groupData?.name || 'Guruh tafsilotlari'}</h1>
        <p className="text-xs text-ink-muted">{groupData?.description || 'Tavsif mavjud emas'}</p>
        <div className="flex gap-4 pt-2 text-xs text-ink-muted">
          <span>Yaratilgan sana: {groupData?.createdAt ? new Date(groupData.createdAt).toLocaleDateString() : 'Noma\'lum'}</span>
        </div>
      </div>

      {/* Xatolik yoki muvaffaqiyat xabarlari */}
      {error && (
        <div className="p-3 bg-coral/10 border border-coral/20 rounded-xl text-xs text-coral">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-xs text-green-400">
          {successMessage}
        </div>
      )}

      {/* Ustoz biriktirish formasi (Dropdown orqali) */}
      <form onSubmit={handleAssignTeacher} className="bg-surface/30 p-4 rounded-2xl border border-white/5 space-y-3">
        <h3 className="text-sm font-medium text-ink">Guruh ustozini belgilash</h3>
        <div className="flex gap-2">
          <select
            value={selectedTeacherId}
            onChange={(e) => setSelectedTeacherId(e.target.value)}
            className="flex-1 bg-surface text-xs rounded-xl px-3 py-2 outline-none border border-white/5 text-ink cursor-pointer"
          >
            <option value="">Ustozni tanlang...</option>
            {teachersList.map((t: any) => {
              const tId = t.id || t._id;
              const tName = t.firstName || t.user?.firstName || 'Ustoz';
              const tLastName = t.lastName || t.user?.lastName || '';
              const tUsername = t.username || t.user?.username;
              return (
                <option key={tId} value={tId}>
                  {tName} {tLastName} {tUsername ? `(@${tUsername})` : ''}
                </option>
              );
            })}
          </select>
          <button
            type="submit"
            className="bg-gold text-base text-xs font-semibold px-4 py-2 rounded-xl hover:opacity-95 transition-opacity"
          >
            Saqlash
          </button>
        </div>
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
      </form>

      {/* Guruhdagi talabalar ro'yxati */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-ink">Guruhdagi talabalar ro'yxati</h3>
          <span className="text-xs text-ink-muted">
            Jami: {Array.isArray(groupStudents) ? groupStudents.length : 0} ta
          </span>
        </div>

        {isLoadingGroupStudents ? (
          <p className="text-xs text-ink-muted">Yuklanmoqda...</p>
        ) : !groupStudents || groupStudents.length === 0 ? (
          <div className="text-center py-8 bg-surface/20 rounded-2xl border border-white/5">
            <p className="text-xs text-ink-muted">Bu guruhda hali talabalar mavjud emas.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5 bg-surface/20 rounded-2xl border border-white/5 px-4">
            {groupStudents.map((member: any) => {
              const student = member.student || member.user || member;
              const sName = student.firstName || member.firstName || 'Ism yo\'q';
              const sLastName = student.lastName || member.lastName || '';
              const sUsername = student.username || member.username;

              return (
                <div key={member.id || student.id || Math.random()} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {sName} {sLastName}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {sUsername ? `@${sUsername}` : 'Username kiritilmagan'}
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