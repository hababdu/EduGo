import fetch from 'node-fetch';

const BACKEND_API_URL = process.env.BACKEND_API_URL ?? 'http://localhost:3000';
const BOT_INTERNAL_SECRET = process.env.BOT_INTERNAL_SECRET ?? '';

/**
 * Backendning /api/v1/internal/* endpointlariga sirli kalit bilan murojaat.
 * Bu bot ↔ backend orasidagi YAGONA aloqa kanali.
 */
async function internalGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BACKEND_API_URL}${path}`, {
    headers: { 'x-internal-secret': BOT_INTERNAL_SECRET },
  });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('NOT_REGISTERED');
    }
    throw new Error(`Backend xatosi: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export interface StudentSummary {
  firstName: string;
  totalScore: number;
  totalXp: number;
  level: number;
  rank: number;
  streak: number;
}

export interface TestResult {
  id: string;
  score: number;
  maxScore: number;
  percent: number;
  passed: boolean;
  completedAt: string;
  test: { title: string };
}

export interface Achievement {
  id: string;
  earnedAt: string;
  achievement: { title: string; description?: string };
}

export interface RankingEntry {
  totalScore: number;
  user: { firstName: string; username?: string };
}

export interface AnnouncementItem {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

export const api = {
  getStudentSummary: (telegramId: string) =>
    internalGet<StudentSummary>(`/api/v1/internal/students/by-telegram/${telegramId}/summary`),

  getRecentResults: (telegramId: string) =>
    internalGet<TestResult[]>(`/api/v1/internal/students/by-telegram/${telegramId}/results?limit=5`),

  getAchievements: (telegramId: string) =>
    internalGet<Achievement[]>(`/api/v1/internal/students/by-telegram/${telegramId}/achievements`),

  getTopRanking: () =>
    internalGet<RankingEntry[]>(`/api/v1/internal/ranking/top?limit=10`),

  getAnnouncements: () =>
    internalGet<AnnouncementItem[]>(`/api/v1/internal/announcements?limit=5`),
};
