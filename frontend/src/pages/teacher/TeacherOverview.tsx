import { useNavigate } from 'react-router-dom';
import { useTeacherOverview } from '../../hooks/useTeacher';

export function TeacherOverview() {
  const { data, isLoading } = useTeacherOverview();
  const navigate = useNavigate();

  if (isLoading || !data) {
    return <div className="p-6 animate-pulse h-40 bg-surface rounded-lg m-6" />;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="font-display text-2xl mb-8">Mening ish maydonim</h1>

      <div className="grid grid-cols-3 gap-4 mb-10">
        <div>
          <p className="font-display text-4xl text-gold tabular-nums">{data.groupsCount}</p>
          <p className="text-xs text-ink-muted mt-1">guruh</p>
        </div>
        <div>
          <p className="font-display text-4xl text-gold tabular-nums">{data.studentsCount}</p>
          <p className="text-xs text-ink-muted mt-1">student</p>
        </div>
        <div>
          <p className="font-display text-4xl text-gold tabular-nums">{data.assignedTestsCount}</p>
          <p className="text-xs text-ink-muted mt-1">biriktirilgan test</p>
        </div>
      </div>

      <section className="mb-10">
        <h2 className="text-sm text-ink-muted mb-3">Mening guruhlarim</h2>
        {data.groups.length === 0 ? (
          <p className="text-sm text-ink-faint">Sizga hali guruh biriktirilmagan.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {data.groups.map((g) => (
              <button
                key={g.id}
                onClick={() => navigate(`/teacher/groups/${g.id}`)}
                className="w-full flex items-center justify-between py-3.5 text-left hover:bg-surface/50 px-2 -mx-2 rounded-lg transition-colors"
              >
                <span className="text-sm font-medium">{g.name}</span>
                <span className="text-xs text-ink-muted">{g.studentsCount} student</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm text-ink-muted mb-3">So'nggi biriktirilgan testlar</h2>
        {data.recentAssignments.length === 0 ? (
          <p className="text-sm text-ink-faint">Hali test biriktirilmagan.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {data.recentAssignments.map((a) => (
              <div key={a.id} className="py-3 text-sm">
                <p>{a.testTitle}</p>
                <p className="text-xs text-ink-muted mt-0.5">{a.groupName}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
