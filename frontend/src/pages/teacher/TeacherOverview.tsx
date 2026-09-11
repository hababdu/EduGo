import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeacherOverview } from '../../hooks/useTeacher';

export function TeacherOverview() {
  const { data, isLoading } = useTeacherOverview();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  if (isLoading || !data) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="h-10 w-64 bg-surface animate-pulse rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-surface rounded-2xl animate-pulse border border-white/5" />
          ))}
        </div>
      </div>
    );
  }

  const filteredGroups = data.groups.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8 pb-20">
      {/* Yuqori qism va Tezkor tugmalar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-ink">Mening ish maydonim</h1>
          <p className="text-xs text-ink-muted mt-1">O'qituvchi boshqaruv paneli, guruhlar va testlar statistikasi</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAssignModalOpen(true)}
            className="px-4 py-2 bg-primary text-white text-xs font-medium rounded-xl hover:opacity-90 transition-opacity shadow-sm flex items-center gap-2"
          >
            <span>➕</span> Test biriktirish
          </button>
        </div>
      </div>

      {/* Statistika kartalari */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface p-5 rounded-2xl border border-white/5 shadow-sm space-y-1 relative overflow-hidden">
          <div className="text-xs text-ink-muted font-medium">Faol guruhlar</div>
          <div className="font-display text-3xl text-gold tabular-nums">{data.groupsCount}</div>
          <div className="absolute right-4 bottom-4 text-white/5 font-display text-5xl pointer-events-none">📁</div>
        </div>

        <div className="bg-surface p-5 rounded-2xl border border-white/5 shadow-sm space-y-1 relative overflow-hidden">
          <div className="text-xs text-ink-muted font-medium">Jami talabalar</div>
          <div className="font-display text-3xl text-gold tabular-nums">{data.studentsCount}</div>
          <div className="absolute right-4 bottom-4 text-white/5 font-display text-5xl pointer-events-none">👥</div>
        </div>

        <div className="bg-surface p-5 rounded-2xl border border-white/5 shadow-sm space-y-1 relative overflow-hidden">
          <div className="text-xs text-ink-muted font-medium">Biriktirilgan testlar</div>
          <div className="font-display text-3xl text-gold tabular-nums">{data.assignedTestsCount}</div>
          <div className="absolute right-4 bottom-4 text-white/5 font-display text-5xl pointer-events-none">📝</div>
        </div>
      </div>

      {/* Mening guruhlarim bo'limi (Qidiruv bilan) */}
      <section className="bg-surface p-6 rounded-2xl border border-white/5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium text-ink">Mening guruhlarim</h2>
            <p className="text-xs text-ink-muted">Guruhlarni boshqarish va o'quvchilar ro'yxati</p>
          </div>
          <input
            type="text"
            placeholder="Guruhni qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 text-xs bg-surface-muted border border-white/5 rounded-xl text-ink focus:outline-none focus:border-primary/50 transition-colors w-full sm:w-64"
          />
        </div>

        {filteredGroups.length === 0 ? (
          <div className="text-center py-10 bg-surface-muted/50 rounded-xl border border-white/5">
            <p className="text-xs text-ink-muted">Guruh topilmadi yoki sizga hali guruh biriktirilmagan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredGroups.map((g) => (
              <div
                key={g.id}
                onClick={() => navigate(`/teacher/groups/${g.id}`)}
                className="p-4 bg-surface-muted/30 hover:bg-surface-muted/70 border border-white/5 rounded-xl transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="space-y-1">
                  <span className="text-sm font-medium text-ink group-hover:text-primary transition-colors">
                    {g.name}
                  </span>
                  <p className="text-xs text-ink-muted">{g.studentsCount} nafar student</p>
                </div>
                <span className="text-xs px-2.5 py-1 bg-surface rounded-lg border border-white/5 text-ink-muted group-hover:border-primary/30 transition-colors">
                  Ochish →
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* So'nggi biriktirilgan testlar */}
      <section className="bg-surface p-6 rounded-2xl border border-white/5 shadow-sm space-y-4">
        <div>
          <h2 className="text-sm font-medium text-ink">So'nggi biriktirilgan testlar</h2>
          <p className="text-xs text-ink-muted">Guruhlarga berilgan oxirgi vazifalar</p>
        </div>

        {data.recentAssignments.length === 0 ? (
          <div className="text-center py-8 bg-surface-muted/50 rounded-xl border border-white/5">
            <p className="text-xs text-ink-muted">Hali test biriktirilmagan.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {data.recentAssignments.map((a) => (
              <div key={a.id} className="py-3.5 flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-ink">{a.testTitle}</p>
                  <p className="text-xs text-ink-muted">Guruh: <span className="text-ink">{a.groupName}</span></p>
                </div>
                <span className="text-xs text-gold bg-gold/10 px-2.5 py-1 rounded-lg">Faol</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Test biriktirish modali (Oddiy holat uchun shablon) */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-surface border border-white/10 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-medium text-ink">Guruhga test biriktirish</h3>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="text-ink-muted hover:text-ink text-sm"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-ink-muted">
              Bu yerdan istalgan testingizni o'zingizga biriktirilgan guruhlarga yuborishingiz mumkin.
            </p>
            {/* Modal form elementlari shu yerga yoziladi */}
            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="px-4 py-2 text-xs bg-surface-muted rounded-xl text-ink-muted hover:text-ink"
              >
                Bekor qilish
              </button>
              <button
                onClick={() => {
                  // Test biriktirish logikasi
                  setIsAssignModalOpen(false);
                }}
                className="px-4 py-2 text-xs bg-primary text-white rounded-xl hover:opacity-90"
              >
                Biriktirish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}