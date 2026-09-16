// src/pages/StudentDashboard.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api-client';
import { useAuthStore } from '../store/auth.store';
import { useTelegram } from '../hooks/useTelegram';
import { ScoreHero } from '../components/dashboard/ScoreHero';
import { StatChips } from '../components/dashboard/StatChips';
import { DailyChallengeCard } from '../components/dashboard/DailyChallengeCard';
import { ContinueLearningCard } from '../components/dashboard/ContinueLearningCard';
import { AchievementsRow } from '../components/dashboard/AchievementsRow';
import { SubjectScoreList } from '../components/dashboard/SubjectScoreList';

/* ============================================================
   TYPES
   ============================================================ */
interface DashboardData {
  totalScore: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  rank: number;
  streak: number;
  subjectCount: number;
  continueLearning?: {
    subjectId: string;
    subjectTitle: string;
    progressPercent: number;
  } | null;
  achievements: {
    id: string;
    title: string;
    iconUrl: string | null;
  }[];
  subjects: {
    id: string;
    title: string;
    progressPercent: number;
  }[];
}

/* ============================================================
   HOOKS
   ============================================================ */
function useStudentDashboard() {
  return useQuery({
    queryKey: ['student', 'dashboard'],
    queryFn: () => apiFetch<DashboardData>('/api/v1/students/dashboard'),
    staleTime: 30_000,
  });
}

/* ============================================================
   COMPONENT
   ============================================================ */
export function StudentDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { haptic } = useTelegram();
  const { data, isLoading, error } = useStudentDashboard();

  /* ---------- Loading ---------- */
  if (isLoading) {
    return (
      <div className="pb-24 space-y-6">
        <div className="px-5 pt-6 pb-8 space-y-4">
          <div className="h-4 w-32 bg-surface/50 rounded animate-pulse" />
          <div className="h-20 w-48 mx-auto bg-surface/50 rounded animate-pulse" />
          <div className="h-3 w-40 mx-auto bg-surface/50 rounded animate-pulse" />
        </div>
        <div className="px-5 flex gap-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-10 w-28 bg-surface/50 rounded-full animate-pulse"
            />
          ))}
        </div>
        <div className="px-5">
          <div className="h-32 bg-surface/50 rounded-2xl animate-pulse" />
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
            {(error as any)?.message || "Server bilan bog'lanishda muammo"}
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
      {/* Hero — ball, level */}
      <ScoreHero
        firstName={user?.firstName || 'Talaba'}
        totalScore={data.totalScore}
        level={data.level}
        xpIntoLevel={data.xpIntoLevel}
        xpForNextLevel={data.xpForNextLevel}
      />

      {/* Stat chips — reyting, streak, fanlar */}
      <StatChips
        rank={data.rank}
        streak={data.streak}
        subjectCount={data.subjectCount}
      />

      {/* Kunlik challenge */}
      <DailyChallengeCard />

      {/* Davom etish */}
      {data.continueLearning && (
        <ContinueLearningCard
          subjectTitle={data.continueLearning.subjectTitle}
          progressPercent={data.continueLearning.progressPercent}
          onContinue={() => {
            haptic('light');
            navigate(
              `/lessons/${data.continueLearning!.subjectId}`,
            );
          }}
        />
      )}

      {/* Yutuqlar */}
      <AchievementsRow achievements={data.achievements} />

      {/* Fanlar bo'yicha progress */}
      <SubjectScoreList subjects={data.subjects} />
    </div>
  );
}

export default StudentDashboard;