import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGroup, useGroupMembers } from '../../hooks/useGroups';

export function TeacherGroupDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Agar ID mavjud bo'lmasa, hooklarga bo'sh string beramiz
  const { data: group, isLoading: groupLoading, error: groupError } = useGroup(id ?? '');
  const { data: members, isLoading: membersLoading, error: membersError } = useGroupMembers(id ?? '');

  const [activeTab, setActiveTab] = useState<'students' | 'lessons'>('students');

  // Agar ID umuman kelmasa
  if (!id) {
    return (
      <div className="p-6 text-center text-coral">
        Guruh ID manzili topilmadi.
        <button onClick={() => navigate('/teacher/groups')} className="block mx-auto mt-4 text-xs underline">
          Guruhlarga qaytish
        </button>
      </div>
    );
  }

  if (groupLoading || membersLoading) {
    return <div className="p-6 animate-pulse h-40 bg-surface rounded-lg m-6" />;
  }

  if (groupError || membersError) {
    return (
      <div className="p-6 text-center text-coral">
        Ma'lumotlarni yuklashda xatolik yuz berdi: {(groupError as any)?.message || (membersError as any)?.message}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto pb-16">
      <button
        onClick={() => navigate('/teacher/groups')}
        className="text-sm text-ink-muted mb-6 hover:text-ink transition-colors flex items-center gap-1"
      >
        ← Guruhlarimga qaytish
      </button>

      <div className="mb-8 bg-surface p-6 rounded-2xl border border-white/5">
        <h1 className="font-display text-2xl mb-2">{group?.name || "Noma'lum guruh"}</h1>
        {group?.description && (
          <p className="text-sm text-ink-muted mb-4">{group.description}</p>
        )}
        <div className="flex items-center gap-4 text-xs text-ink-faint">
          <span>Talabalar soni: {Array.isArray(members) ? members.length : 0} ta</span>
        </div>
      </div>

      <div className="flex gap-4 border-b border-white/10 mb-6 pb-2">
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

      {activeTab === 'students' && (
        <section>
          {!members || members.length === 0 ? (
            <p className="text-sm text-ink-muted py-8 text-center rounded-xl bg-surface/50 border border-white/5">
              Bu guruhda hozircha talabalar mavjud emas.
            </p>
          ) : (
            <div className="divide-y divide-white/5 bg-surface rounded-2xl border border-white/5 overflow-hidden px-4">
              {members.map((m: any) => {
                const studentData = m?.student || m?.user || m;
                const label = `${studentData?.firstName || ''} ${studentData?.lastName || ''}`.trim();

                return (
                  <div key={m?.id || studentData?.id} className="flex items-center justify-between py-3.5">
                    <div>
                      <p className="text-sm font-medium">{label || "Noma'lum talaba"}</p>
                      <p className="text-xs text-ink-muted">
                        {studentData?.username ? `@${studentData.username}` : ''}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {activeTab === 'lessons' && (
        <section>
          <div className="p-8 text-center rounded-2xl bg-surface/50 border border-white/5 text-ink-muted text-sm">
            Hozircha bu guruhga dars materiallari qo'shilmagan.
          </div>
        </section>
      )}
    </div>
  );
}