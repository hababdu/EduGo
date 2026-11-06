// src/services/api-client.ts
import fetch, { RequestInit } from 'node-fetch';
import FormData from 'form-data';

// Production'da BACKEND_API_URL majburiy (backend manzili — botning o'zi emas).
const BACKEND_API_URL = (
  process.env.BACKEND_API_URL ?? 'http://localhost:3000'
).replace(/\/+$/, '');
if (!process.env.BACKEND_API_URL && process.env.NODE_ENV === 'production') {
  console.warn('[bot] BACKEND_API_URL o\'rnatilmagan — localhost ishlatilmoqda!');
}
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
export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN' | 'SUPER_ADMIN' | 'PARENT';

export interface UserRoleInfo {
  id: string;
  /** Amaldagi rol (super admin boshqa rolni kiyib ko'rayotgan bo'lsa — o'sha rol) */
  role: UserRole;
  /** Haqiqiy rol */
  realRole?: UserRole;
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

export interface SwitchOptions {
  activeRole: UserRole;
  organizationId: string | null;
  organizationName: string | null;
  orgs: { id: string; name: string }[];
}

export interface HomeworkTask {
  id: string;
  title: string;
  groupName: string;
  dueAt: string | null;
  maxScore: number;
  state: 'PENDING' | 'RETURNED' | string;
  overdue?: boolean;
}

export interface HomeworkDetail {
  assignment: { id: string; title: string; dueAt: string | null; maxScore: number; gradingStatus: string };
  canSubmit: boolean;
  closedReason: string | null;
  submission: null | {
    status: string;
    score: number | null;
    maxScore: number;
    feedback: string | null;
    returnNote?: string | null;
  };
}

export interface UploadedFile {
  id: string;
  fileName: string;
  kind: string;
}

/** Backend xabarini (Nest `message`) odam o'qiydigan matnga aylantiradi. */
export function apiErrorText(err: unknown, fallback = 'Xatolik yuz berdi'): string {
  if (err instanceof BotApiError) {
    if (typeof err.body === 'string') {
      try {
        const j = JSON.parse(err.body);
        const m = Array.isArray(j?.message) ? j.message[0] : j?.message;
        if (typeof m === 'string' && m) return m;
      } catch {
        /* noop */
      }
    }
    if (err.status === 0) return "Server bilan aloqa yo'q";
  }
  if (err instanceof NotRegisteredError) return 'Topilmadi';
  return fallback;
}

/** Multipart (fayl) yuborish. */
async function internalUpload<T>(path: string, form: FormData): Promise<T> {
  const url = `${BACKEND_API_URL}${path}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      body: form as any,
      headers: { 'x-internal-secret': BOT_INTERNAL_SECRET, ...form.getHeaders() },
      timeout: 60_000,
    });
    if (!res.ok) throw new BotApiError(res.status, `Backend xatosi: ${res.status}`, await res.text());
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof BotApiError) throw err;
    console.error(`[api-client] Upload error for ${url}:`, err);
    throw new BotApiError(0, "Backend bilan aloqa yo'q");
  }
}

/* ============================================================
   API METHODS
   ============================================================ */
export const api = {
  linkParent: (
    code: string,
    user: { id: number; first_name: string; last_name?: string; username?: string },
  ) =>
    internalGet<{ ok: boolean; childName: string }>('/api/v1/internal/parents/link', {
      method: 'POST',
      body: JSON.stringify({ code, user }),
    }),

  confirmAppLogin: (
    id: string,
    user: { id: number; first_name: string; last_name?: string; username?: string },
  ) =>
    internalGet<{ ok: boolean }>('/api/v1/internal/app-login/confirm', {
      method: 'POST',
      body: JSON.stringify({ id, user }),
    }),

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

  /* ---------- SUPER ADMIN: rol almashtirish ---------- */
  getSwitchOptions: (telegramId: string) =>
    internalGet<SwitchOptions>(`/api/v1/internal/users/by-telegram/${telegramId}/switch-options`),

  switchRole: (telegramId: string, role: string, organizationId?: string) =>
    internalGet<UserRoleInfo>(`/api/v1/internal/users/by-telegram/${telegramId}/switch-role`, {
      method: 'POST',
      body: JSON.stringify({ role, organizationId }),
    }),

  /* ---------- O'QUVCHI: vazifa topshirish ---------- */
  listHomework: (telegramId: string) =>
    internalGet<HomeworkTask[]>(`/api/v1/internal/students/by-telegram/${telegramId}/homework`),

  getHomework: (telegramId: string, assignmentId: string) =>
    internalGet<HomeworkDetail>(
      `/api/v1/internal/students/by-telegram/${telegramId}/homework/${encodeURIComponent(assignmentId)}`,
    ),

  uploadHomeworkFile: (telegramId: string, file: { buffer: Buffer; fileName: string; mimeType: string }) => {
    const form = new FormData();
    form.append('file', file.buffer, { filename: file.fileName, contentType: file.mimeType });
    return internalUpload<UploadedFile>(`/api/v1/internal/students/by-telegram/${telegramId}/homework-files`, form);
  },

  deleteHomeworkFile: (telegramId: string, fileId: string) =>
    internalGet<{ ok: boolean }>(
      `/api/v1/internal/students/by-telegram/${telegramId}/homework-files/${encodeURIComponent(fileId)}/delete`,
      { method: 'POST', body: '{}' },
    ),

  submitHomework: (telegramId: string, assignmentId: string, body: { textAnswer?: string; fileIds: string[] }) =>
    internalGet<HomeworkDetail>(
      `/api/v1/internal/students/by-telegram/${telegramId}/homework/${encodeURIComponent(assignmentId)}/submit`,
      { method: 'POST', body: JSON.stringify(body) },
    ),
};
