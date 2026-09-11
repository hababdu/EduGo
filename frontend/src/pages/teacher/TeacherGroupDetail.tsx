import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGroup, useGroupMembers } from '../../hooks/useGroups'; // Mavjud hooklardan foydalanamiz

export function TeacherGroupDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const { data: group, isLoading: groupLoading } = useGroup(id);
  const { data: members, isLoading: membersLoading } = useGroupMembers(id);

  const [activeTab, setActiveTab] = useState<'students' | 'lessons'>('students');

  if (groupLoading || !group) {
    return <div className="p-6 animate-pulse h-40 bg-surface rounded-lg m-6" />;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto pb-16">
      {/* Orqaga qaytish */}
      <button
        onClick={() => navigate('/teacher/groups')}
        className="text-sm text-ink-muted mb-6 hover:text-ink transition-colors flex items-center gap-1"
      >
        ← Guruhlarimga qaytish
      </button>

      {/* Guruh sarlavhasi */}
      <div className="mb-8 bg-surface p-6 rounded-2xl border border-white/5">
        <h1 className="font-display text-2xl mb-2">{group.name}</h1>
        {group.description && (
          <p className="text-sm text-ink-muted mb-4">{group.description}</p>
        )}
        <div className="flex items-center gap-4 text-xs text-ink-faint">
          <span>Talabalar soni: {members?.length ?? 0} ta</span>
        </div>
      </div>

      {/* Tablar (Bo'limlar) */}
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

      {/* Talabalar bo'limi */}
      {activeTab === 'students' && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-ink-muted">Guruh talabalari</h2>
          </div>

          {membersLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 bg-surface rounded-lg animate-pulse" />
              ))}
            </div>
          ) : !members || members.length === 0 ? (
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
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2.5 py-1 rounded-full bg-surface-muted text-ink-muted">
                        Faol
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Darslar va materiallar bo'limi */}
      {activeTab === 'lessons' && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-ink-muted">Dars materiallari va reja</h2>
            <button 
              onClick={() => alert("Yangi dars qo'shish oynasi ochiladi")}
              className="text-xs bg-primary text-white px-3 py-1.5 rounded-xl font-medium hover:opacity-90 transition-opacity"
            >
              + Dars qo'shish
            </button>
          </div>

          <div className="p-8 text-center rounded-2xl bg-surface/50 border border-white/5 text-ink-muted text-sm">
            Hozircha bu guruhga dars materiallari qo'shilmagan.
          </div>
        </section>
      )}
    </div>
  );
}