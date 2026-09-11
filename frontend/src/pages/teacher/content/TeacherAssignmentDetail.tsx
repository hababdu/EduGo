import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../../api/client';

export function TeacherAssignmentDetail() {
  const { assignmentId = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Edit form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Material tafsilotlarini olish
  const { data: assignment, isLoading } = useQuery({
    queryKey: ['teacher-assignment', assignmentId],
    queryFn: async () => {
      const res = await apiClient.get(`/api/v1/tests/${assignmentId}`);
      setTitle(res.data.title);
      setDescription(res.data.description || '');
      return res.data;
    },
  });

  // Guruhlarni olish
  const { data: groups } = useQuery({
    queryKey: ['teacher-groups'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/api/v1/groups');
        return res.data;
      } catch {
        return [];
      }
    },
  });

  // Yangilash mutation'i
  const updateMutation = useMutation({
    mutationFn: async (updatedData: { title: string; description: string }) => {
      const res = await apiClient.patch(`/api/v1/tests/${assignmentId}`, updatedData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-assignment', assignmentId] });
      queryClient.invalidateQueries({ queryKey: ['teacher-assignments-list'] });
      setIsEditing(false);
    },
  });

  // O'chirish mutation'i
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/api/v1/tests/${assignmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-assignments-list'] });
      navigate('/teacher/assignments');
    },
  });

  // Guruhga biriktirish
  const handleAssignToGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) return;
    setIsAssigning(true);
    try {
      await apiClient.post(`/api/v1/tests/${assignmentId}/assign`, {
        targetType: 'GROUP',
        groupId: selectedGroup,
      });
      alert('Material tanlangan guruhga muvaffaqiyatli biriktirildi!');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Xatolik yuz berdi');
    } finally {
      setIsAssigning(false);
    }
  };

  if (isLoading || !assignment) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <div className="h-8 w-32 bg-surface/30 rounded-xl animate-pulse" />
        <div className="h-64 bg-surface/30 rounded-3xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Orqaga qaytish va boshqaruv tugmalari */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/teacher/assignments')}
          className="text-xs text-ink-muted hover:text-ink flex items-center gap-1.5 transition-colors"
        >
          <span>← Orqaga qaytish</span>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-xs bg-surface/50 hover:bg-surface text-ink px-3 py-1.5 rounded-xl border border-white/5 transition-all"
          >
            {isEditing ? 'Bekor qilish' : 'Tahrirlash'}
          </button>
          <button
            onClick={() => {
              if (confirm('Haqiqatan ham bu materialni oʻchirmoqchimisiz?')) {
                deleteMutation.mutate();
              }
            }}
            className="text-xs bg-coral/10 hover:bg-coral/20 text-coral px-3 py-1.5 rounded-xl transition-all"
          >
            O'chirish
          </button>
        </div>
      </div>

      {/* Asosiy ma'lumot yoki Tahrirlash formasi */}
      <div className="bg-surface/30 p-6 sm:p-8 rounded-3xl border border-white/5 backdrop-blur-xl space-y-6">
        {isEditing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate({ title, description });
            }}
            className="space-y-4"
          >
            <h2 className="font-display text-lg text-ink">Materialni tahrirlash</h2>
            <div className="space-y-1.5">
              <label className="text-xs text-ink-muted">Mavzu nomi</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink focus:border-gold/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-ink-muted">Tavsif yoki mazmun</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink resize-none focus:border-gold/50"
              />
            </div>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="bg-gold text-base text-xs font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
            >
              {updateMutation.isPending ? 'Saqlanmoqda...' : 'O\'zgarishlarni saqlash'}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold bg-gold/10 text-gold">
                Dars materiali / Topshiriq
              </span>
            </div>
            <h1 className="font-display text-2xl text-ink">{assignment.title}</h1>
            <p className="text-sm text-ink-muted whitespace-pre-wrap leading-relaxed">
              {assignment.description || 'Tavsif kiritilmagan'}
            </p>
          </div>
        )}
      </div>

      {/* Guruhga biriktirish bo'limi */}
      <div className="bg-surface/30 p-6 sm:p-8 rounded-3xl border border-white/5 backdrop-blur-xl space-y-4">
        <div>
          <h2 className="font-display text-lg text-ink">Guruhga biriktirish</h2>
          <p className="text-xs text-ink-muted mt-0.5">Ushbu dars yoki topshiriqni o'zingizning guruhlaringizga yuboring</p>
        </div>

        <form onSubmit={handleAssignToGroup} className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            required
            className="flex-1 bg-surface rounded-2xl px-4 py-3 text-sm outline-none border border-white/5 text-ink focus:border-gold/50 transition-colors"
          >
            <option value="">Guruhni tanlang...</option>
            {groups?.map((g: any) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={isAssigning}
            className="bg-gold text-base rounded-2xl px-6 py-3 font-semibold text-xs hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0 shadow-lg shadow-gold/10"
          >
            {isAssigning ? 'Biriktirilmoqda...' : 'Guruhga yuborish'}
          </button>
        </form>
      </div>
    </div>
  );
}