interface Achievement {
  id: string;
  title: string;
  iconUrl: string | null;
}

interface AchievementsRowProps {
  achievements: Achievement[];
}

/**
 * Doira nishonlar — gamifikatsiyaga xos "badge" shakli,
 * generic to'rtburchak kartalardan qasddan farqli.
 */
export function AchievementsRow({ achievements }: AchievementsRowProps) {
  return (
    <section className="px-5">
      <h2 className="text-sm text-ink-muted mb-3">So'nggi yutuqlar</h2>

      {achievements.length === 0 ? (
        <p className="text-sm text-ink-faint">
          Hali yutuqlaringiz yo'q. Birinchi testni tugating — birinchi nishon shu yerda paydo bo'ladi.
        </p>
      ) : (
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1">
          {achievements.map((a) => (
            <div key={a.id} className="flex flex-col items-center gap-1.5 shrink-0 w-16">
              <div className="w-14 h-14 rounded-full bg-gold-soft border border-gold/30 flex items-center justify-center text-2xl">
                {a.iconUrl ? (
                  <img src={a.iconUrl} alt="" className="w-8 h-8" />
                ) : (
                  <span aria-hidden="true">🏅</span>
                )}
              </div>
              <span className="text-[11px] text-ink-muted text-center leading-tight">
                {a.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
