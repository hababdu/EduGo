import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../hooks/useDashboard';
import { ScoreHero } from '../components/dashboard/ScoreHero';
import { StatChips } from '../components/dashboard/StatChips';
import { ContinueLearningCard } from '../components/dashboard/ContinueLearningCard';
import { SubjectScoreList } from '../components/dashboard/SubjectScoreList';
import { AchievementsRow } from '../components/dashboard/AchievementsRow';
import { DailyChallengeCard } from '../components/dashboard/DailyChallengeCard';

export function StudentDashboard() {
  const { data, isLoading, isError, refetch } = useDashboard();
  const navigate = useNavigate();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="px-5 py-16 text-center">
        <p className="font-display text-xl mb-2">Ma'lumotlarni yuklab bo'lmadi</p>
        <p className="text-sm text-ink-muted mb-6">
          Internet aloqasini tekshirib, qayta urinib ko'ring.
        </p>
        <button
          onClick={() => refetch()}
          className="rounded-full bg-gold text-base font-semibold px-6 py-2.5 text-sm"
        >
          Qayta urinish
        </button>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <ScoreHero
        firstName={data.student.firstName}
        totalScore={data.stats.totalScore}
        level={data.stats.level}
        xpIntoLevel={data.stats.xpIntoLevel}
        xpForNextLevel={data.stats.xpForNextLevel}
      />

      <div className="space-y-7">
        <StatChips
          rank={data.student.rank}
          streak={data.student.streak}
          subjectCount={data.subjects.length}
        />

        <DailyChallengeCard />

        {data.continueLesson ? (
          <ContinueLearningCard
            subjectTitle={data.continueLesson.subjectTitle}
            progressPercent={data.continueLesson.progressPercent}
            onContinue={() => navigate(`/lessons/${data.continueLesson!.subjectId}`)}
          />
        ) : (
          <section className="px-5">
            <div className="rounded-2xl p-5 bg-surface text-center">
              <p className="text-sm text-ink-muted">
                Hali darsni boshlamagansiz. "Darslar" bo'limidan birinchi fanni tanlang.
              </p>
            </div>
          </section>
        )}

        <SubjectScoreList subjects={data.subjects} />
        <AchievementsRow achievements={data.achievements} />
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="px-5 pt-6 animate-pulse space-y-8" aria-busy="true" aria-label="Yuklanmoqda">
      <div className="text-center space-y-3">
        <div className="h-4 w-24 bg-surface rounded mx-auto" />
        <div className="h-16 w-40 bg-surface rounded mx-auto" />
      </div>
      <div className="flex gap-2">
        <div className="h-9 w-24 bg-surface rounded-full" />
        <div className="h-9 w-24 bg-surface rounded-full" />
        <div className="h-9 w-20 bg-surface rounded-full" />
      </div>
      <div className="h-28 bg-surface rounded-2xl" />
    </div>
  );
}
