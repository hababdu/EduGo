import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeacherOverview } from '../../hooks/useTeacher';

export function TeacherOverview() {
  const { data, isLoading } = useTeacherOverview();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

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
      <div>
        <h1 className="font-display text-2xl text-ink">Mening ish maydonim</h1>
        <p className="text-xs text-ink-muted mt-1">O'qituvchi boshqaruv paneli va guruhlar ro'yxati</p>
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

      {/* Mening guruhlarim ro'yxati (Bosganda o'sha guruh sahifasiga o'tadi) */}
      <section className="bg-surface p-6 rounded-2xl border border-white/5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium text-ink">Mening guruhlarim</h2>
            <p className="text-xs text-ink-muted">Guruhni tanlab tafsilotlariga o'ting</p>
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
    </div>
  );
}