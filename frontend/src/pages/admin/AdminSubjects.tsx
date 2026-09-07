import { useState } from 'react';
import { 
  useAdminSubjects, 
  useCreateSubject, 
  useAdminTeachers, 
  useUpdateUserRole, 
  useAssignTeacherSubject, 
  useAdminStudents 
} from '../../hooks/useAdmin';

export function AdminSubjects() {
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);

  const { data: subjects } = useAdminSubjects();
  const { data: teachers } = useAdminTeachers();
  const { data: studentsData } = useAdminStudents({ page: 1 });

  const createSubjectMutation = useCreateSubject();
  const updateRoleMutation = useUpdateUserRole();
  const assignSubjectMutation = useAssignTeacherSubject();

  const handleCreateSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName || !subjectCode) return;
    createSubjectMutation.mutate(
      { name: subjectName, code: subjectCode.toUpperCase() },
      { onSuccess: () => { setSubjectName(''); setSubjectCode(''); } }
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <h1 className="font-display text-2xl">Fanlar va O'qituvchilar (TEACHER)</h1>

      {/* 1. O'qituvchilar (TEACHER) Rolini Tayinlash */}
      <div className="bg-surface p-5 rounded-xl space-y-4">
        <h2 className="text-base font-semibold text-gold">Foydalanuvchini O'qituvchi Qilish</h2>
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {studentsData?.items.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-2.5 bg-background rounded-lg">
              <div>
                <p className="text-sm font-medium">{user.firstName} {user.lastName ?? ''}</p>
                <p className="text-xs text-ink-muted">Rol: {user.role}</p>
              </div>
              {user.role !== 'TEACHER' ? (
                <button
                  onClick={() => updateRoleMutation.mutate({ userId: user.id, role: 'TEACHER' })}
                  className="text-xs bg-gold text-background font-semibold px-3 py-1.5 rounded-lg"
                >
                  O'qituvchi qilish
                </button>
              ) : (
                <span className="text-xs text-teal font-medium">O'qituvchi ✓</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 2. Yangi Fan Yaratish */}
      <form onSubmit={handleCreateSubject} className="bg-surface p-5 rounded-xl space-y-4">
        <h2 className="text-base font-semibold text-gold">Yangi Fan Qo'shish</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            placeholder="Fan nomi (masalan: Matematika)"
            className="bg-background rounded-lg px-4 py-2.5 text-sm outline-none"
          />
          <input
            value={subjectCode}
            onChange={(e) => setSubjectCode(e.target.value)}
            placeholder="Kod (masalan: MATH101)"
            className="bg-background rounded-lg px-4 py-2.5 text-sm outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={createSubjectMutation.isPending}
          className="bg-gold text-background font-semibold px-4 py-2 rounded-lg text-sm disabled:opacity-50"
        >
          {createSubjectMutation.isPending ? 'Qo\'shilmoqda...' : 'Fan Yaratish'}
        </button>
      </form>

      {/* 3. Fanlarni O'qituvchiga Biriktirish */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-3">O'qituvchilar Ro'yxati</h2>
          <div className="space-y-2">
            {teachers?.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedTeacherId(t.id)}
                className={`p-3.5 rounded-xl bg-surface border cursor-pointer transition-colors ${
                  selectedTeacherId === t.id ? 'border-gold bg-surface/80' : 'border-white/5'
                }`}
              >
                <p className="font-medium text-sm">{t.firstName} {t.lastName ?? ''}</p>
                <p className="text-xs text-ink-muted">
                  Biriktirilgan fanlar: {t.subjects?.map((s) => s.name).join(', ') || 'Yo\'q'}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Fanga Biriktirish</h2>
          {!selectedTeacherId ? (
            <div className="p-8 border border-dashed border-white/10 rounded-xl text-center">
              <p className="text-sm text-ink-muted">O'qituvchini tanlang</p>
            </div>
          ) : (
            <div className="space-y-2">
              {subjects?.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between p-3 bg-surface rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{sub.name}</p>
                    <p className="text-xs text-ink-muted">Kod: {sub.code}</p>
                  </div>
                  <button
                    onClick={() => assignSubjectMutation.mutate({ teacherId: selectedTeacherId, subjectId: sub.id })}
                    className="text-xs bg-teal text-background font-semibold px-3 py-1.5 rounded-lg"
                  >
                    Biriktirish
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