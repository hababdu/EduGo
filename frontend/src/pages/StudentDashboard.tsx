import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight, Bell, BookOpen, CalendarDays, CheckCircle2, ChevronRight,
  Clock3, Flame, GraduationCap, Play, Sparkles, Target, Trophy,
} from 'lucide-react';
import { apiFetch } from '../lib/api-client';
import { useTelegram } from '../hooks/useTelegram';
import { useNotifications } from '../hooks/useNotifications';
import { StudentToday } from '../components/dashboard/StudentToday';
import { DailyChallengeCard } from '../components/dashboard/DailyChallengeCard';
import { AchievementsRow } from '../components/dashboard/AchievementsRow';
import { ResultsChart } from '../components/dashboard/ResultsChart';
import { SubjectScoreList } from '../components/dashboard/SubjectScoreList';
import { useMascot } from '../components/ai/AIMascot';
import { generateMascotLine } from '../lib/ai-service';

interface DashboardResponse {
  student: { firstName: string; profilePhotoUrl: string | null; streak: number; rank: number };
  continueLesson: { subjectId: string; subjectTitle: string; progressPercent: number } | null;
  subjects: { id: string; title: string; posterUrl: string | null; progressPercent: number }[];
  stats: { totalScore: number; xp: number; level: number; xpIntoLevel: number; xpForNextLevel: number };
  recentResults: { testTitle: string; percent: number; passed: boolean }[];
  achievements: { id: string; title: string; iconUrl: string | null }[];
}

function useStudentDashboard() {
  return useQuery({
    queryKey: ['student', 'dashboard'],
    queryFn: () => apiFetch<DashboardResponse>('/api/v1/dashboard/me'),
    staleTime: 30_000,
  });
}

