interface Subject {
  id: string;
  title: string;
  progressPercent: number;
}

interface SubjectScoreListProps {
  subjects: Subject[];
}

/**
 * Chegarasiz (borderless) ro'yxat — SaaS-kartalar to'plami emas,
 * har bir satr faqat nom + progress-bar + foiz.
 */
export function SubjectScoreList({ subjects }: SubjectScoreListProps) {
  if (subjects.length === 0) return null;

  return (
    <section className="px-5">
      <h2 className="text-sm text-ink-muted mb-3">Fanlar bo'yicha progress</h2>
      <div className="space-y-4">
        {subjects.map((s) => (
          <div key={s.id}>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-sm">{s.title}</span>
              <span className="text-xs text-ink-muted tabular-nums">{s.progressPercent}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-surface overflow-hidden">
              <div
                className="h-full rounded-full bg-gold"
                style={{ width: `${s.progressPercent}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
