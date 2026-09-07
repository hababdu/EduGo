import { QuestionType } from './test';

// ==========================================
// 1. MAVJUD STATISTIKA VA TALABALAR TURLARI
// ==========================================

export interface AdminOverview {
  totals: {
    students: number;
    activeStudents: number;
    teachers: number;
    courses: number;
    subjects: number;
    tests: number;
    completedTests: number;
    totalScoreIssued: number;
  };
  today: { testAttempts: number };
  charts: { dailyActiveUsers: { date: string; count: number }[] };
}

export interface AdminStudentListItem {
  id: string;
  firstName: string;
  lastName: string | null;
  username: string | null;
  status: 'ACTIVE' | 'BLOCKED' | 'PENDING';
  registeredAt: string;
  lastActiveAt: string;
  totalScore: number;
  level: number;
}

export interface AdminStudentListResponse {
  items: AdminStudentListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// ==========================================
// 2. SAVOLLAR BANKI VA EXCEL IMPORT TURLARI
// ==========================================

export interface QuestionCategoryDTO {
  id: string;
  name: string;
  description?: string;
  _count?: {
    questions: number;
  };
}

export interface CreateOptionDTO {
  text: string;
  isCorrect: boolean;
  order: number;
}

export interface CreateQuestionDTO {
  categoryId: string;
  text: string;
  type: QuestionType;
  points: number;
  explanation?: string;
  options: CreateOptionDTO[];
}

export interface BulkImportResponseDTO {
  totalParsed: number;
  createdCount: number;
  failedCount: number;
  errors: string[];
}

export interface ReOpenSessionDTO {
  userId: string;
  testId: string;
  reason?: string;
}