import { BackdropImage } from '../ui/BackdropImage';
import { subjectImage } from '../../design/images';

interface Subject {
  id: string;
  title: string;
  progressPercent: number;
  posterUrl?: string | null;
}

interface SubjectScoreListProps {
  subjects: Subject[];
}

/** Har bir fan — rasmli (xira) kartada: nom, foiz va progress-bar. */
export function SubjectScoreList({ subjects }: SubjectScoreListProps) {
  if (subjects.length === 0) return null;

  return (
    <section className="px-5">
      <h2 className="text-sm text-ink-muted mb-3">Fanlar bo'yicha progress</h2>
      <div className="space-y-3">
        {subjects.map((s) => {
          const img = s.posterUrl || subjectImage(s.title);
          const pct = Math.max(0, Math.min(100, Math.round(s.progressPercent)));
          const body = (
            <div className="p-4">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-sm font-semibold text-ink">{s.title}</span>
                <span className="text-xs text-ink-muted tabular-nums">{pct}%</span>
              </div>
              <div
                className="h-1.5 rounded-full bg-base/60 overflow-hidden"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${s.title} progressi`}
              >
                <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
          return img ? (
            <BackdropImage key={s.id} src={img} opacity={0.36} blur={3} className="rounded-3xl border border-white/5">
              {body}
            </BackdropImage>
          ) : (
            <div key={s.id} className="rounded-3xl border border-white/5 bg-surface/20">
              {body}
            </div>
          );
        })}
      </div>
    </section>
  );
}
