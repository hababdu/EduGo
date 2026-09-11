import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  useGroup, 
  useGroupMembers, 
  useAddStudentToGroup, 
  useRemoveStudentFromGroup 
} from '../../hooks/useGroups';

export function TeacherGroupDetail() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();

  const { data: group, isLoading: groupLoading, error: groupError } = useGroup(groupId ?? '');
  const { data: members, isLoading: membersLoading } = useGroupMembers(groupId ?? '');
  const { mutate: removeStudent, isPending: isRemoving } = useRemoveStudentFromGroup();
  const { mutate: addStudent, isPending: isAdding } = useAddStudentToGroup();

  const [activeTab, setActiveTab] = useState<'students' | 'lessons'>('students');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [studentIdInput, setStudentIdInput] = useState('');

  if (!groupId) {
    return (
      <div className="p-6 text-center text-coral">
        Guruh ID manzili topilmadi.
        <button onClick={() => navigate('/teacher/groups')} className="block mx-auto mt-4 text-xs underline">
          Guruhlarga qaytish
        </button>
      </div>
    );
  }

  if (groupLoading) {
    return <div className="p-6 animate-pulse h-40 bg-surface rounded-2xl m-6 border border-white/5" />;
  }

  if (groupError) {
    return (
      <div className="p-6 text-center text-coral bg-surface rounded-2xl border border-white/5 m-6">
        Guruh ma'lumotlarini yuklashda xatolik yuz berdi.
      </div>
    );
  }

  const handleRemove = (studentId: string) => {
    if (confirm("Haqiqatan ham bu talabani guruhdan chiqarmoqchimisiz?")) {
      removeStudent({ groupId, studentId });
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentIdInput.trim()) return;

    addStudent(
      { groupId, studentId: studentIdInput.trim() },
      {
        onSuccess: () => {
          setStudentIdInput('');
          setIsAddModalOpen(false);
        },
        onError: (err: any) => {
          alert(err?.response?.data?.message || "Talabani qo'shishda xatolik yuz berdi");
        }
      }
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto pb-16">
      {/* Orqaga qaytish */}
      <button
        onClick={() => navigate('/teacher/groups')}
        className="text-sm text-ink-muted mb-6 hover:text-ink transition-colors flex items-center gap-1"
      >
        ← Guruhlarimga qaytish
      </button>

      {/* Guruh bosh qismi */}
      <div className="mb-8 bg-surface p-6 rounded-2xl border border-white/5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl mb-1">{group?.name || "Guruh"}</h1>
            {group?.description && (
              <p className="text-sm text-ink-muted">{group.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs px-3 py-1.5 rounded-xl bg-surface-muted text-ink-muted border border-white/5">
              Talabalar: {members?.length ?? 0} ta
            </span>
          </div>
        </div>
      </div>

      {/* Tab navigatsiyasi */}
      <div className="flex gap-6 border-b border-white/10 mb-6 pb-2">
        <button
          onClick={() => setActiveTab('students')}
          className={`text-sm font-medium pb-2 transition-colors relative ${
            activeTab === 'students' ? 'text-primary' : 'text-ink-muted hover:text-ink'
          }`}
        >
          Talabalar ro'yxati
          {activeTab === 'students' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('lessons')}
          className={`text-sm font-medium pb-2 transition-colors relative ${
            activeTab === 'lessons' ? 'text-primary' : 'text-ink-muted hover:text-ink'
          }`}
        >
          Darslar va Materiallar
          {activeTab === 'lessons' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
          )}
        </button>
      </div>

      {/* Talabalar bo'limi */}
      {activeTab === 'students' && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-ink-muted">Guruh a'zolari</h2>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="text-xs bg-primary text-white px-3.5 py-2 rounded-xl font-medium hover:opacity-90 transition-opacity"
            >
              + Talaba qo'shish
            </button>
          </div>

          {membersLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 bg-surface rounded-xl animate-pulse border border-white/5" />
              ))}
            </div>
          ) : !members || members.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-surface/50 border border-white/5 text-ink-muted text-sm">
              Bu guruhda hozircha talabalar mavjud emas.
            </div>
          ) : (
            <div className="divide-y divide-white/5 bg-surface rounded-2xl border border-white/5 overflow-hidden px-4">
              {members.map((m: any) => {
                const student = m?.student;
                const fullName = `${student?.firstName || ''} ${student?.lastName || ''}`.trim();

                return (
                  <div key={m.id || student?.id} className="flex items-center justify-between py-3.5">
                    <div>
                      <p className="text-sm font-medium">{fullName || "Noma'lum talaba"}</p>
                      <p className="text-xs text-ink-muted">
                        {student?.username ? `@${student.username}` : 'Username yoq'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemove(student?.id)}
                      disabled={isRemoving}
                      className="text-xs text-coral hover:underline font-medium transition-opacity disabled:opacity-50"
                    >
                      Chiqarish
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Darslar bo'limi */}
      {activeTab === 'lessons' && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-ink-muted">Darslar ro'yxati</h2>
            <button 
              onClick={() => alert("Yangi dars qo'shish tez orada qo'shiladi")}
              className="text-xs bg-primary text-white px-3.5 py-2 rounded-xl font-medium hover:opacity-90 transition-opacity"
            >
              + Dars qo'shish
            </button>
          </div>

          <div className="p-8 text-center rounded-2xl bg-surface/50 border border-white/5 text-ink-muted text-sm">
            Hozircha bu guruhga dars materiallari yoki rejalashtirilgan darslar kiritilmagan.
          </div>
        </section>
      )}

      {/* Talaba qo'shish oynasi (Modal) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-medium mb-2">Guruhga talaba qo'shish</h3>
            <p className="text-xs text-ink-muted mb-4">
              Talabaning ID raqamini kiriting va guruhga biriktiring.
            </p>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1">Talaba ID</label>
                <input
                  type="text"
                  value={studentIdInput}
                  onChange={(e) => setStudentIdInput(e.target.value)}
                  placeholder="Masalan: cmtujs0za..."
                  className="w-full bg-surface-muted border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:border-primary"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-ink-muted hover:text-ink bg-surface-muted rounded-xl transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="px-4 py-2 text-xs font-medium bg-primary text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isAdding ? "Qo'shilmoqda..." : "Qo'shish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}