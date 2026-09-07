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
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
  status: 'ACTIVE' | 'BLOCKED' | 'PENDING';
  groupId: string | null;
  groupName?: string | null;
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

export interface TeacherItem {
  id: string;
  firstName: string;
  lastName: string | null;
  username: string | null;
  subjects: { id: string; name: string }[];
  groupsCount: number;
}

export interface GroupItem {
  id: string;
  name: string;
  teacherId: string | null;
  teacherName?: string | null;
  studentsCount: number;
  createdAt: string;
}

export interface SubjectItem {
  id: string;
  name: string;
  code: string;
  teachersCount: number;
  topicsCount: number;
}