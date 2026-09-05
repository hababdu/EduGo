import { useParams, useNavigate } from 'react-router-dom';
import { useTeacherGroupStudents } from '../../hooks/useTeacher';

export function TeacherGroupDetail() {
  const { groupId = '' } = useParams();
  const navigate = useNavigate();
  const { data: students, isLoading } = useTeacherGroupStudents(groupId);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <button onClick={() => navigate(-1)} className="text-sm text-ink-muted mb-6">
        ← Orqaga
      </button>
      <h1 className="font-display text-2xl mb-6">Guruh studentlari</h1>

      {isLoading || !students ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-surface rounded-lg animate-pulse" />
          ))}
        </div>
      ) : students.length === 0 ? (
        <p className="text-sm text-ink-muted">Bu guruhda hali studentlar yo'q.</p>
      ) : (
        <div className="divide-y divide-white/5">
          {students.map((s) => (
            <div key={s.id} className="flex items-center justify-between py-3.5">
              <div>
                <p className="text-sm font-medium">
                  {s.firstName} {s.lastName ?? ''}
                </p>
                <p className="text-xs text-ink-muted">
                  {s.testsCompleted} test tugatilgan
                  {s.averagePercent !== null ? ` · o'rtacha ${s.averagePercent}%` : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold tabular-nums">{s.totalScore}</p>
                <p className="text-xs text-ink-muted">{s.level}-daraja</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
