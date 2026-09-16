// src/pages/StudentDashboard.tsx
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api-client';
import { useTelegram } from '../hooks/useTelegram';
import { useNotifications } from '../hooks/useNotifications';
import { ScoreHero } from '../components/dashboard/ScoreHero';
import { StatChips } from '../components/dashboard/StatChips';
import { DailyChallengeCard } from '../components/dashboard/DailyChallengeCard';
import { ContinueLearningCard } from '../components/dashboard/ContinueLearningCard';
import { AchievementsRow } from '../components/dashboard/AchievementsRow';
import { SubjectScoreList } from '../components/dashboard/SubjectScoreList';

/* ============================================================
   BACKEND RESPONSE TIPI (dashboard.service.ts)
   ============================================================ */
interface DashboardResponse {
  student: {
    firstName: string;
    profilePhotoUrl: string | null;
    streak: number;
    rank: number;
  };
  continueLesson: {
    subjectId: string;
    subjectTitle: string;
    progressPercent: number;
  } | null;
  subjects: {
    id: string;
    title: string;
    posterUrl: string | null;
    progressPercent: number;
  }[];
  stats: {
    totalScore: number;
    xp: number;
    level: number;
    xpIntoLevel: number;
    xpForNextLevel: number;
  };
  recentResults: {
    testTitle: string;
    percent: number;
    passed: boolean;
  }[];
  achievements: {
    id: string;
    title: string;
    iconUrl: string | null;
  }[];
}

/* ============================================================
   HOOK — Dashboard
   ============================================================ */
function useStudentDashboard() {
  return useQuery({
    queryKey: ['student', 'dashboard'],
    queryFn: () => apiFetch<DashboardResponse>('/api/v1/dashboard/me'),
    staleTime: 30_000,
  });
}

/* ============================================================
   COMPONENT
   ============================================================ */
export function StudentDashboard() {
  const navigate = useNavigate();
  const { haptic } = useTelegram();

  const { data, isLoading, error } = useStudentDashboard();

  // Notifications — unread count uchun
  const { data: notifications } = useNotifications();
  const unreadCount =
    notifications?.filter((n) => !n.isRead).length ?? 0;

  /* ---------- Loading ---------- */
  if (isLoading) {
    return (
      <div className="pb-24 space-y-6">
        {/* Hero skeleton */}
        <div className="px-5 pt-6 pb-8 space-y-4 text-center">
          <div className="h-4 w-32 bg-surface/50 rounded mx-auto animate-pulse" />
          <div className="h-20 w-48 bg-surface/50 rounded mx-auto animate-pulse" />
          <div className="h-3 w-40 bg-surface/50 rounded mx-auto animate-pulse" />
        </div>

        {/* Chips skeleton */}
        <div className="px-5 flex gap-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-10 w-28 bg-surface/50 rounded-full animate-pulse"
            />
          ))}
        </div>

        {/* Card skeleton */}
        <div className="px-5">
          <div className="h-32 bg-surface/50 rounded-2xl animate-pulse" />
        </div>

        {/* List skeleton */}
        <div className="px-5 space-y-3">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="h-16 bg-surface/30 rounded-2xl animate-pulse border border-white/5"
            />
          ))}
        </div>
      </div>
    );
  }

  /* ---------- Error ---------- */
  if (error || !data) {
    return (
      <div className="pb-24 px-5 pt-6">
        <div className="text-center py-14 bg-surface/20 rounded-3xl border border-white/5 space-y-3">
          <p className="text-sm font-semibold text-ink">
            Ma'lumotlarni yuklashda xatolik
          </p>
          <p className="text-xs text-ink-muted">
            {(error as any)?.response?.data?.message ||
              (error as any)?.message ||
              "Server bilan bog'lanishda muammo"}
          </p>
          <button
            type="button"
            onClick={() => {
              haptic('light');
              window.location.reload();
            }}
            className="mt-2 text-xs font-semibold text-gold bg-gold/10 px-4 py-2.5 rounded-2xl active:scale-[0.98] transition-transform"
          >
            🔄 Qayta yuklash
          </button>
        </div>
      </div>
    );
  }

  /* ---------- Render ---------- */
  return (
    <div className="pb-24 space-y-6">
      {/* ============ HERO — ball, level, unread count ============ */}
      <ScoreHero
        firstName={data.student.firstName}
        totalScore={data.stats.totalScore}
        level={data.stats.level}
        xpIntoLevel={data.stats.xpIntoLevel}
        xpForNextLevel={data.stats.xpForNextLevel}
        unreadCount={unreadCount}
      />

      {/* ============ STAT CHIPS — reyting, streak, fanlar ============ */}
      <StatChips
        rank={data.student.rank}
        streak={data.student.streak}
        subjectCount={data.subjects.length}
        onRankClick={() => {
          haptic('light');
          navigate('/ranking');
        }}
      />

      {/* ============ DAILY CHALLENGE ============ */}
      <DailyChallengeCard />

      {/* ============ CONTINUE LEARNING ============ */}
      {data.continueLesson && (
        <ContinueLearningCard
          subjectTitle={data.continueLesson.subjectTitle}
          progressPercent={data.continueLesson.progressPercent}
          onContinue={() => {
            haptic('light');
            navigate(`/lessons/${data.continueLesson!.subjectId}`);
          }}
        />
      )}

      {/* ============ ACHIEVEMENTS ============ */}
      <AchievementsRow achievements={data.achievements} />

      {/* ============ SUBJECT PROGRESS ============ */}
      <SubjectScoreList
        subjects={data.subjects.map((s) => ({
          id: s.id,
          title: s.title,
          progressPercent: s.progressPercent,
        }))}
      />

      {/* ============ RECENT RESULTS (bonus) ============ */}
      {data.recentResults && data.recentResults.length > 0 && (
        <section className="px-5">
          <h2 className="text-sm text-ink-muted mb-3">
            So'nggi natijalar
          </h2>
          <div className="space-y-2">
            {data.recentResults.slice(0, 3).map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 bg-surface/20 rounded-2xl border border-white/5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink truncate">
                    {r.testTitle}
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold tabular-nums shrink-0 ${
                    r.passed ? 'text-teal' : 'text-red-400'
                  }`}
                >
                  {r.percent}%
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default StudentDashboard;