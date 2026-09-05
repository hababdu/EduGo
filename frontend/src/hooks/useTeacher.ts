import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api-client';

export interface TeacherOverview {
  groupsCount: number;
  studentsCount: number;
  assignedTestsCount: number;
  groups: { id: string; name: string; studentsCount: number }[];
  recentAssignments: {
    id: string;
    testTitle: string;
    groupName: string;
    assignedAt: string;
    deadline: string | null;
  }[];
}

export interface TeacherGroupStudent {
  id: string;
  firstName: string;
  lastName: string | null;
  totalScore: number;
  level: number;
  testsCompleted: number;
  averagePercent: number | null;
}

export function useTeacherOverview() {
  return useQuery({
    queryKey: ['teacher', 'overview'],
    queryFn: () => apiFetch<TeacherOverview>('/api/v1/teacher/overview'),
  });
}

export function useTeacherGroupStudents(groupId: string) {
  return useQuery({
    queryKey: ['teacher', 'groups', groupId, 'students'],
    queryFn: () => apiFetch<TeacherGroupStudent[]>(`/api/v1/teacher/groups/${groupId}/students`),
    enabled: !!groupId,
  });
}