export function StudentDashboard() {
  const navigate = useNavigate();
  const { haptic } = useTelegram();
  const { openChat, speak } = useMascot();
  const hasCheckedIn = useRef(false);
  const { data, isLoading, error, refetch } = useStudentDashboard();
  const { data: notifications } = useNotifications();
  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  const weakTopics = useMemo(() => {
    if (!data?.recentResults) return [];
    return data.recentResults.filter((r) => !r.passed || r.percent < 60).map((r) => r.testTitle);
  }, [data?.recentResults]);

  useEffect(() => {
    if (!data || hasCheckedIn.current) return;
    hasCheckedIn.current = true;
    generateMascotLine({
      event: 'DASHBOARD_CHECKIN',
      studentName: data.student.firstName,
      streak: data.student.streak,
      recentFailCount: weakTopics.length,
    }).then((line) => speak(line.text, line.mood)).catch(() => undefined);
  }, [data, weakTopics.length, speak]);

  if (isLoading) {
    return (
      <main className="student-dashboard student-home student-home-loading">
        <div className="student-home-topline"><div className="student-skeleton student-skeleton-avatar" /><div className="student-skeleton student-skeleton-line" /></div>
        <div className="student-skeleton student-skeleton-hero" />
        <div className="student-skeleton student-skeleton-grid" />
        <div className="student-skeleton student-skeleton-card" />
        <div className="student-skeleton student-skeleton-card" />
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="student-dashboard student-home student-home-error">
        <div className="student-error-icon"><GraduationCap size={30} /></div>
        <h2>Bosh sahifani yuklab bo‘lmadi</h2>
        <p>{(error as Error)?.message || 'Server bilan bog‘lanishda muammo yuz berdi.'}</p>
        <button type="button" className="student-primary-button" onClick={() => { haptic('light'); void refetch(); }}>Qayta urinish <ArrowRight size={17} /></button>
      </main>
    );
  }

  const progress = Math.min(100, Math.round((data.stats.xpIntoLevel / Math.max(data.stats.xpForNextLevel, 1)) * 100));
  const average = data.recentResults.length
    ? Math.round(data.recentResults.reduce((sum, item) => sum + Math.max(0, Math.min(100, item.percent)), 0) / data.recentResults.length)
    : null;

  return (
    <main className="student-dashboard student-home">
      <header className="student-home-topline">
        <div className="student-brand-lockup">
          <div className="student-brand-mark"><GraduationCap size={21} strokeWidth={2.4} /></div>
          <div><span className="student-brand-name">EduGo</span><span className="student-brand-caption">O‘quv markazingiz</span></div>
        </div>
        <button type="button" className="student-notification-button" aria-label="Bildirishnomalar" onClick={() => { haptic('light'); navigate('/notifications'); }}>
          <Bell size={19} />
          {unreadCount > 0 && <span className="student-notification-dot">{unreadCount > 9 ? '9+' : unreadCount}</span>}
        </button>
      </header>

      <section className="student-welcome">
        <div>
          <p className="student-eyebrow">SHAXSIY KABINET</p>
          <h1>Salom, {data.student.firstName || 'O‘quvchi'} <span aria-hidden="true">✦</span></h1>
          <p>Bugun yangi bilimlar sari yana bir qadam.</p>
        </div>
        <div className="student-avatar">
          {data.student.profilePhotoUrl
            ? <img src={data.student.profilePhotoUrl} alt="" />
            : <span>{(data.student.firstName || 'E').slice(0, 1).toUpperCase()}</span>}
        </div>
      </section>

      <section className="student-level-panel">
        <div className="student-level-orb" aria-hidden="true"><Sparkles size={24} /></div>
        <div className="student-level-content">
          <div className="student-level-heading"><span>MENING NATIJAM</span><span className="student-level-pill">LEVEL {data.stats.level}</span></div>
          <div className="student-score-line"><strong>{data.stats.totalScore.toLocaleString('uz-UZ')}</strong><span>ball</span></div>
          <div className="student-xp-meta"><span>{data.stats.xpIntoLevel} / {data.stats.xpForNextLevel} XP</span><span>{progress}%</span></div>
          <div className="student-xp-track"><span style={{ width: `${progress}%` }} /></div>
          <p className="student-level-footnote">Keyingi darajaga yetish uchun davom eting!</p>
        </div>
      </section>

      <section className="student-metric-grid" aria-label="O‘quv statistikasi">
        <button type="button" className="student-metric-card" onClick={() => { haptic('light'); navigate('/ranking'); }}>
          <span className="student-metric-icon student-metric-violet"><Trophy size={18} /></span>
          <strong>#{data.student.rank}</strong><span>Reytingdagi o‘rin</span>
        </button>
        <div className="student-metric-card">
          <span className="student-metric-icon student-metric-orange"><Flame size={18} /></span>
          <strong>{data.student.streak} kun</strong><span>Ketma-ket o‘qish</span>
        </div>
        <button type="button" className="student-metric-card" onClick={() => { haptic('light'); navigate('/lessons'); }}>
          <span className="student-metric-icon student-metric-blue"><BookOpen size={18} /></span>
          <strong>{data.subjects.length}</strong><span>Faol fanlar</span>
        </button>
      </section>

      <section className="student-section student-next-section">
        <div className="student-section-heading"><div><p className="student-eyebrow">O‘QISHNI DAVOM ETTIRING</p><h2>Keyingi darsingiz</h2></div><span className="student-section-index">01</span></div>
        {data.continueLesson ? (
          <button type="button" className="student-continue-card" onClick={() => { haptic('light'); navigate(`/lessons/${data.continueLesson!.subjectId}`); }}>
            <div className="student-continue-art"><BookOpen size={42} /><span className="student-art-orbit" /></div>
            <div className="student-continue-copy"><span className="student-card-kicker">DAVOM ETAYOTGAN KURS</span><h3>{data.continueLesson.subjectTitle}</h3><p>{data.continueLesson.progressPercent}% yakunlangan</p><div className="student-course-track"><span style={{ width: `${Math.max(0, Math.min(100, data.continueLesson.progressPercent))}%` }} /></div><span className="student-continue-action">Darsga qaytish <Play size={14} fill="currentColor" /></span></div>
            <ChevronRight className="student-continue-chevron" size={20} />
          </button>
        ) : (
          <button type="button" className="student-empty-course" onClick={() => navigate('/lessons')}><BookOpen size={22} /><span><strong>O‘rganishni boshlang</strong><small>Fanlar va darslarni ko‘rish</small></span><ArrowRight size={18} /></button>
        )}
      </section>

      <button type="button" className="student-ai-banner" onClick={() => { haptic('light'); openChat({ studentName: data.student.firstName, weakTopics }); }}>
        <div className="student-ai-symbol"><Sparkles size={23} /></div>
        <div><span className="student-card-kicker">EDUGO AI USTOZ</span><strong>Birga o‘rganamizmi?</strong><p>{weakTopics.length ? `“${weakTopics[0]}” mavzusini takrorlashga yordam beraman.` : 'Savollaringizga javob va bilimlaringizga yangi yo‘l.'}</p></div>
        <ArrowRight size={19} />
      </button>

      <section className="student-section">
        <div className="student-section-heading"><div><p className="student-eyebrow">REJANGIZ VA TOPSHIRIQLAR</p><h2>Bugungi kun</h2></div><CalendarDays size={21} /></div>
        <div className="student-today-shell"><StudentToday /></div>
      </section>

      <section className="student-section">
        <div className="student-section-heading"><div><p className="student-eyebrow">SIZNING RIVOJLANISHINGIZ</p><h2>Fanlarim</h2></div><button type="button" className="student-text-link" onClick={() => navigate('/lessons')}>Barchasi <ArrowRight size={15} /></button></div>
        <SubjectScoreList subjects={data.subjects.map((s) => ({ id: s.id, title: s.title, progressPercent: s.progressPercent, posterUrl: s.posterUrl }))} />
        {data.subjects.length === 0 && <button type="button" className="student-empty-course" onClick={() => navigate('/lessons')}><BookOpen size={22} /><span><strong>Hozircha fanlar yo‘q</strong><small>Mavjud kurslarni ko‘rib chiqing</small></span><ArrowRight size={18} /></button>}
      </section>

      <section className="student-section student-results-section">
        <div className="student-section-heading"><div><p className="student-eyebrow">BILIMLAR NAZORATI</p><h2>Test natijalari</h2></div><Target size={21} /></div>
        {average !== null && <div className="student-average-chip"><CheckCircle2 size={16} /><strong>{average}%</strong><span>o‘rtacha natija</span></div>}
        <ResultsChart results={data.recentResults ?? []} />
        {data.recentResults.length === 0 && <p className="student-muted-note">Birinchi testni ishlaganingizdan so‘ng natijalar shu yerda ko‘rinadi.</p>}
      </section>

      <section className="student-section">
        <div className="student-section-heading"><div><p className="student-eyebrow">MOTIVATSIYA</p><h2>Yutuqlarim</h2></div><Trophy size={21} /></div>
        <AchievementsRow achievements={data.achievements} />
      </section>

      <section className="student-section student-challenge-section">
        <div className="student-section-heading"><div><p className="student-eyebrow">KUNLIK FAOLLIK</p><h2>O‘zingizni sinang</h2></div><Clock3 size={21} /></div>
        <DailyChallengeCard />
      </section>
      <footer className="student-home-footer">Har kuni ozgina — katta natijalar sari. <span>✦ EduGo</span></footer>
    </main>
  );
}

export default StudentDashboard;
