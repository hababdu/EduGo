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
