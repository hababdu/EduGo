import { useTestAnalytics, useQuestionAnalytics } from '../../../hooks/useTests';

export function TestAnalyticsPanel({ testId }: { testId: string }) {
  const { data: stats, isLoading } = useTestAnalytics(testId);
  const { data: questionStats } = useQuestionAnalytics(testId);

  if (isLoading || !stats) {
    return <div className="h-32 bg-surface rounded-lg animate-pulse" />;
  }

  if (stats.participants === 0) {
    return (
      <p className="text-sm text-ink-muted py-4 text-center">
        Hali hech kim bu testni topshirmagan.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Ishtirokchilar" value={stats.participants} />
        <Stat label="O'rtacha ball" value={stats.averageScore} />
        <Stat label="O'tish foizi" value={`${stats.passRate}%`} />
        <Stat label="Eng yuqori" value={stats.highestScore} />
        <Stat label="Eng past" value={stats.lowestScore} />
        <Stat label="O'rtacha vaqt" value={`${Math.round(stats.averageTimeSeconds / 60)} daq`} />
      </div>

      {questionStats && questionStats.length > 0 && (
        <div>
          <p className="text-sm text-ink-muted mb-3">Savollar bo'yicha (eng qiyini tepada)</p>
          <div className="space-y-2.5">
            {questionStats.map((q) => (
              <div key={q.questionId}>
                <div className="flex items-baseline justify-between mb-1">
                  <p className="text-xs line-clamp-1 flex-1">{q.questionText}</p>
                  <span className="text-xs text-ink-muted tabular-nums shrink-0 ml-2">
                    {q.accuracyPercent ?? '—'}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-surface overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      (q.accuracyPercent ?? 0) < 50 ? 'bg-coral' : 'bg-teal'
                    }`}
                    style={{ width: `${q.accuracyPercent ?? 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-ink-muted mt-0.5">{label}</p>
    </div>
  );
}
