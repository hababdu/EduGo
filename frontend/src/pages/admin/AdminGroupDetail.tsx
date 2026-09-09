import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGroups, useAddStudentToGroup } from '../../hooks/useGroups';
import { useAdminStudents } from '../../hooks/useAdmin';

export function AdminGroupDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: groups } = useGroups();
  const group = groups?.find((g: any) => g.id === id);

  const { data: allStudents } = useAdminStudents({ page: 1 });
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
            {(allStudents as any)?.students?.map((s: any) => (
              <option key={s.id} value={s.id}>
                {s.firstName} {s.lastName || ''} ({s.username ? `@${s.username}` : 'id'})
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
    </div>
  );
}