import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  useGroup, 
  useGroupMembers, 
  useAddStudentToGroup, 
  useRemoveStudentFromGroup 
} from '../../hooks/useGroups';
import { useAdminStudents } from '../../hooks/useAdmin';

export function TeacherGroupDetail() {
  const { groupId = '' } = useParams<{ groupId: string }>();
  const navigate = useNavigate();

  const { data: group, isLoading: groupLoading, error: groupError } = useGroup(groupId);
  const { data: members, isLoading: membersLoading, refetch: refetchMembers } = useGroupMembers(groupId);
  const { mutate: removeStudent, isPending: isRemoving } = useRemoveStudentFromGroup();
  const { mutate: addStudent, isPending: isAdding } = useAddStudentToGroup();

  // Talabalar modaliga ro'yxat chiqarish uchun
  const { data: allStudentsData } = useAdminStudents({ page: 1 });
  const studentsList = Array.isArray(allStudentsData)
    ? allStudentsData
    : (allStudentsData as any)?.items || (allStudentsData as any)?.students || (allStudentsData as any)?.data || [];

  const [activeTab, setActiveTab] = useState<'students' | 'lessons'>('students');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
    if (!studentId) {
      alert("Talaba ID topilmadi");
      return;
    }
    if (confirm("Haqiqatan ham bu talabani guruhdan chiqarmoqchimisiz?")) {
      setError(null);
      setSuccessMessage(null);
      removeStudent(
        { groupId, studentId },
        {
          onSuccess: () => {
            setSuccessMessage("Talaba guruhdan chiqarib yuborildi.");
            refetchMembers();
          },
          onError: (err: any) => {
            setError(err?.message || "Talabani chiqarishda xatolik yuz berdi");
          }
        }
      );
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;
    setError(null);
    setSuccessMessage(null);

    addStudent(
      { groupId, studentId: selectedStudentId },
      {
        onSuccess: () => {
          setSelectedStudentId('');
          setIsAddModalOpen(false);
          setSuccessMessage("Talaba guruhga muvaffaqiyatli qo'shildi!");
          refetchMembers();
        },
        onError: (err: any) => {
          setError(err?.message || "Talabani qo'shishda xatolik yuz berdi");
        }
      }
    );
  };

  const groupData = group as any;

  return (
    <div className="p-6 max-w-4xl mx-auto pb-16 space-y-6">
      {/* Orqaga qaytish */}
      <button
        onClick={() => navigate('/teacher/groups')}
        className="text-sm text-ink-muted hover:text-ink transition-colors flex items-center gap-1"
      >
        ← Guruhlarimga qaytish
      </button>

      {/* Xabarlar */}
      {error && <div className="p-3 bg-coral/10 border border-coral/20 rounded-xl text-xs text-coral">{error}</div>}
      {successMessage && <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-xs text-green-400">{successMessage}</div>}

      {/* Guruh bosh qismi */}
      <div className="bg-surface p-6 rounded-2xl border border-white/5 shadow-sm space-y-2">
        <h1 className="font-display text-2xl text-ink">{groupData?.name || "Guruh tafsilotlari"}</h1>
        <p className="text-xs text-ink-muted">{groupData?.description || "Tavsif mavjud emas"}</p>
        <div className="flex items-center gap-4 text-xs text-ink-faint pt-2">
          <span>Talabalar soni: {Array.isArray(members) ? members.length : 0} ta</span>
        </div>
      </div>

      {/* Tab navigatsiyasi */}
      <div className="flex gap-6 border-b border-white/10 pb-2">
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
        <section className="space-y-4">
          <div className="flex items-center justify-between">
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
                      onClick={() => handleRemove(targetStudentId)}
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
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-ink-muted">Darslar ro'yxati</h2>
            <button 
              onClick={() => alert("Tez orada qo'shiladi")}
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
          <div className="bg-surface border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
            <h3 className="text-lg font-medium text-ink">Guruhga talaba qo'shish</h3>
            <p className="text-xs text-ink-muted">
              Ro'yxatdan talabani tanlang va guruhga qo'shing.
            </p>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink-muted mb-1">Talirani tanlang</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full bg-surface-muted border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:border-primary cursor-pointer"
                  required
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
                  disabled={isAdding || !selectedStudentId}
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