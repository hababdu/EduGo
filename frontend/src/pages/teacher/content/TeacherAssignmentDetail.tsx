import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../../api/client';

export function TeacherAssignmentDetail() {
  const { assignmentId = '' } = useParams();
  const navigate = useNavigate();
  const [groupId, setGroupId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Topshiriq tafsilotlarini olish
  const { data: assignment, isLoading } = useQuery({
    queryKey: ['teacher-assignment', assignmentId],
    queryFn: async () => {
      const res = await apiClient.get(`/api/v1/tests/${assignmentId}`);
      return res.data;
    },
  });

  const handleAssignToGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId) return;
    setIsAssigning(true);
    try {
      await apiClient.post(`/api/v1/tests/${assignmentId}/assign`, {
        targetType: 'GROUP',
        groupId,
      });
      alert('Topshiriq guruhga muvaffaqiyatli biriktirildi!');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Xatolik yuz berdi');
    } finally {
      setIsAssigning(false);
    }
  };

  if (isLoading || !assignment) {
    return <div className="p-6 animate-pulse h-40 bg-surface rounded-xl m-6" />;
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <button onClick={() => navigate('/teacher/assignments')} className="text-sm text-ink-muted">
        ← Orqaga qaytish
      </button>

      <div className="bg-surface/30 p-6 rounded-2xl border border-white/5 space-y-4">
        <h1 className="font-display text-2xl text-ink">{assignment.title}</h1>
        <p className="text-xs text-ink-muted">{assignment.description || 'Tavsif mavjud emas'}</p>
        <div className="flex gap-4 text-xs text-ink-muted pt-2 border-t border-white/5">
          <span>Savollar soni: {assignment.questions?.length ?? 0} ta</span>
          <span>·</span>
          <span>O'tish balli: {assignment.passingScore}</span>
        </div>
      </div>

      <div className="bg-surface/30 p-6 rounded-2xl border border-white/5 space-y-4">
        <h2 className="text-sm font-semibold text-ink">Guruhga biriktirish</h2>
        <form onSubmit={handleAssignToGroup} className="space-y-3">
          <input
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            placeholder="Guruh ID raqamini kiriting"
            required
            className="w-full bg-surface rounded-xl px-4 py-2.5 text-sm outline-none border border-white/5 text-ink"
          />
          <button
            type="submit"
            disabled={isAssigning}
            className="w-full bg-gold text-base rounded-xl py-2.5 font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isAssigning ? 'Biriktirilmoqda...' : 'Guruhga yuborish'}
          </button>
        </form>
      </div>
    </div>
  );
}