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

  const { data: groupStudents, isLoading: isLoadingGroupStudents, refetch: refetchGroupStudents } = useQuery({
    queryKey: ['group-students', id],
    queryFn: () => apiFetch<any[]>(`/api/v1/groups/${id}/students`),
    enabled: !!id,
  });

  const { data: allStudentsData } = useAdminStudents({ page: 1 });
  const studentsList = Array.isArray(allStudentsData)
    ? allStudentsData
    : (allStudentsData as any)?.items || (allStudentsData as any)?.students || (allStudentsData as any)?.data || [];

  const { data: allUsersData } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => apiFetch<any>('/api/v1/users'),
  });

  const usersList = Array.isArray(allUsersData)
    ? allUsersData
    : (allUsersData as any)?.items || (allUsersData as any)?.users || (allUsersData as any)?.data || [];

  const teachersList = usersList.filter((u: any) => u.role === 'TEACHER' || u.role === 'ADMIN');

  const addStudent = useAddStudentToGroup();
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedAssistantId, setSelectedAssistantId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const g = group as any;
    if (g) {
      if (g.teacherId || g.teacher?._id || g.teacher?.id) {
        setSelectedTeacherId(g.teacherId || g.teacher?._id || g.teacher?.id);
      }
      if (g.assistantId || g.assistant?._id || g.assistant?.id) {
        setSelectedAssistantId(g.assistantId || g.assistant?._id || g.assistant?.id);
      }
    }
  }, [group]);

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

  const handleRemoveStudent = async (studentId: string) => {
    if (!studentId) {
      setError('Talaba ID topilmadi');
      return;
    }
    if (!confirm('Haqiqatan ham bu talabani guruhdan chiqarmoqchimisiz?')) return;
    setError(null);
    setSuccessMessage(null);

    try {
      await apiFetch(`/api/v1/groups/${id}/students/${studentId}`, {
        method: 'DELETE',
      });
      setSuccessMessage('Talaba guruhdan chiqarib yuborildi.');
      refetchGroupStudents();
    } catch (err: any) {
      setError(err.message || 'Talabani chiqarishda xatolik yuz berdi');
    }
  };

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
      setSuccessMessage('Asosiy ustoz muvaffaqiyatli biriktirildi!');
    } catch (err: any) {
      setError(err.message || 'Ustozni biriktirishda xatolik yuz berdi');
    }
  };

  const handleAssignAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError(null);
    setSuccessMessage(null);

    try {
      await apiFetch(`/api/v1/groups/${id}/teacher`, {
        method: 'PATCH',
        body: JSON.stringify({ assistantId: selectedAssistantId }),
      });
      setSuccessMessage('Yordamchi ustoz muvaffaqiyatli biriktirildi!');
    } catch (err: any) {
      setError(err.message || 'Yordamchi ustozni biriktirishda xatolik yuz berdi');
    }
  };

  const groupData = group as any;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6 pb-16">
      <button onClick={() => navigate(-1)} className="text-sm text-ink-muted hover:text-ink transition-colors flex items-center gap-1">
        ← Orqaga
      </button>

      <div className="bg-surface/20 p-5 rounded-2xl border border-white/5 space-y-2">
        <h1 className="font-display text-2xl text-ink">{groupData?.name || 'Guruh tafsilotlari'}</h1>
        <p className="text-xs text-ink-muted">{groupData?.description || 'Tavsif mavjud emas'}</p>
      </div>

      {error && <div className="p-3 bg-coral/10 border border-coral/20 rounded-xl text-xs text-coral">{error}</div>}
      {successMessage && <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-xs text-green-400">{successMessage}</div>}

      {/* Asosiy ustoz biriktirish */}
      <form onSubmit={handleAssignTeacher} className="bg-surface/30 p-4 rounded-2xl border border-white/5 space-y-3">
        <h3 className="text-sm font-medium text-ink">Asosiy ustozni belgilash</h3>
        <div className="flex gap-2">
          <select
            value={selectedTeacherId}
            onChange={(e) => setSelectedTeacherId(e.target.value)}
            className="flex-1 bg-surface text-xs rounded-xl px-3 py-2 outline-none border border-white/5 text-ink cursor-pointer"
          >
            <option value="">Ustozni tanlang...</option>
            {teachersList.map((t: any) => (
              <option key={t.id || t._id} value={t.id || t._id}>
                {t.firstName} {t.lastName} {t.username ? `(@${t.username})` : ''}
              </option>
            ))}
          </select>
          <button type="submit" className="bg-gold text-base text-xs font-semibold px-4 py-2 rounded-xl hover:opacity-95 transition-opacity">
            Saqlash
          </button>
        </div>
      </form>

      {/* Yordamchi ustoz biriktirish */}
      <form onSubmit={handleAssignAssistant} className="bg-surface/30 p-4 rounded-2xl border border-white/5 space-y-3">
        <h3 className="text-sm font-medium text-ink">Yordamchi ustoz (Mentor) belgilash</h3>
        <div className="flex gap-2">
          <select
            value={selectedAssistantId}
            onChange={(e) => setSelectedAssistantId(e.target.value)}
            className="flex-1 bg-surface text-xs rounded-xl px-3 py-2 outline-none border border-white/5 text-ink cursor-pointer"
          >
            <option value="">Yordamchi ustozni tanlang...</option>
            {teachersList.map((t: any) => (
              <option key={t.id || t._id} value={t.id || t._id}>
                {t.firstName} {t.lastName} {t.username ? `(@${t.username})` : ''}
              </option>
            ))}
          </select>
          <button type="submit" className="bg-gold text-base text-xs font-semibold px-4 py-2 rounded-xl hover:opacity-95 transition-opacity">
            Saqlash
          </button>
        </div>
      </form>

      {/* Talaba qo'shish */}
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
              return (
                <option key={sId} value={sId}>
                  {s.firstName || 'Talaba'} {s.lastName || ''} ({s.username ? `@${s.username}` : sId})
                </option>
              );
            })}
          </select>
          <button type="submit" disabled={addStudent.isPending || !selectedStudentId} className="bg-gold text-base text-xs font-semibold px-4 py-2 rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity">
            {addStudent.isPending ? 'Qo\'shilmoqda...' : 'Qo\'shish'}
          </button>
        </div>
      </form>

      {/* Guruhdagi talabalar ro'yxati va chiqarib yuborish */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-ink">Guruhdagi talabalar ro'yxati</h3>
          <span className="text-xs text-ink-muted">Jami: {Array.isArray(groupStudents) ? groupStudents.length : 0} ta</span>
        </div>

        {isLoadingGroupStudents ? (
          <p className="text-xs text-ink-muted">Yuklanmoqda...</p>
        ) : !groupStudents || groupStudents.length === 0 ? (
          <div className="text-center py-8 bg-surface/20 rounded-2xl border border-white/5">
            <p className="text-xs text-ink-muted">Bu guruhda hali talabalar mavjud emas.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5 bg-surface/20 rounded-2xl border border-white/5 px-4">
            {groupStudents.map((m: any) => {
              const studentData = m?.student || m?.user;
              const fullName = `${studentData?.firstName || ''} ${studentData?.lastName || ''}`.trim();
              const targetStudentId = studentData?.id || studentData?._id || m?.studentId;

              return (
                <div key={m.id || targetStudentId} className="flex items-center justify-between py-3.5">
                  <div>
                    <p className="text-sm font-medium">{fullName || "Noma'lum talaba"}</p>
                    <p className="text-xs text-ink-muted">
                      {studentData?.username ? `@${studentData.username}` : (targetStudentId ? `ID: ${targetStudentId}` : '')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveStudent(targetStudentId)}
                    className="text-xs text-coral hover:underline font-medium"
                  >
                    Chiqarish
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