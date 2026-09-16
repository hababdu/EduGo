// src/services/api-client.ts
import fetch, { RequestInit } from 'node-fetch';

const BACKEND_API_URL =
  process.env.BACKEND_API_URL ?? 'https://edugobot.onrender.com';
const BOT_INTERNAL_SECRET = process.env.BOT_INTERNAL_SECRET ?? '';

/* ============================================================
   XATO TIPLARI
   ============================================================ */
export class BotApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'BotApiError';
  }
}

export class NotRegisteredError extends Error {
  constructor() {
    super('NOT_REGISTERED');
    this.name = 'NotRegisteredError';
  }
}

/* ============================================================
   INTERNAL GET
   ============================================================ */
async function internalGet<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BACKEND_API_URL}${path}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': BOT_INTERNAL_SECRET,
        ...(options.headers ?? {}),
      },
      timeout: 15_000,
    });

    if (res.status === 404) {
      throw new NotRegisteredError();
    }

    if (!res.ok) {
      const body = await res.text();
      throw new BotApiError(
        res.status,
        `Backend xatosi: ${res.status} ${res.statusText}`,
        body,
      );
    }

    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof NotRegisteredError) throw err;
    if (err instanceof BotApiError) throw err;

    console.error(`[api-client] Fetch error for ${url}:`, err);
    throw new BotApiError(0, "Backend bilan aloqa yo'q");
  }
}

/* ============================================================
   TYPES
   ============================================================ */
export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN' | 'SUPER_ADMIN';

export interface UserRoleInfo {
  id: string;
  role: UserRole;
  status: 'ACTIVE' | 'BLOCKED' | 'PENDING';
  firstName: string;
  lastName?: string;
  username?: string;
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

export interface TeacherOverview {
  groupsCount: number;
  studentsCount: number;
  assignmentsCount: number;
  assignedTestsCount: number;
}

export interface TeacherGroupItem {
  id: string;
  name: string;
  studentsCount: number;
}

export interface AdminOverview {
  students: number;
  activeStudents: number;
  teachers: number;
  courses: number;
  tests: number;
  totalScoreIssued: number;
}

/* ============================================================
   API METHODS
   ============================================================ */
export const api = {
  /* ---------- USER ---------- */
  getUserRole: (telegramId: string) =>
    internalGet<UserRoleInfo>(
      `/api/v1/internal/users/by-telegram/${telegramId}/role`,
    ),

  /* ---------- STUDENT ---------- */
  getStudentSummary: (telegramId: string) =>
    internalGet<StudentSummary>(
      `/api/v1/internal/students/by-telegram/${telegramId}/summary`,
    ),

  getRecentResults: (telegramId: string, limit = 5) =>
    internalGet<TestResult[]>(
      `/api/v1/internal/students/by-telegram/${telegramId}/results?limit=${limit}`,
    ),

  getAchievements: (telegramId: string) =>
    internalGet<Achievement[]>(
      `/api/v1/internal/students/by-telegram/${telegramId}/achievements`,
    ),

  /* ---------- COMMON ---------- */
  getTopRanking: (limit = 10) =>
    internalGet<RankingEntry[]>(
      `/api/v1/internal/ranking/top?limit=${limit}`,
    ),

  getAnnouncements: (limit = 5) =>
    internalGet<AnnouncementItem[]>(
      `/api/v1/internal/announcements?limit=${limit}`,
    ),

  /* ---------- TEACHER ---------- */
  getTeacherOverview: (telegramId: string) =>
    internalGet<TeacherOverview>(
      `/api/v1/internal/teachers/by-telegram/${telegramId}/overview`,
    ),

  getTeacherGroups: (telegramId: string) =>
    internalGet<TeacherGroupItem[]>(
      `/api/v1/internal/teachers/by-telegram/${telegramId}/groups`,
    ),

  /* ---------- ADMIN ---------- */
  getAdminOverview: (telegramId: string) =>
    internalGet<AdminOverview>(
      `/api/v1/internal/admins/by-telegram/${telegramId}/overview`,
    ),
};