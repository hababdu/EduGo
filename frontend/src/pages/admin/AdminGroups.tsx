import { useState } from 'react';
import { 
  useAdminGroups, 
  useAdminTeachers, 
  useCreateGroup, 
  useAdminStudents, 
  useAssignStudentGroup 
} from '../../hooks/useAdmin';

export function AdminGroups() {
  const [name, setName] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const { data: groups, isLoading: loadingGroups } = useAdminGroups();
  const { data: teachers } = useAdminTeachers();
  const { data: studentsData } = useAdminStudents({ page: 1 });
  
  const createGroupMutation = useCreateGroup();
  const assignGroupMutation = useAssignStudentGroup();

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    createGroupMutation.mutate(
      { name, teacherId: teacherId || undefined },
      { onSuccess: () => { setName(''); setTeacherId(''); } }
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <h1 className="font-display text-2xl">Guruhlar va O'quvchilar Boshqaruvi</h1>

      {/* Guruh Yaratish Formasi */}
      <form onSubmit={handleCreateGroup} className="bg-surface p-5 rounded-xl space-y-4">
        <h2 className="text-base font-semibold text-gold">Yangi Guruh Yaratish</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Guruh nomi (masalan: Frontend 2026-1)"
            className="bg-background rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-gold"
          />
          <select
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            className="bg-background rounded-lg px-3 py-2.5 text-sm outline-none text-ink"
          >
            <option value="">O'qituvchi biriktirish (Ixtiyoriy)</option>
            {teachers?.map((t) => (
              <option key={t.id} value={t.id}>{t.firstName} {t.lastName ?? ''}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={createGroupMutation.isPending}
          className="bg-gold text-background font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50"
        >
          {createGroupMutation.isPending ? 'Yaratilmoqda...' : 'Guruh Yaratish'}
        </button>
      </form>

      {/* Guruhlar Ro'yxati va Ularga O'quvchilarni Taqsillash */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-3">Mavjud Guruhlar</h2>
          {loadingGroups ? (
            <div className="h-32 bg-surface rounded-xl animate-pulse" />
          ) : (
            <div className="space-y-2">
              {groups?.map((g) => (
                <div
                  key={g.id}
                  onClick={() => setSelectedGroupId(g.id)}
                  className={`p-4 rounded-xl bg-surface border cursor-pointer transition-colors ${
                    selectedGroupId === g.id ? 'border-gold bg-surface/80' : 'border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <p className="font-semibold text-sm">{g.name}</p>
                    <span className="text-xs bg-gold/10 text-gold px-2 py-0.5 rounded">
                      {g.studentsCount ?? 0} ta o'quvchi
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted mt-1">
                    O'qituvchi: {g.teacherName || 'Biriktirilmagan'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">O'quvchilarni Guruhga Qo'shish</h2>
          {!selectedGroupId ? (
            <div className="p-8 border border-dashed border-white/10 rounded-xl text-center">
              <p className="text-sm text-ink-muted">O'quvchi biriktirish uchun chap tarafdan guruh tanlang.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {studentsData?.items.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-surface rounded-lg border border-white/5">
                  <div>
                    <p className="text-sm font-medium">{s.firstName} {s.lastName ?? ''}</p>
                    <p className="text-xs text-ink-muted">
                      Hozirgi guruh: {s.groupName || 'Yo\'q'}
                    </p>
                  </div>
                  <button
                    disabled={assignGroupMutation.isPending}
                    onClick={() => assignGroupMutation.mutate({ studentId: s.id, groupId: selectedGroupId })}
                    className="text-xs bg-teal text-background font-semibold px-3 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-50"
                  >
                    Qo'shish
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}