// src/pages/StudentDashboard.tsx
import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api-client';
import { useTelegram } from '../hooks/useTelegram';
import { useNotifications } from '../hooks/useNotifications';
import { ScoreHero } from '../components/dashboard/ScoreHero';
import { BackdropImage } from '../components/ui/BackdropImage';
import { IMAGES } from '../design/images';
import { StatChips } from '../components/dashboard/StatChips';
import { StudentToday } from '../components/dashboard/StudentToday';
import { DailyChallengeCard } from '../components/dashboard/DailyChallengeCard';
import { ContinueLearningCard } from '../components/dashboard/ContinueLearningCard';
import { AchievementsRow } from '../components/dashboard/AchievementsRow';
import { ResultsChart } from '../components/dashboard/ResultsChart';
import { SubjectScoreList } from '../components/dashboard/SubjectScoreList';
import { useMascot } from '../components/ai/AIMascot';
import { generateMascotLine } from '../lib/ai-service';

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
  const { openChat, speak } = useMascot();
  const hasCheckedIn = useRef(false);

  const { data, isLoading, error } = useStudentDashboard();

  // Notifications — unread count uchun
  const { data: notifications } = useNotifications();
  const unreadCount =
    notifications?.filter((n) => !n.isRead).length ?? 0;

  // So'nggi natijalardan zaif mavzularni chiqarib olamiz.
  const weakTopics = useMemo(() => {
    if (!data?.recentResults) return [];
    return data.recentResults
      .filter((r) => !r.passed || r.percent < 60)
      .map((r) => r.testTitle);
  }, [data?.recentResults]);

  // Maskot real ma'lumot kelgach, holatga mos gap aytadi.
  useEffect(() => {
    if (!data || hasCheckedIn.current) return;
    hasCheckedIn.current = true;

    generateMascotLine({
      event: 'DASHBOARD_CHECKIN',
      studentName: data.student.firstName,
      streak: data.student.streak,
      recentFailCount: weakTopics.length,
    })
      .then((line) => speak(line.text, line.mood))
      .catch(() => {
        /* Ixtiyoriy AI jonlanishi asosiy funksionallikka ta'sir qilmaydi. */
      });
  }, [data, weakTopics.length, speak]);

  if (isLoading) {
    return (
      <div className="student-dashboard pb-24 space-y-6">
        <div className="px-5 pt-6 pb-8 space-y-4 text-center">
          <div className="h-4 w-32 bg-surface/50 rounded mx-auto animate-pulse" />
          <div className="h-20 w-48 bg-surface/50 rounded mx-auto animate-pulse" />
          <div className="h-3 w-40 bg-surface/50 rounded mx-auto animate-pulse" />
        </div>
        <div className="px-5 flex gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 w-28 bg-surface/50 rounded-full animate-pulse" />
          ))}
        </div>
        <div className="px-5">
          <div className="h-32 bg-surface/50 rounded-2xl animate-pulse" />
        </div>
        <div className="px-5 space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-16 bg-surface/30 rounded-2xl animate-pulse border border-tint/5" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="student-dashboard pb-24 px-5 pt-6">
        <div className="text-center py-14 bg-surface/20 rounded-3xl border border-tint/5 space-y-3">
          <p className="text-sm font-semibold text-ink">Ma'lumotlarni yuklashda xatolik</p>
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
            className="mt-2 text-xs font-semibold text-accent bg-accent/10 px-4 py-2.5 rounded-2xl active:scale-[0.98] transition-transform"
          >
            🔄 Qayta yuklash
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="student-dashboard pb-24 space-y-6">
      <BackdropImage src={IMAGES.hero} opacity={0.45} blur={5}>
        <ScoreHero
          firstName={data.student.firstName}
          totalScore={data.stats.totalScore}
          level={data.stats.level}
          xpIntoLevel={data.stats.xpIntoLevel}
          xpForNextLevel={data.stats.xpForNextLevel}
          unreadCount={unreadCount}
        />
      </BackdropImage>

      <div className="px-5">
        <button
          type="button"
          onClick={() => {
            haptic('light');
            openChat({ studentName: data.student.firstName, weakTopics });
          }}
          className="student-ai-card w-full flex items-center gap-3 rounded-3xl px-5 py-4 text-left active:scale-[0.98] transition-transform"
        >
          <span className="text-2xl shrink-0" aria-hidden="true">✦</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">EduGo AI yordamchi</p>
            <p className="text-xs text-ink-muted truncate">
              {weakTopics.length > 0
                ? `Savol bering yoki "${weakTopics[0]}" mavzusini birga ko'rib chiqamiz`
                : "Har qanday savolingizga yordam beraman"}
            </p>
          </div>
          <span className="student-ai-arrow text-sm shrink-0">→</span>
        </button>
      </div>

      <StatChips
        rank={data.student.rank}
        streak={data.student.streak}
        subjectCount={data.subjects.length}
        onRankClick={() => {
          haptic('light');
          navigate('/ranking');
        }}
      />

      <StudentToday />
      <DailyChallengeCard />

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

      <AchievementsRow achievements={data.achievements} />
      <SubjectScoreList
        subjects={data.subjects.map((s) => ({
          id: s.id,
          title: s.title,
          progressPercent: s.progressPercent,
          posterUrl: s.posterUrl,
        }))}
      />
      <ResultsChart results={data.recentResults ?? []} />
    </div>
  );
}

export default StudentDashboard;
